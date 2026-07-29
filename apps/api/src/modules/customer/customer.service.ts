import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../../common/trail/audit.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

export interface UpdateCustomerInput {
  fullName?: string; phone?: string; email?: string; address?: string; idCardNo?: string;
}
type CustomerRow = { idCardNo: string | null } & Record<string, unknown>;

/** CustomerService (MR-27) — logic ลูกค้า (mask PII, scope, list/get/update/remove) แยกจาก controller */
@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  /** ไม่คืน idCardNo เป็น plaintext — แสดงเป็น mask เท่านั้น */
  private mask<T extends CustomerRow>(c: T | null): T | null {
    if (!c) return c;
    return { ...c, idCardNo: this.crypto.mask(c.idCardNo) };
  }

  private scopeWhere(user: AuthenticatedUser, action = 'read'): Prisma.CustomerWhereInput {
    const scope = resolveScope(user, 'customer', action);
    const base: Prisma.CustomerWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    // branch/team — กัน null-leak ถ้า user ไม่มี branchId (#8)
    return user.branchId ? { ...base, branchId: user.branchId } : { ...base, ...NEVER_MATCH };
  }

  async list(user: AuthenticatedUser, q?: string, page = '1', limitRaw?: string, sort?: string) {
    const where: Prisma.CustomerWhereInput = {
      AND: [this.scopeWhere(user), q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}],
    };
    const p = Math.max(1, Number(page)), limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sort === 'name' ? { fullName: 'asc' } : { createdAt: 'desc' }; // MR-12
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, orderBy, skip: (p - 1) * limit, take: limit }),
      this.prisma.customer.count({ where }),
    ]);
    const ids = items.map((c) => c.id);
    const grouped = ids.length
      ? await this.prisma.contract.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, deletedAt: null }, _count: true })
      : [];
    const countBy = new Map(grouped.map((g) => [g.customerId, g._count]));
    // R2: ทรัพย์+เจ้าของที่ลูกค้าเช่า = สัญญา active ล่าสุด · ถ้าไม่มี active → สัญญาล่าสุด (ทุกสถานะ) · ไม่มีเลย → null
    const contracts = ids.length
      ? await this.prisma.contract.findMany({
          where: { customerId: { in: ids }, deletedAt: null },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          select: { customerId: true, status: true, property: { select: { code: true, titleTh: true } }, owner: { select: { fullName: true, phone: true } } },
        })
      : [];
    const rentBy = new Map<string, (typeof contracts)[number]>();
    for (const c of contracts) {
      const cur = rentBy.get(c.customerId);
      // เลือก active ก่อน (ถ้ามี) · ไม่งั้นตัวแรกที่เจอ = ล่าสุด (เรียง startDate desc แล้ว)
      if (!cur || (c.status === 'active' && cur.status !== 'active')) rentBy.set(c.customerId, c);
    }
    return {
      items: items.map((c) => {
        const r = rentBy.get(c.id);
        return { ...this.mask(c), contractCount: countBy.get(c.id) ?? 0, rentedProperty: r?.property ?? null, rentedOwner: r?.owner ?? null };
      }),
      total, page: p, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { AND: [this.scopeWhere(user), { id }] },
      include: { contracts: { where: { deletedAt: null }, select: { id: true, code: true, status: true, monthlyRent: true }, orderBy: { createdAt: 'desc' } } },
    });
    return this.mask(c);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerInput) {
    if (!resolveScope(user, 'customer', 'update')) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขลูกค้า');
    // ต้องอยู่ใน scope ของผู้ใช้ก่อน (กัน IDOR แก้ลูกค้าข้ามสาขาด้วย id ตรง ๆ)
    const existing = await this.prisma.customer.findFirst({ where: { AND: [this.scopeWhere(user, 'update'), { id }] } });
    if (!existing) throw new NotFoundException('ไม่พบลูกค้า');
    const { idCardNo, ...rest } = dto;
    const updated = await this.prisma.customer.update({
      where: { id },
      data: { ...rest, ...(idCardNo !== undefined ? { idCardNo: this.crypto.encrypt(idCardNo) } : {}), updatedBy: user.id },
    });
    await this.audit.record(user, { action: 'update', entityType: 'customer', entityId: id });
    return this.mask(updated);
  }

  /**
   * ลบลูกค้า (soft-delete) — เฉพาะลูกค้าที่ "ยังไม่มีสัญญา" (เก็บประวัติเช่า + เคารพ FK Restrict)
   */
  async remove(user: AuthenticatedUser, id: string) {
    if (!resolveScope(user, 'customer', 'delete')) throw new ForbiddenException('ไม่มีสิทธิ์ลบลูกค้า');
    const existing = await this.prisma.customer.findFirst({ where: { AND: [this.scopeWhere(user, 'delete'), { id }] }, select: { id: true } });
    if (!existing) throw new NotFoundException('ไม่พบลูกค้า');
    const contractCount = await this.prisma.contract.count({ where: { customerId: id, deletedAt: null } });
    if (contractCount > 0) {
      throw new ConflictException('ลบไม่ได้ — ลูกค้ารายนี้มีสัญญาผูกอยู่ (เก็บเป็นหลักฐาน)');
    }
    await this.prisma.$transaction([
      this.prisma.lead.updateMany({ where: { customerId: id }, data: { customerId: null } }),
      this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } }),
    ]);
    await this.audit.record(user, { action: 'delete', entityType: 'customer', entityId: id });
    return { success: true };
  }
}
