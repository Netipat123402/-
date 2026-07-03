import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { tokenReuseTotal } from '../../common/observability/metrics';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  branchId: string | null;
  teamId: string | null;
  tv: number; // MR-22: token version — เทียบกับ users.token_version ตอน guard
}

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * TokenService (Phase 7 §2/§3)
 * - Access: JWT อายุสั้น (15 นาที)
 * - Refresh: opaque token เก็บ hash ใน DB + rotation + reuse detection
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // --- Access (JWT) ---------------------------------------------------------
  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '900s',
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('token ไม่ถูกต้องหรือหมดอายุ');
    }
  }

  // --- Refresh (opaque, DB-backed) -----------------------------------------
  private sha256(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private refreshExpiry(): Date {
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /** ออก refresh token ใหม่ (family ใหม่) — ใช้ตอน login */
  async issueRefreshToken(userId: string, ctx: RequestContext): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.sha256(raw),
        familyId: randomUUID(),
        expiresAt: this.refreshExpiry(),
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
    void this.pruneStale(); // เก็บกวาด token เก่า (fire-and-forget) — กันตารางโตไม่จำกัด
    return raw;
  }

  /** ลบ token หมดอายุ + token ที่ถูกเพิกถอนนานเกิน 30 วัน (เก็บช่วงหนึ่งไว้ทำ reuse-detection) */
  private async pruneStale(): Promise<void> {
    const revokedCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken
      .deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: revokedCutoff } }] } })
      .catch(() => undefined);
  }

  /**
   * หมุน refresh token (Phase 7 §3)
   * - ไม่เจอ → ปฏิเสธ
   * - เจอแต่ถูก revoke แล้ว (= reuse) → เพิกถอนทั้ง family + ปฏิเสธ
   * - หมดอายุ → ปฏิเสธ
   * - ปกติ → revoke ตัวเก่า, ออกตัวใหม่ใน family เดิม
   */
  async rotateRefreshToken(
    rawToken: string,
    ctx: RequestContext,
  ): Promise<{ userId: string; newRawToken: string }> {
    const tokenHash = this.sha256(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) throw new UnauthorizedException('refresh token ไม่ถูกต้อง');

    if (existing.revokedAt) {
      // reuse detected → เพิกถอนทั้ง family
      tokenReuseTotal.inc(); // MR-03: metric สำหรับ alert ทันที (token ถูกขโมย)
      this.logger.warn(
        `Refresh token reuse detected (user=${existing.userId}, family=${existing.familyId}) → revoking family`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('session ถูกยกเลิกเพื่อความปลอดภัย');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('refresh token หมดอายุ');
    }

    const newRaw = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: this.sha256(newRaw),
          familyId: existing.familyId,
          expiresAt: this.refreshExpiry(),
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      }),
    ]);

    return { userId: existing.userId, newRawToken: newRaw };
  }

  /** logout — เพิกถอน token ปัจจุบัน + คืน userId (สำหรับ audit) */
  async revokeRefreshToken(rawToken: string): Promise<string | null> {
    const tokenHash = this.sha256(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash }, select: { userId: true },
    });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return existing?.userId ?? null;
  }
}
