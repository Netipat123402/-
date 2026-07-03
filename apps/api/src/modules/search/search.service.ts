import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import { propertySmartWhere } from '../../common/search/property-search';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

/**
 * SearchService (MR-27) — logic ค้นข้ามโมดูล (แยกออกจาก controller)
 * จำกัดผลลัพธ์ตาม scope ของผู้ใช้ในแต่ละ resource (กัน PII/ข้อมูลรั่วข้าม scope/สาขา)
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** สร้าง where ตาม scope ของ user — คืน null ถ้าไม่มีสิทธิ์ read */
  private scopeWhere(
    user: AuthenticatedUser,
    resource: string,
    by: { own: () => object; team: () => object; branch: () => object },
  ): object | null {
    const scope = resolveScope(user, resource, 'read');
    if (!scope) return null;
    if (scope === 'all') return { deletedAt: null };
    // กัน null-leak: branch/team scope แต่ user ไม่มี branchId/teamId → match ไม่ได้ (#8)
    if (scope === 'branch') return user.branchId ? { deletedAt: null, ...by.branch() } : { deletedAt: null, ...NEVER_MATCH };
    if (scope === 'team') return user.teamId ? { deletedAt: null, ...by.team() } : { deletedAt: null, ...NEVER_MATCH };
    return { deletedAt: null, ...by.own() };
  }

  async search(user: AuthenticatedUser, q?: string) {
    const empty = { properties: [], leads: [], customers: [], owners: [] };
    if (!q || q.trim().length < 2) return empty;
    const ci = { contains: q, mode: 'insensitive' as const };
    const take = 5;

    const propScope = this.scopeWhere(user, 'property', {
      own: () => ({ assignedToId: user.id }),
      team: () => ({ assignedTo: { teamId: user.teamId } }),
      branch: () => ({ branchId: user.branchId }),
    });
    const leadScope = this.scopeWhere(user, 'lead', {
      own: () => ({ assignedToId: user.id }),
      team: () => ({ assignedTo: { teamId: user.teamId } }),
      branch: () => ({ branchId: user.branchId }),
    });
    const custScope = this.scopeWhere(user, 'customer', {
      own: () => ({ branchId: user.branchId }),
      team: () => ({ branchId: user.branchId }),
      branch: () => ({ branchId: user.branchId }),
    });
    const ownScope = this.scopeWhere(user, 'owner', {
      own: () => ({ createdBy: user.id }),
      team: () => ({ branchId: user.branchId }),
      branch: () => ({ branchId: user.branchId }),
    });

    const [properties, leads, customers, owners] = await Promise.all([
      propScope
        ? this.prisma.property.findMany({
            where: { AND: [propScope as Prisma.PropertyWhereInput, { OR: [{ code: ci }, ...(propertySmartWhere(q).OR ?? [])] }] },
            select: { id: true, code: true, titleTh: true, status: true }, take,
          })
        : [],
      leadScope
        ? this.prisma.lead.findMany({
            where: { AND: [leadScope as Prisma.LeadWhereInput, { OR: [{ fullName: ci }, { code: ci }, { phone: { contains: q } }] }] },
            select: { id: true, code: true, fullName: true, phone: true }, take,
          })
        : [],
      custScope
        ? this.prisma.customer.findMany({
            where: { AND: [custScope as Prisma.CustomerWhereInput, { OR: [{ fullName: ci }, { phone: { contains: q } }] }] },
            select: { id: true, fullName: true, phone: true }, take,
          })
        : [],
      ownScope
        ? this.prisma.owner.findMany({
            where: { AND: [ownScope as Prisma.OwnerWhereInput, { OR: [{ fullName: ci }, { phone: { contains: q } }] }] },
            select: { id: true, fullName: true, phone: true }, take,
          })
        : [],
    ]);
    return { properties, leads, customers, owners };
  }
}
