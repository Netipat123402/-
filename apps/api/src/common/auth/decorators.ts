import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user';

/** ทำเครื่องหมาย route เป็น public (ข้าม JwtAuthGuard) */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** บังคับสิทธิ์ resource:action (Phase 4 §3 / Phase 7 §1) */
export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action });

/** ดึง user ปัจจุบันจาก request → @CurrentUser() */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthenticatedUser;
  },
);
