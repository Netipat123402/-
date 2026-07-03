import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  CurrentUser,
  Public,
  RequirePermission,
} from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestContext } from './token.service';

const REFRESH_COOKIE = 'ros_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // กัน brute-force รายต่อ IP (เข้มกว่า global)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    const result = await this.auth.refresh(raw ?? '', this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.readRefreshCookie(req), this.ctx(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // ตัวอย่างใช้ RBAC: ต้องมีสิทธิ์ user:read ถึงจะเรียกได้ (Stage 4 จะมี endpoint จริง)
  @Get('permissions')
  @RequirePermission('user', 'read')
  myPermissions(@CurrentUser() user: AuthenticatedUser) {
    return { roles: user.roles, permissions: user.permissions };
  }

  // --- cookie helpers ---
  private setRefreshCookie(res: Response, token: string): void {
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 7;
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE') ?? false,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req as Request & { cookies?: Record<string, string> }).cookies?.[
      REFRESH_COOKIE
    ];
  }

  private ctx(req: Request): RequestContext {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
