import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

/**
 * SchedulerModule — งานเบื้องหลังตามเวลา (Prisma/Notification/Trail เป็น @Global อยู่แล้ว)
 */
@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
