import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { assertDeletable } from '../../common/guards/deletion-guard';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const orderBy: Prisma.OwnerOrderByWithRelationInput =
      query.sort === 'name' ? { fullName: 'asc' } : { createdAt: 'desc' }; // MR-12 (server-side sort ข้ามหน้า)
    const [items, total] = await this.prisma.$transaction([
      this.prisma.owner.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.owner.count({ where }),
    ]);
    // นับจำนวนทรัพย์ต่อเจ้าของ (ข้อมูลรองที่มีประโยชน์ในลิสต์ แทนอีเมล) — 1 query
    const ids = items.map((o) => o.id);
    const grouped = ids.length
      ? await this.prisma.property.groupBy({ by: ['ownerId'], where: { ownerId: { in: ids }, deletedAt: null }, _count: true })
      : [];
    const countBy = new Map(grouped.map((g) => [g.ownerId, g._count]));
    return {
      items: items.map((o) => ({ ...this.maskRow(o), propertyCount: countBy.get(o.id) ?? 0 })),
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
    await this.requireInScope(user, id, 'update');
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
    return this.maskRow(owner);
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

  private async requireInScope(user: AuthenticatedUser, id: string, action: string) {
    const scope = this.require(user, action);
    const owner = await this.prisma.owner.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
    });
    if (!owner) throw new NotFoundException('ไม่พบเจ้าของทรัพย์');
    return owner;
  }
}
