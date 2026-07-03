import { Injectable } from '@nestjs/common';
import type { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';

export interface AuditEntry {
  action: string;
  entityType?: EntityType;
  entityId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

/**
 * AuditService (Phase 7 §4) — security audit log (append-only, immutable)
 * เขียนทุก action สำคัญ พร้อม old/new value + actor snapshot
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** นับ login ล้มเหลวของอีเมลนี้ในช่วงเวลาที่กำหนด (สำหรับ account lockout) */
  async countRecentLoginFailures(email: string, sinceMs: number): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        action: 'login_failed',
        createdAt: { gte: new Date(Date.now() - sinceMs) },
        newValue: { path: ['email'], equals: email },
      },
    });
  }

  async record(actor: AuthenticatedUser, entry: AuditEntry): Promise<void> {
    await this.write({
      actorId: actor.id,
      actorRole: actor.roles.join(','),
      branchId: actor.branchId,
      ...entry,
    });
  }

  /**
   * เขียน audit ตรง ๆ — สำหรับเหตุการณ์ที่ยังไม่มี AuthenticatedUser
   * (login / login_failed / logout) actorId อาจเป็น null
   */
  async write(data: {
    actorId?: string | null;
    actorRole?: string | null;
    branchId?: string | null;
  } & AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        actorRole: data.actorRole ?? null,
        action: data.action,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        branchId: data.branchId ?? null,
      },
    });
  }
}
