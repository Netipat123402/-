import { Injectable } from '@nestjs/common';
import { PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ActivityService } from '../../common/trail/activity.service';
import { RevalidationService } from '../../common/revalidation/revalidation.service';
import { canTransition as canTransitionProperty } from '../property/property.lifecycle';

/**
 * PropertySyncService (MR-29) — แยกการ sync สถานะทรัพย์จากสัญญา ออกจาก ContractService
 * (active→rented, terminated/closed→available ฯลฯ) + เคารพ state machine ของทรัพย์ + ล้าง ISR cache
 */
@Injectable()
export class PropertySyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly revalidation: RevalidationService,
  ) {}

  async sync(propertyId: string, to: PropertyStatus, userId: string): Promise<void> {
    const prop = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { status: true, code: true } });
    if (!prop || prop.status === to) return;
    if (!canTransitionProperty(prop.status, to)) return; // เคารพ state machine ของทรัพย์
    const from = prop.status;
    await this.prisma.$transaction([
      this.prisma.property.update({ where: { id: propertyId }, data: { status: to, updatedBy: userId } }),
      this.prisma.propertyStatusHistory.create({
        data: { property: { connect: { id: propertyId } }, fromStatus: from, toStatus: to, reason: 'sync จากสัญญา', changedBy: userId },
      }),
    ]);
    await this.activity.log({ entityType: 'property', entityId: propertyId, action: 'status_change', actorId: userId, summary: `เปลี่ยนสถานะ ${from} → ${to} (จากสัญญา)` });
    // ทรัพย์ขึ้น/ลงเว็บจากสัญญา (active→rented หาย, terminated→available กลับมา) → ล้าง cache
    this.revalidation.revalidatePublicProperties(prop.code);
  }
}
