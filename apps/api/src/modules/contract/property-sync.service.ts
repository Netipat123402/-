import { Injectable } from '@nestjs/common';
import { PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ActivityService } from '../../common/trail/activity.service';
import { NotificationService } from '../notification/notification.service';
import { RevalidationService } from '../../common/revalidation/revalidation.service';
import { OWNER_ALERT_ROLES } from '../../common/auth/operating-roles';
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
    private readonly notifications: NotificationService,
    private readonly revalidation: RevalidationService,
  ) {}

  async sync(propertyId: string, to: PropertyStatus, userId: string): Promise<void> {
    const prop = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { status: true, code: true, titleTh: true, contentDirty: true } });
    if (!prop || prop.status === to) return;
    if (!canTransitionProperty(prop.status, to)) return; // เคารพ state machine ของทรัพย์
    const from = prop.status;
    // Phase 6: สัญญาจบ → ทรัพย์กลับ available แต่เนื้อหาถูกแก้ระหว่างเช่า (dirty) → กันไว้รอตรวจก่อนขึ้นเว็บ
    // (ปิด edge เดียวกับ changeStatus แต่ทางที่ระบบขับจากสัญญา)
    const effectiveTo = to === PropertyStatus.available && prop.contentDirty ? PropertyStatus.pending_review : to;
    await this.prisma.$transaction([
      this.prisma.property.update({ where: { id: propertyId }, data: { status: effectiveTo, updatedBy: userId } }),
      this.prisma.propertyStatusHistory.create({
        data: { property: { connect: { id: propertyId } }, fromStatus: from, toStatus: effectiveTo, reason: 'sync จากสัญญา', changedBy: userId },
      }),
    ]);
    await this.activity.log({ entityType: 'property', entityId: propertyId, action: 'status_change', actorId: userId, summary: `เปลี่ยนสถานะ ${from} → ${effectiveTo} (จากสัญญา)`, i18nKey: 'activity.property.statusFromContract', i18nParams: { from, to: effectiveTo } });
    if (effectiveTo !== to) {
      await this.notifications.notifyRoles(OWNER_ALERT_ROLES, {
        category: 'property', entityType: 'property', entityId: propertyId,
        title: 'ทรัพย์กลับมาว่าง แต่ต้องตรวจก่อน', body: `${prop.code} ${prop.titleTh} — มีการแก้ไขระหว่างเช่า · กันไว้รอตรวจก่อนขึ้นเว็บ`,
        titleKey: 'notif.propBackAvailable.title', bodyKey: 'notif.propBackAvailable.body', params: { code: prop.code, title: prop.titleTh },
      });
    }
    // ทรัพย์ขึ้น/ลงเว็บจากสัญญา (active→rented หาย, terminated→available กลับมา) → ล้าง cache
    this.revalidation.revalidatePublicProperties(prop.code);
  }
}
