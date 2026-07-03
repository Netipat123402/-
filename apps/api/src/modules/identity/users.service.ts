import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type {
  AuthenticatedUser,
  AuthPermission,
} from '../../common/auth/authenticated-user';

/**
 * UsersService (Identity context) — โหลดข้อมูลผู้ใช้ + สิทธิ์
 * ใช้โดย AuthService (login) และ JwtAuthGuard (ทุก request)
 */
/** cache อายุสั้นของ auth context — ลดภาระ query หนัก (userRoles→permissions) ทุก request */
const AUTH_CACHE_TTL_MS = 30_000;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private static authCache = new Map<string, { ctx: AuthenticatedUser; expires: number }>();

  /** ล้าง cache auth ของ user (เรียกเมื่อแก้ role/status — ให้สิทธิ์ใหม่มีผลทันที) */
  static invalidateAuth(userId: string): void {
    UsersService.authCache.delete(userId);
  }

  /** หา user จาก email พร้อม password hash (สำหรับ login) — เฉพาะที่ยังไม่ถูกลบ */
  async findActiveByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  /**
   * สร้าง AuthenticatedUser (id, roles, permissions, scope) จาก userId
   * รวม permission จากทุก role ของ user
   */
  async getAuthContext(userId: string): Promise<AuthenticatedUser | null> {
    const cached = UsersService.authCache.get(userId);
    if (cached && cached.expires > Date.now()) return cached.ctx;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'active' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return null;

    const roles: string[] = [];
    const permMap = new Map<string, AuthPermission>();

    for (const ur of user.userRoles) {
      roles.push(ur.role.name);
      for (const rp of ur.role.rolePermissions) {
        const p = rp.permission;
        const key = `${p.resource}:${p.action}:${p.scope}`;
        permMap.set(key, {
          resource: p.resource,
          action: p.action,
          scope: p.scope,
        });
      }
    }

    const ctx: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      branchId: user.branchId,
      teamId: user.teamId,
      permissions: [...permMap.values()],
      tokenVersion: user.tokenVersion, // MR-22
    };
    UsersService.authCache.set(userId, { ctx, expires: Date.now() + AUTH_CACHE_TTL_MS });
    return ctx;
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
