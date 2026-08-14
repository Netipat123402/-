import { Injectable, Logger } from '@nestjs/common';
import type { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface ActivityEntry {
  entityType: EntityType;
  entityId: string;
  action: string;
  actorId?: string;
  /** ข้อความ fallback (ไทย) — คงไว้สำหรับ row เก่า/LINE-email · FE ใช้ i18n ก่อนถ้ามี */
  summary?: string;
  metadata?: Prisma.InputJsonValue;
  /** i18n (C-backend) — key ใน catalog FE `activity.*` + params · FE render `t(key, params)` */
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

/**
 * ActivityService (Phase 1 §13) — business timeline (แสดงบน entity detail)
 * append-only — บันทึกเหตุการณ์เชิงธุรกิจ (สถานะเปลี่ยน, มอบหมาย ฯลฯ)
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * บันทึก timeline — #9: best-effort (จับ error + log)
   * timeline เป็นข้อมูลประกอบ ไม่ควรทำให้ business op ที่ commit แล้วพังเป็น 500
   * (security audit ที่ห้ามพลาดใช้ AuditService ซึ่งยังโยน error ตามเดิม)
   */
  async log(entry: ActivityEntry): Promise<void> {
    try {
      // fold i18n (key+params) เข้า metadata.i18n — รวมกับ metadata เดิม (เช่น from/to/reason)
      const base = (entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata))
        ? (entry.metadata as Record<string, unknown>)
        : undefined;
      const metadata: Prisma.InputJsonValue | undefined = entry.i18nKey
        ? { ...base, i18n: { key: entry.i18nKey, ...(entry.i18nParams ? { params: entry.i18nParams } : {}) } }
        : entry.metadata;
      await this.prisma.activityLog.create({
        data: {
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          actorId: entry.actorId ?? null,
          summary: entry.summary ?? null,
          metadata,
        },
      });
    } catch (e) {
      this.logger.warn(
        `บันทึก activity ไม่สำเร็จ (${entry.entityType}/${entry.entityId} ${entry.action}): ${(e as Error).message}`,
      );
    }
  }

  /** ดึง timeline ของ entity (เรียงใหม่→เก่า) */
  async timeline(entityType: EntityType, entityId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
