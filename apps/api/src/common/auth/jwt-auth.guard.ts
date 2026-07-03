import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators';
import { TokenService } from '../../modules/auth/token.service';
import { UsersService } from '../../modules/identity/users.service';

/**
 * JwtAuthGuard (global) — Phase 4 §2 / Phase 7
 * - route ที่ @Public() → ผ่าน
 * - อื่น ๆ → ต้องมี access token ถูกต้อง + โหลด AuthenticatedUser แนบ req.user
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('ต้องเข้าสู่ระบบก่อน');

    const payload = this.tokenService.verifyAccessToken(token);
    const user = await this.usersService.getAuthContext(payload.sub);
    if (!user) throw new UnauthorizedException('บัญชีไม่พร้อมใช้งาน');
    // MR-22: token version ต้องตรงปัจจุบัน — ไม่ตรง = ถูกเพิกถอน (logout-all/รีเซ็ตรหัส/suspend)
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('เซสชันถูกยกเลิก กรุณาเข้าสู่ระบบใหม่');
    }

    (req as Request & { user: unknown }).user = user;
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [type, value] = header.split(' ');
    return type === 'Bearer' && value ? value : null;
  }
}
