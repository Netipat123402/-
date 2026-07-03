import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from './password.service';
import { RequestContext, TokenService } from './token.service';
import { UsersService } from '../identity/users.service';
import { AuditService } from '../../common/trail/audit.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { loginFailedTotal } from '../../common/observability/metrics';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  private async auditFail(email: string, reason: string, ctx: RequestContext) {
    loginFailedTotal.inc(); // MR-03: metric สำหรับ alert brute-force spike
    await this.audit.write({
      action: 'login_failed',
      newValue: { email, reason },
      ip: ctx.ip, userAgent: ctx.userAgent,
    });
  }

  // account lockout (กัน brute-force/credential-stuffing) — นับจาก audit log ไม่ต้องเพิ่มคอลัมน์
  private static readonly LOCK_WINDOW_MS = 15 * 60 * 1000;
  private static readonly LOCK_MAX_FAILS = 5;

  async login(
    email: string,
    password: string,
    ctx: RequestContext,
  ): Promise<LoginResult> {
    // ล็อกชั่วคราวถ้าพยายามผิดเกินกำหนดในหน้าต่างเวลา (นับทุกอีเมล จึงไม่รั่ว enumeration)
    const fails = await this.audit.countRecentLoginFailures(email, AuthService.LOCK_WINDOW_MS);
    if (fails >= AuthService.LOCK_MAX_FAILS) {
      await this.auditFail(email, 'locked', ctx);
      throw new UnauthorizedException('พยายามเข้าสู่ระบบผิดหลายครั้งเกินไป บัญชีถูกล็อกชั่วคราว (ลองใหม่ใน 15 นาที)');
    }

    const user = await this.users.findActiveByEmail(email);

    // ข้อความเดียวกันทุกกรณี (ไม่บอกว่าอีเมลผิดหรือรหัสผิด — กัน enumeration)
    const invalid = new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    if (!user) { await this.auditFail(email, 'no_user', ctx); throw invalid; }
    if (user.status !== 'active') {
      await this.auditFail(email, 'inactive', ctx);
      throw new UnauthorizedException('บัญชีถูกระงับหรือยังไม่เปิดใช้งาน');
    }

    const ok = await this.passwords.verify(password, user.passwordHash);
    if (!ok) { await this.auditFail(email, 'bad_password', ctx); throw invalid; }

    const authUser = await this.users.getAuthContext(user.id);
    if (!authUser) { await this.auditFail(email, 'no_context', ctx); throw invalid; }

    const accessToken = this.tokens.signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      roles: authUser.roles,
      branchId: authUser.branchId,
      teamId: authUser.teamId,
      tv: authUser.tokenVersion,
    });
    const refreshToken = await this.tokens.issueRefreshToken(user.id, ctx);
    await this.users.touchLastLogin(user.id);

    await this.audit.write({
      actorId: authUser.id, actorRole: authUser.roles.join(','), branchId: authUser.branchId,
      action: 'login', ip: ctx.ip, userAgent: ctx.userAgent,
    });

    return { accessToken, refreshToken, user: authUser };
  }

  async refresh(
    rawToken: string,
    ctx: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, newRawToken } = await this.tokens.rotateRefreshToken(
      rawToken,
      ctx,
    );
    const authUser = await this.users.getAuthContext(userId);
    if (!authUser) throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');

    const accessToken = this.tokens.signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      roles: authUser.roles,
      branchId: authUser.branchId,
      teamId: authUser.teamId,
      tv: authUser.tokenVersion,
    });
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawToken: string | undefined, ctx: RequestContext): Promise<void> {
    if (!rawToken) return;
    const userId = await this.tokens.revokeRefreshToken(rawToken);
    await this.audit.write({
      actorId: userId, action: 'logout', ip: ctx.ip, userAgent: ctx.userAgent,
    });
  }
}
