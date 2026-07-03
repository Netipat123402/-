import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { isContractExpiring, isWithinReminderWindow } from './scheduler.logic';
import { thaiDate, thaiDateTime } from '../../common/util/thai-datetime';

/**
 * SchedulerService (Phase 1 §9/§10) — งานเบื้องหลังตามเวลา
 *
 * ทำงานด้วย setInterval ในตัว (ไม่พึ่ง dependency ภายนอก — เหมาะกับ VPS เดียว)
 * - flagExpiringContracts: สัญญา active ที่ใกล้หมดอายุ → expiring_soon + แจ้ง agent
 * - remindUpcomingAppointments: เตือนนัด confirmed ที่จะถึงใน 24 ชม.
 *
 * ดีไซน์: query จริงอยู่ที่นี่ (บาง ๆ), ตรรกะการตัดสินใจอยู่ใน scheduler.logic (ทดสอบแยก)
 * หมายเหตุ scale: หลาย instance ควรใช้ distributed lock/queue — ตอนนี้ VPS เดียวพอ
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  private readonly intervalMs: number;
  private readonly expiryWindowDays = 30;
  private readonly reminderHours = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly config: ConfigService,
  ) {
    this.intervalMs =
      Number(this.config.get('SCHEDULER_INTERVAL_MS')) || 30 * 60 * 1000; // ดีฟอลต์ 30 นาที
  }

  onModuleInit(): void {
    // ไม่รันใน test (กัน side-effect / timer ค้าง)
    if (this.config.get('NODE_ENV') === 'test') return;
    // รันครั้งแรกหลังบูต 30 วิ (ให้ DB พร้อม) แล้วทุก ๆ interval
    setTimeout(() => void this.runOnce(), 30_000).unref?.();
    this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
    this.timer.unref?.();
    this.logger.log(`Scheduler เริ่มทำงาน (ทุก ${this.intervalMs / 60000} นาที)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** รันงานทั้งหมดหนึ่งรอบ (กันรอบซ้อนด้วย running flag) */
  async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.flagExpiringContracts();
      await this.remindUpcomingAppointments();
      await this.pruneCommunityAuthorIp();
    } catch (e) {
      this.logger.error(`Scheduler รอบนี้ผิดพลาด: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /**
   * สัญญา active ที่ใกล้หมดอายุ (≤30 วัน) → แจ้ง agent (ไม่เปลี่ยนสถานะ — "ใกล้ครบกำหนด" เป็นป้ายคำนวณ)
   * กันเตือนซ้ำด้วยการเช็ค notification เดิมในกรอบเวลา
   */
  async flagExpiringContracts(now = new Date()): Promise<number> {
    const candidates = await this.prisma.contract.findMany({
      where: { status: 'active', deletedAt: null },
      select: { id: true, code: true, endDate: true, agentId: true, propertyId: true },
    });
    let count = 0;
    for (const c of candidates) {
      if (!isContractExpiring(c.endDate, now, this.expiryWindowDays)) continue;
      // กันเตือนซ้ำ: ถ้าเคยแจ้งสัญญานี้ใน 30 วันที่ผ่านมาแล้ว ข้าม
      const existing = await this.prisma.notification.count({
        where: {
          entityType: 'contract', entityId: c.id, category: 'contract',
          title: 'สัญญาใกล้หมดอายุ',
          createdAt: { gt: new Date(now.getTime() - this.expiryWindowDays * 24 * 60 * 60 * 1000) },
        },
      });
      if (existing > 0) continue;
      await this.notifications.notifyUser(c.agentId, {
        category: 'contract', entityType: 'contract', entityId: c.id,
        title: 'สัญญาใกล้หมดอายุ',
        body: `สัญญา ${c.code} จะหมดอายุวันที่ ${thaiDate(c.endDate)} — โปรดดำเนินการต่อสัญญา/ปิดสัญญา`,
      });
      count++;
    }
    if (count) this.logger.log(`flagExpiringContracts: เตือน ${count} สัญญาใกล้หมดอายุ`);
    return count;
  }

  /** เตือนนัด upcoming ที่จะถึงใน 24 ชม. (กันเตือนซ้ำด้วยการเช็ค notification เดิม) */
  async remindUpcomingAppointments(now = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + this.reminderHours * 60 * 60 * 1000);
    const appts = await this.prisma.appointment.findMany({
      where: {
        status: 'upcoming', deletedAt: null,
        scheduledAt: { gt: now, lte: horizon },
      },
      select: { id: true, code: true, agentId: true, scheduledAt: true },
    });
    let count = 0;
    for (const a of appts) {
      if (!isWithinReminderWindow(a.scheduledAt, now, this.reminderHours)) continue;
      // กันเตือนซ้ำ: ถ้ามี notification reminder ของนัดนี้ภายใน 24 ชม. แล้ว ข้าม
      const existing = await this.prisma.notification.count({
        where: {
          entityType: 'appointment', entityId: a.id, category: 'appointment',
          title: 'เตือนนัดดูทรัพย์',
          createdAt: { gt: new Date(now.getTime() - this.reminderHours * 60 * 60 * 1000) },
        },
      });
      if (existing > 0) continue;
      await this.notifications.notifyUser(a.agentId, {
        category: 'appointment', entityType: 'appointment', entityId: a.id,
        title: 'เตือนนัดดูทรัพย์',
        body: `นัด ${a.code} จะถึงในวันที่ ${thaiDateTime(a.scheduledAt)}`,
      });
      count++;
    }
    if (count) this.logger.log(`remindUpcomingAppointments: เตือน ${count} นัด`);
    return count;
  }

  /**
   * MR-34: ล้าง author_ip ของโพสต์ชุมชนที่เก่ากว่า retention (PDPA — ไม่เก็บ IP เกินจำเป็น)
   * null เฉพาะที่ยังมีค่า เพื่อไม่อัปเดตทั้งตารางทุกครั้ง
   */
  private readonly authorIpRetentionDays = 90;
  async pruneCommunityAuthorIp(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.authorIpRetentionDays * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.communityPost.updateMany({
      where: { createdAt: { lt: cutoff }, authorIp: { not: null } },
      data: { authorIp: null },
    });
    if (count) this.logger.log(`pruneCommunityAuthorIp: ล้าง IP ${count} โพสต์เก่า (>${this.authorIpRetentionDays} วัน)`);
    return count;
  }
}
