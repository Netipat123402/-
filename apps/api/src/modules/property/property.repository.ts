import { Injectable } from '@nestjs/common';
import { Prisma, PropertyType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import { NEVER_MATCH } from '../../common/auth/scope.util';

const TYPE_PREFIX: Record<PropertyType, string> = {
  condo: 'CD',
  house: 'HS',
  townhome: 'TH',
  apartment: 'AP',
};

/**
 * PropertyRepository — เข้าถึง DB + บังคับ scope filter (Phase 8 §3.2)
 * ทุก query ผ่าน scopeWhere → กันข้อมูลหลุดข้าม scope โดยอัตโนมัติ
 */
@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** สร้าง where ตาม scope ของ user (own/team/branch/all) + soft-delete filter */
  scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.PropertyWhereInput {
    const base: Prisma.PropertyWhereInput = { deletedAt: null };
    switch (scope) {
      case 'all':
        return base;
      case 'branch':
        // กัน null-leak: branch scope แต่ user ไม่มี branchId → ไม่เห็นอะไรเลย
        if (!user.branchId) return { ...base, ...NEVER_MATCH };
        return { ...base, branchId: user.branchId };
      case 'team':
        if (!user.teamId) return { ...base, ...NEVER_MATCH };
        return { ...base, assignedTo: { teamId: user.teamId } };
      case 'own':
      default:
        return { ...base, assignedToId: user.id };
    }
  }

  async create(data: Prisma.PropertyCreateInput) {
    return this.prisma.property.create({ data });
  }

  async findManyScoped(
    scopeWhere: Prisma.PropertyWhereInput,
    filters: Prisma.PropertyWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' },
  ) {
    const where: Prisma.PropertyWhereInput = { AND: [scopeWhere, filters] };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        // รูปปกสำหรับแสดงในตาราง (Phase 6)
        include: { media: { where: { isCover: true, deletedAt: null }, take: 1 } },
      }),
      this.prisma.property.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneScoped(id: string, scopeWhere: Prisma.PropertyWhereInput) {
    return this.prisma.property.findFirst({
      where: { AND: [scopeWhere, { id }] },
      include: {
        media: { where: { deletedAt: null }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        // Phase 11: การ์ดเจ้าของ = ชื่อ/เบอร์/อีเมล/จำนวนทรัพย์ที่ถือ (additive)
        owner: {
          select: {
            id: true, fullName: true, phone: true, email: true,
            _count: { select: { properties: { where: { deletedAt: null } } } },
          },
        },
        // Phase 13: สัญญาที่ยัง live (active) — โชว์ลิงก์แทนทางตัน + ใช้ตัดสิน guard สถานะ (additive)
        contracts: {
          where: { status: 'active', deletedAt: null },
          select: { id: true, code: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async update(id: string, data: Prisma.PropertyUpdateInput) {
    return this.prisma.property.update({ where: { id }, data });
  }

  async softDelete(id: string, userId: string) {
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }

  async recordStatusHistory(data: {
    propertyId: string;
    fromStatus: Prisma.PropertyStatusHistoryCreateInput['fromStatus'];
    toStatus: Prisma.PropertyStatusHistoryCreateInput['toStatus'];
    reason?: string;
    changedBy: string;
  }) {
    return this.prisma.propertyStatusHistory.create({
      data: {
        property: { connect: { id: data.propertyId } },
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        reason: data.reason,
        changedBy: data.changedBy,
      },
    });
  }

  /**
   * #9: เปลี่ยนสถานะ + บันทึก history ในทรานแซกชันเดียว (atomic)
   * กันกรณี update สำเร็จแต่ history ไม่ถูกบันทึก → ประวัติสถานะขาดหาย
   */
  async updateStatusWithHistory(
    id: string,
    updateData: Prisma.PropertyUpdateInput,
    history: {
      fromStatus: Prisma.PropertyStatusHistoryCreateInput['fromStatus'];
      toStatus: Prisma.PropertyStatusHistoryCreateInput['toStatus'];
      reason?: string;
      changedBy: string;
    },
  ) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.property.update({ where: { id }, data: updateData }),
      this.prisma.propertyStatusHistory.create({
        data: {
          property: { connect: { id } },
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          reason: history.reason,
          changedBy: history.changedBy,
        },
      }),
    ]);
    return updated;
  }

  /**
   * สร้างรหัสทรัพย์: เช่น CD-2026-0001
   * #10: ดึงเฉพาะรหัสล่าสุด (orderBy code desc, limit 1) ผ่าน unique index — ไม่ scan ทั้งปี
   * (รหัส zero-pad 4 หลัก จึงเรียงตามพจนานุกรม = เรียงตามตัวเลขสำหรับ ≤9999/ปี/ประเภท)
   */
  async generateCode(propertyType: PropertyType): Promise<string> {
    const prefix = TYPE_PREFIX[propertyType];
    const year = new Date().getFullYear();
    const head = `${prefix}-${year}-`;
    const last = await this.prisma.property.findFirst({
      where: { code: { startsWith: head } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return `${head}${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0')}`;
  }
}
