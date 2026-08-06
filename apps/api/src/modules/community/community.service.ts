import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityCategory, CommunityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BOARD_MOD_ROLES } from '../../common/auth/operating-roles';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

// ชื่อสุ่ม (ไม่ระบุตัวตน) — โทนเป็นมิตร + เลขท้ายกันชนกัน
const ANON_NAMES = ['ผู้หาห้อง', 'คนรักคอนโด', 'นักเดินทาง', 'ผู้เช่าใหม่', 'เจ้าของใจดี', 'คนหาบ้าน', 'สมาชิกชุมชน', 'ผู้พักอาศัย'];
function randomName(): string {
  return `${ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)]} #${Math.floor(1000 + Math.random() * 9000)}`;
}
// อนุมัติได้เฉพาะผู้ดูแล (gate ด้วย role) — operating จริง: เจ้าของ + ผู้จัดการ (ดู operating-roles.ts)
export const MOD_ROLES = BOARD_MOD_ROLES;

// ด่านแรกกรองคำไม่เหมาะสม/สแปม (ก่อนถึงแอดมิน)
const BANNED_WORDS = ['เหี้ย', 'สัส', 'ควย', 'หี', 'เย็ด', 'ไอ้สัตว์', 'fuck', 'shit', 'bitch'];
function violatesPolicy(body: string): string | null {
  const text = body.toLowerCase();
  if (BANNED_WORDS.some((w) => text.includes(w))) return 'ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนโพสต์';
  if (/(.)\1{9,}/.test(body)) return 'ข้อความมีอักขระซ้ำมากเกินไป';
  if ((body.match(/https?:\/\//g) ?? []).length > 2) return 'ใส่ลิงก์ได้ไม่เกิน 2 ลิงก์';
  return null;
}

/** CommunityService (MR-27) — logic กระดานชุมชน (public post/list + moderation) แยกจาก controller */
@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async publicList(category?: string) {
    const where: Prisma.CommunityPostWhereInput = { status: 'published', deletedAt: null };
    if (category && category in CommunityCategory) where.category = category as CommunityCategory;
    return this.prisma.communityPost.findMany({
      where, orderBy: { publishedAt: 'desc' }, take: 40,
      select: { id: true, category: true, body: true, displayName: true, publishedAt: true },
    });
  }

  async publicCreate(category: CommunityCategory, body: string, ip: string | null) {
    const violation = violatesPolicy(body);
    if (violation) throw new BadRequestException(violation);
    const post = await this.prisma.communityPost.create({
      data: { category, body: body.trim(), displayName: randomName(), status: 'pending', authorIp: ip },
    });
    await this.notifications.notifyRoles(MOD_ROLES, {
      category: 'system',
      title: 'โพสต์ชุมชนใหม่รออนุมัติ',
      body: `${post.displayName}: ${post.body.slice(0, 60)}`,
    });
    return { success: true, message: 'ส่งโพสต์แล้ว — รอแอดมินอนุมัติก่อนแสดงบนเว็บ' };
  }

  private assertMod(user: AuthenticatedUser) {
    if (!user.roles.some((r) => MOD_ROLES.includes(r))) {
      throw new ForbiddenException('เฉพาะผู้ดูแลเท่านั้นที่จัดการโพสต์ชุมชนได้');
    }
  }

  async modList(user: AuthenticatedUser, status = 'pending', page = '1', limitRaw?: string) {
    this.assertMod(user);
    const where: Prisma.CommunityPostWhereInput = { deletedAt: null };
    if (status && status in CommunityStatus) where.status = status as CommunityStatus;
    const p = Math.max(1, Number(page)), limit = Math.min(100, Math.max(1, Number(limitRaw) || 8));
    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.communityPost.count({ where }),
    ]);
    return { items, total, page: p, limit, totalPages: Math.ceil(total / limit) };
  }

  private async transition(user: AuthenticatedUser, id: string, status: CommunityStatus, extra: Prisma.CommunityPostUpdateInput = {}) {
    this.assertMod(user);
    const found = await this.prisma.communityPost.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('ไม่พบโพสต์');
    return this.prisma.communityPost.update({
      where: { id }, data: { status, reviewedBy: user.id, reviewedAt: new Date(), ...extra },
    });
  }

  approve(user: AuthenticatedUser, id: string) { return this.transition(user, id, 'published', { publishedAt: new Date() }); }
  reject(user: AuthenticatedUser, id: string) { return this.transition(user, id, 'rejected'); }
  archive(user: AuthenticatedUser, id: string) { return this.transition(user, id, 'archived'); }
}
