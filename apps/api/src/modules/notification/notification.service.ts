import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EntityType, NotificationCategory, NotificationChannel, Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { QueryNotificationDto, UpdatePreferenceDto } from './dto/notification.dto';

export interface NotifyInput {
  recipientUserId?: string;
  recipientLineId?: string;
  channel?: NotificationChannel;
  category: NotificationCategory;
  /** ข้อความ fallback (ไทย) — คงไว้สำหรับ row เก่า/LINE/email · FE ใช้ i18n ก่อนถ้ามี */
  title: string;
  body: string;
  entityType?: EntityType;
  entityId?: string;
  /** i18n (C-backend 2/2) — key ใน catalog FE `notif.*` + params · FE render `t(key, params)` */
  titleKey?: string;
  bodyKey?: string;
  params?: Prisma.InputJsonValue;
}

/**
 * NotificationService (Phase 1 §12 / Phase 2 §9)
 * - in-app เก็บใน DB | LINE/email = wire ภายหลัง (Stage 8 — มี credential)
 * - โมดูลอื่นเรียก notify() ได้ (cross-cutting)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** สร้าง + (จำลอง) ส่ง notification — เคารพ preference ของผู้รับ */
  async notify(input: NotifyInput) {
    const channel = input.channel ?? 'in_app';

    if (input.recipientUserId) {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          userId_category_channel: {
            userId: input.recipientUserId, category: input.category, channel,
          },
        },
      });
      if (pref && !pref.isEnabled) {
        this.logger.debug(`ข้าม notification (ปิด preference): ${input.category}/${channel}`);
        return null;
      }
    }

    const notif = await this.prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId, recipientLineId: input.recipientLineId,
        channel, category: input.category, title: input.title, body: input.body,
        titleKey: input.titleKey, bodyKey: input.bodyKey, params: input.params,
        entityType: input.entityType, entityId: input.entityId,
        status: channel === 'in_app' ? 'delivered' : 'queued',
      },
    });

    // TODO Stage 8: ถ้า channel = line/email → ส่งจริงผ่าน provider แล้วอัปเดต status
    if (channel !== 'in_app') {
      this.logger.log(`[stub] queue ${channel} notification → ${input.title}`);
    }
    return notif;
  }

  /** แจ้งเตือนผู้ใช้คนเดียว (เช่น agent ที่รับมอบหมาย) */
  async notifyUser(userId: string | null | undefined, input: Omit<NotifyInput, 'recipientUserId'>) {
    if (!userId) return null;
    return this.notify({ ...input, recipientUserId: userId });
  }

  /**
   * แจ้งเตือนทุกคนที่มีบทบาทที่ระบุ (เช่น หัวหน้าทีมเมื่อมี Lead ใหม่)
   * #12: ดึง user + preference ในคิวรีเดียว แล้ว insert แบบ batch (createMany) — เลี่ยง N+1
   */
  async notifyRoles(roleNames: string[], input: Omit<NotifyInput, 'recipientUserId'>) {
    const channel = input.channel ?? 'in_app';
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null, status: 'active',
        userRoles: { some: { role: { name: { in: roleNames } } } },
      },
      select: {
        id: true,
        // ดึงเฉพาะ preference ของ category+channel นี้ (ถ้าไม่มี = เปิดโดยดีฟอลต์)
        notificationPrefs: {
          where: { category: input.category, channel },
          select: { isEnabled: true },
        },
      },
    });
    const recipients = users.filter((u) => {
      const pref = u.notificationPrefs[0];
      return !pref || pref.isEnabled;
    });
    if (recipients.length === 0) return 0;
    await this.prisma.notification.createMany({
      data: recipients.map((u) => ({
        recipientUserId: u.id, channel, category: input.category,
        title: input.title, body: input.body,
        titleKey: input.titleKey, bodyKey: input.bodyKey, params: input.params,
        entityType: input.entityType, entityId: input.entityId,
        status: channel === 'in_app' ? ('delivered' as const) : ('queued' as const),
      })),
    });
    if (channel !== 'in_app') {
      this.logger.log(`[stub] queue ${channel} notification x${recipients.length} → ${input.title}`);
    }
    return recipients.length;
  }

  async listMine(user: AuthenticatedUser, query: QueryNotificationDto) {
    const where: Prisma.NotificationWhereInput = { recipientUserId: user.id };
    if (query.status) where.status = query.status;
    const page = query.page ?? 1, limit = query.limit ?? 20;
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { recipientUserId: user.id, status: { not: 'read' } } }),
    ]);
    return { items, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientUserId: user.id },
      data: { status: 'read', readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('ไม่พบการแจ้งเตือน');
    return { success: true };
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: user.id, status: { not: 'read' } },
      data: { status: 'read', readAt: new Date() },
    });
    return { updated: result.count };
  }

  async getPreferences(user: AuthenticatedUser) {
    const items = await this.prisma.notificationPreference.findMany({ where: { userId: user.id } });
    return { items };
  }

  async updatePreference(user: AuthenticatedUser, dto: UpdatePreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_category_channel: { userId: user.id, category: dto.category, channel: dto.channel },
      },
      update: { isEnabled: dto.isEnabled },
      create: { userId: user.id, category: dto.category, channel: dto.channel, isEnabled: dto.isEnabled },
    });
  }
}
