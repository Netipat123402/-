import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { NotificationService } from '../notification/notification.service';
import { assertDeletable } from '../../common/guards/deletion-guard';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import { OWNER_ALERT_ROLES } from '../../common/auth/operating-roles';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import { CreateOwnerDto, QueryOwnerDto, UpdateOwnerDto } from './dto/owner.dto';
import type { RequestMeta } from '../../common/types/request-meta';

type OwnerRow = { idCardNo: string | null } & Record<string, unknown>;

@Injectable()
export class OwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: CryptoService,
    private readonly notifications: NotificationService,
  ) {}

  /** ไม่คืน idCardNo เป็น plaintext — แสดงเป็น mask (เปิด 4 ตัวท้าย) เท่านั้น */
  private maskRow<T extends OwnerRow>(owner: T): T {
    return { ...owner, idCardNo: this.crypto.mask(owner.idCardNo) };
  }

  // owner ไม่มี assignedTo → team≈branch (กรองตามสาขา) / own = ผู้สร้าง
  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.OwnerWhereInput {
    const base: Prisma.OwnerWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    if (scope === 'own') return { ...base, createdBy: user.id };
    // branch/team — กัน null-leak ถ้า user ไม่มี branchId
    return user.branchId ? { ...base, branchId: user.branchId } : { ...base, ...NEVER_MATCH };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'owner', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ owner:${action}`);
    return scope;
  }

  async create(user: AuthenticatedUser, dto: CreateOwnerDto, meta: RequestMeta) {
    this.require(user, 'create');
    const { idCardNo, ...rest } = dto;
    const owner = await this.prisma.owner.create({
      data: {
        ...rest,
        idCardNo: this.crypto.encrypt(idCardNo), // PII: เข้ารหัสก่อนเก็บ
        branchId: user.branchId, createdBy: user.id, updatedBy: user.id,
      },
    });
    await this.audit.record(user, {
      action: 'create', entityType: 'owner', entityId: owner.id,
      newValue: { fullName: owner.fullName }, ...meta, // ไม่บันทึก idCardNo ลง audit
    });
    return this.maskRow(owner);
  }

  async findMany(user: AuthenticatedUser, query: QueryOwnerDto) {
    const scope = this.require(user, 'read');
    const where: Prisma.OwnerWhereInput = { AND: [this.scopeWhere(user, scope)] };
    if (query.q) {
      (where.AND as Prisma.OwnerWhereInput[]).push({
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q } },
        ],
      });
    }
    // toggle "มีทรัพย์ว่าง" — กรองเจ้าของที่มีทรัพย์ status available อย่างน้อย 1 (relation some)
    if (query.hasVacant) {
      (where.AND as Prisma.OwnerWhereInput[]).push({ properties: { some: { deletedAt: null, status: 'available' } } });
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // sort: name (ก-ฮ) · most_properties (ทรัพย์มากสุด · orderBy relation _count) · new (ใหม่สุด default)
    const orderBy: Prisma.OwnerOrderByWithRelationInput =
      query.sort === 'name' ? { fullName: 'asc' }
        : query.sort === 'most_properties' ? { properties: { _count: 'desc' } }
          : { createdAt: 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.owner.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.owner.count({ where }),
    ]);
    // นับจำนวนทรัพย์ต่อเจ้าของ (ทั้งหมด + ว่างอยู่) — 2 query
    const ids = items.map((o) => o.id);
    const grouped = ids.length
      ? await this.prisma.property.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids }, deletedAt: null }, _count: true })
      : [];
    const countBy = new Map(grouped.map((g) => [g.ownerId, g._count]));
    // R2: ทรัพย์ "ว่างอยู่" (status available) + "เช่าอยู่" (status rented) ต่อเจ้าของ
    const availGrouped = ids.length
      ? await this.prisma.property.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids }, deletedAt: null, status: 'available' }, _count: true })
      : [];
    const availBy = new Map(availGrouped.map((g) => [g.ownerId, g._count]));
    const rentedGrouped = ids.length
      ? await this.prisma.property.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids }, deletedAt: null, status: 'rented' }, _count: true })
      : [];
    const rentedCntBy = new Map(rentedGrouped.map((g) => [g.ownerId, g._count]));
    // R2: "ปล่อยเช่าล่าสุด" = ทรัพย์จากสัญญา active ล่าสุด (ไม่มี active → สัญญาล่าสุดทุกสถานะ) ต่อเจ้าของ
    const contracts = ids.length
      ? await this.prisma.contract.findMany({
          where: { ownerId: { in: ids }, deletedAt: null },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          select: { ownerId: true, status: true, property: { select: { code: true, titleTh: true } } },
        })
      : [];
    const rentedBy = new Map<string, (typeof contracts)[number]>();
    for (const c of contracts) {
      const cur = rentedBy.get(c.ownerId);
      if (!cur || (c.status === 'active' && cur.status !== 'active')) rentedBy.set(c.ownerId, c);
    }
    return {
      items: items.map((o) => ({
        ...this.maskRow(o),
        propertyCount: countBy.get(o.id) ?? 0,
        availableCount: availBy.get(o.id) ?? 0,
        rentedCount: rentedCntBy.get(o.id) ?? 0,
        latestRented: rentedBy.get(o.id)?.property ?? null,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const scope = this.require(user, 'read');
    const owner = await this.prisma.owner.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: {
        // ทรัพย์ที่เป็นเจ้าของ (ข้อมูลรองหลักของหน้า detail) + สัญญา
        properties: {
          where: { deletedAt: null },
          select: { id: true, code: true, titleTh: true, status: true, monthlyRent: true },
          orderBy: { createdAt: 'desc' },
        },
        contracts: {
          where: { deletedAt: null },
          select: { id: true, code: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!owner) throw new NotFoundException('ไม่พบเจ้าของทรัพย์');
    return this.maskRow(owner);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateOwnerDto, meta: RequestMeta) {
    const existing = await this.requireInScope(user, id, 'update');
    const { idCardNo, ...rest } = dto;
    const owner = await this.prisma.owner.update({
      where: { id },
      data: {
        ...rest,
        // เข้ารหัส idCardNo เฉพาะเมื่อส่งมาแก้ (undefined = ไม่แตะ)
        ...(idCardNo !== undefined ? { idCardNo: this.crypto.encrypt(idCardNo) } : {}),
        updatedBy: user.id,
      },
    });
    await this.audit.record(user, { action: 'update', entityType: 'owner', entityId: id, ...meta });
    // Phase 5: แก้ข้อมูลติดต่อ/ตัวตนเจ้าของทรัพย์ → แจ้งเจ้าของระบบ (ช่องโหว่: เปลี่ยนเบอร์/บัญชีดักติดต่อ)
    await this.notifySensitiveEdit(user, existing, dto);
    return this.maskRow(owner);
  }

  /**
   * แจ้งเจ้าของระบบเมื่อ "คนที่ไม่ใช่เจ้าของ" แก้ข้อมูลอ่อนไหวของเจ้าของทรัพย์ (transparency กันโกง · ไม่บล็อก)
   * - เจ้าของแก้เอง (super_admin) = ไม่เตือน (กัน noise)
   * - idCardNo: แจ้งว่า "เปลี่ยน" แต่ไม่โชว์เลข (PII)
   */
  private async notifySensitiveEdit(user: AuthenticatedUser, before: { id: string; fullName: string; phone: string | null; email: string | null; address: string | null }, dto: UpdateOwnerDto) {
    if (user.roles.includes('super_admin')) return;
    const changes: string[] = [];
    if (dto.fullName !== undefined && dto.fullName !== before.fullName) changes.push(`ชื่อ: ${before.fullName} → ${dto.fullName}`);
    if (dto.phone !== undefined && dto.phone !== before.phone) changes.push(`เบอร์โทร: ${before.phone ?? '—'} → ${dto.phone ?? '—'}`);
    if (dto.email !== undefined && dto.email !== before.email) changes.push(`อีเมล: ${before.email ?? '—'} → ${dto.email ?? '—'}`);
    if (dto.address !== undefined && dto.address !== before.address) changes.push('ที่อยู่');
    if (dto.idCardNo !== undefined) changes.push('เลขบัตรประชาชน (ไม่แสดงเลข)');
    if (changes.length === 0) return;
    await this.notifications.notifyRoles(OWNER_ALERT_ROLES, {
      category: 'owner', entityType: 'owner', entityId: before.id,
      title: 'มีการแก้ข้อมูลเจ้าของทรัพย์',
      body: `${user.fullName} แก้ ${before.fullName} — ${changes.join(' · ')}`,
    });
  }

  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    await this.requireInScope(user, id, 'delete');
    // #5: กันลบถ้ายังมีทรัพย์ หรือสัญญาที่ยังไม่ปิด ผูกอยู่ (soft delete ไม่ทริกเกอร์ FK Restrict)
    const [props, activeContracts] = await this.prisma.$transaction([
      this.prisma.property.count({ where: { ownerId: id, deletedAt: null } }),
      this.prisma.contract.count({ where: { ownerId: id, deletedAt: null, status: { not: 'ended' } } }),
    ]);
    assertDeletable('เจ้าของ', [
      { label: `ทรัพย์ ${props} รายการ`, count: props },
      { label: `สัญญาที่ยังไม่ปิด ${activeContracts} ฉบับ`, count: activeContracts },
    ]);
    await this.prisma.owner.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
    await this.audit.record(user, { action: 'delete', entityType: 'owner', entityId: id, ...meta });
    return { success: true };
  }

  /**
   * Phase 6: เปิดดูเลขบัตรเต็ม (decrypt) — เฉพาะผู้มีสิทธิ์ owner:reveal_pii (super_admin/เจ้าของ)
   * บันทึก audit ทุกครั้ง (ใครเปิดดูบัตรใคร เมื่อไหร่) · ไม่บันทึกค่าเลขลง audit
   */
  async revealIdCard(user: AuthenticatedUser, id: string, meta: RequestMeta): Promise<{ idCardNo: string | null }> {
    const owner = await this.requireInScope(user, id, 'reveal_pii');
    await this.audit.record(user, { action: 'reveal_pii', entityType: 'owner', entityId: id, ...meta });
    return { idCardNo: this.crypto.decrypt(owner.idCardNo) };
  }

  private async requireInScope(user: AuthenticatedUser, id: string, action: string) {
    const scope = this.require(user, action);
    const owner = await this.prisma.owner.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
    });
    if (!owner) throw new NotFoundException('ไม่พบเจ้าของทรัพย์');
    return owner;
  }
}
