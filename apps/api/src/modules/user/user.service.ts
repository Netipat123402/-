import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { UsersService } from '../identity/users.service';
import { AuditService } from '../../common/trail/audit.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/** ลำดับชั้นบทบาท (สูง = สิทธิ์มากกว่า) — กัน privilege escalation */
const ROLE_RANK: Record<string, number> = {
  super_admin: 100, company_admin: 80, branch_manager: 60, team_lead: 40,
  sales_agent: 20, back_office: 20, auditor: 20,
};
function maxRank(roles: string[]): number {
  return roles.reduce((m, r) => Math.max(m, ROLE_RANK[r] ?? 0), 0);
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'user', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ user:${action}`);
    return scope;
  }

  /**
   * กัน privilege escalation — ผู้กระทำกำหนดได้เฉพาะบทบาทที่ "ต่ำกว่า" บทบาทสูงสุดของตน
   * (super_admin เท่านั้นที่กำหนดบทบาทระดับเดียวกัน/super_admin ได้)
   */
  private assertAssignable(actor: AuthenticatedUser, roleNames: string[]) {
    const isSuper = actor.roles.includes('super_admin');
    if (isSuper) return;
    const ceiling = maxRank(actor.roles);
    for (const name of roleNames) {
      if ((ROLE_RANK[name] ?? 0) >= ceiling) {
        throw new ForbiddenException(`ไม่มีสิทธิ์กำหนดบทบาท "${name}" (สูงกว่าหรือเท่ากับบทบาทของคุณ)`);
      }
    }
  }

  private shape(u: { id: string; email: string; fullName: string; phone: string | null; status: string; lastLoginAt: Date | null; userRoles: { role: { name: string } }[] }) {
    return {
      id: u.id, email: u.email, fullName: u.fullName, phone: u.phone,
      status: u.status, lastLoginAt: u.lastLoginAt,
      roles: u.userRoles.map((r) => r.role.name),
    };
  }

  async list(user: AuthenticatedUser, q?: string) {
    this.require(user, 'read');
    const where = {
      deletedAt: null,
      ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };
    const users = await this.prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { userRoles: { include: { role: true } } },
    });
    return { items: users.map((u) => this.shape(u)), total: users.length };
  }

  /**
   * รายชื่อเจ้าหน้าที่ที่ "มอบหมายงานให้ได้" — สำหรับ dropdown ตอนสร้างนัด/สัญญา
   * ทุกผู้ใช้ที่ล็อกอินเรียกได้ (คืนแค่ id + ชื่อ ของคนในสาขาเดียวกัน — ข้อมูลน้อย ไม่อ่อนไหว)
   * กันปัญหา: เดิม dropdown นี้ gate ด้วย user:read ซึ่ง sales_agent ไม่มี → เลือกเจ้าหน้าที่ไม่ได้
   */
  async listAssignable(user: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'active',
        // สาขาเดียวกับผู้เรียก (ถ้าผู้เรียกไม่มีสาขา = เห็นทุกคน active)
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
    });
    return { items: users };
  }

  async listRoles(user: AuthenticatedUser) {
    this.require(user, 'read');
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: null }, orderBy: { name: 'asc' },
      select: { name: true, description: true },
    });
    return { items: roles };
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto, meta: RequestMeta) {
    this.require(actor, 'create');
    const exists = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (exists) throw new ConflictException('อีเมลนี้ถูกใช้แล้ว');

    const roles = await this.prisma.role.findMany({ where: { name: { in: dto.roleNames } } });
    if (roles.length !== dto.roleNames.length) throw new BadRequestException('บทบาทไม่ถูกต้อง');
    this.assertAssignable(actor, dto.roleNames);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email, fullName: dto.fullName, phone: dto.phone,
        passwordHash: await this.passwords.hash(dto.password),
        status: 'active', branchId: actor.branchId, createdBy: actor.id, updatedBy: actor.id,
        userRoles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      include: { userRoles: { include: { role: true } } },
    });
    await this.audit.record(actor, { action: 'create', entityId: user.id, newValue: { email: user.email, roles: dto.roleNames }, ...meta });
    return this.shape(user);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto, meta: RequestMeta) {
    const scope = this.require(actor, 'update');
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new NotFoundException('ไม่พบผู้ใช้');

    // scope: ผู้ที่ไม่มีสิทธิ์ระดับ all แก้ได้เฉพาะผู้ใช้ในสาขาตัวเอง
    if (scope !== 'all' && target.branchId !== actor.branchId) {
      throw new ForbiddenException('แก้ไขได้เฉพาะผู้ใช้ในสาขาของคุณ');
    }
    // ห้ามแก้บทบาทของตัวเอง (กัน self-escalation / ตัดสิทธิ์ตัวเองพลาด)
    if (dto.roleNames && id === actor.id) {
      throw new ForbiddenException('ไม่สามารถแก้ไขบทบาทของตัวเองได้');
    }
    if (dto.roleNames) this.assertAssignable(actor, dto.roleNames);

    // แอดมินรีเซ็ตรหัสผ่าน (โมเดล admin-only) — เข้ารหัสใหม่เมื่อส่ง password มาเท่านั้น
    const passwordHash = dto.password ? await this.passwords.hash(dto.password) : undefined;

    // ความปลอดภัย: รีเซ็ตรหัส หรือ ระงับ/ปิดบัญชี → เพิกถอนทุก session
    const mustRevoke = !!dto.password || (dto.status && dto.status !== 'active');

    await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName, phone: dto.phone, status: dto.status,
        ...(passwordHash ? { passwordHash } : {}),
        ...(mustRevoke ? { tokenVersion: { increment: 1 } } : {}), // MR-22: เพิกถอน access token เก่าทุกใบ
        updatedBy: actor.id,
      },
    });

    if (dto.roleNames) {
      const roles = await this.prisma.role.findMany({ where: { name: { in: dto.roleNames } } });
      await this.prisma.$transaction([
        this.prisma.userRole.deleteMany({ where: { userId: id } }),
        this.prisma.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) }),
      ]);
    }

    // เพิกถอน refresh token ทั้งหมด (คู่กับ tokenVersion ที่ตัด access token)
    if (mustRevoke) {
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    if (dto.password) {
      await this.audit.record(actor, { action: 'password_reset', entityId: id, ...meta });
    }
    await this.audit.record(actor, { action: 'update', entityId: id, ...meta });
    UsersService.invalidateAuth(id); // ให้ role/status ใหม่มีผลทันที (ไม่ติด cache)

    const fresh = await this.prisma.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
    return this.shape(fresh!);
  }

  /**
   * ลบบัญชี = soft-delete (MR-08) — ตั้ง deletedAt + status=suspended + เพิกถอน token ทั้งหมด
   * เหตุผล: contracts.agent_id / appointments.agent_id เป็น FK RESTRICT (NOT NULL) →
   *   hard-delete agent ที่ถือสัญญา/นัด จะชน FK (เดิม 400 เสมอ). soft-delete เก็บประวัติ agent
   *   (สัญญา/นัดยังรู้ว่าใครถือ) + สอดคล้องกับ soft-delete ทั้งระบบ. login ถูกบล็อกเพราะ
   *   findActiveByEmail/getAuthContext กรอง deletedAt:null + status:'active' อยู่แล้ว
   * กัน: ลบตัวเองไม่ได้ · ลบได้เฉพาะบทบาทต่ำกว่าตน · ห้ามลบ super_admin
   */
  async remove(actor: AuthenticatedUser, id: string, meta: RequestMeta) {
    const scope = this.require(actor, 'delete');
    if (id === actor.id) throw new BadRequestException('ลบบัญชีของตัวเองไม่ได้');
    const target = await this.prisma.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
    if (!target || target.deletedAt) throw new NotFoundException('ไม่พบผู้ใช้');
    if (scope !== 'all' && target.branchId !== actor.branchId) {
      throw new ForbiddenException('ลบได้เฉพาะผู้ใช้ในสาขาของคุณ');
    }
    const targetRoles = target.userRoles.map((r) => r.role.name);
    // กันล็อกระบบ: ห้ามลบบัญชี super_admin ทุกกรณี (รวมถึง super_admin ลบกันเอง)
    if (targetRoles.includes('super_admin')) {
      throw new ForbiddenException('ลบบัญชีผู้ดูแลระบบสูงสุด (super_admin) ไม่ได้');
    }
    if (!actor.roles.includes('super_admin') && maxRank(targetRoles) >= maxRank(actor.roles)) {
      throw new ForbiddenException('ลบบัญชีที่บทบาทสูงกว่าหรือเท่ากับคุณไม่ได้');
    }
    // soft-delete + ระงับ + เพิกถอน session (ไม่ใช้ prisma.user.delete → ไม่ชน FK agent RESTRICT)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: actor.id, status: 'suspended', tokenVersion: { increment: 1 }, updatedBy: actor.id },
      }),
      this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record(actor, { action: 'delete', entityId: id, oldValue: { email: target.email, fullName: target.fullName, roles: targetRoles }, ...meta });
    UsersService.invalidateAuth(id);
    return { success: true };
  }
}
