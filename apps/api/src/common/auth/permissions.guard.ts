import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSION_KEY } from './decorators';
import type { AuthenticatedUser, Scope } from './authenticated-user';
import { SCOPE_RANK } from './authenticated-user';

/**
 * PermissionsGuard (global) — Phase 4 §3 / Phase 7 §1
 * ตรวจว่า user มีสิทธิ์ resource:action (อย่างน้อย scope ใดก็ได้)
 * ส่วน scope (own/team/branch) บังคับต่อที่ service/repository layer
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<{
      resource: string;
      action: string;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // ไม่ได้ระบุ @RequirePermission → ผ่าน (เช่น /auth/me ที่แค่ต้อง login)
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง');

    const matched = user.permissions.filter(
      (p) => p.resource === required.resource && p.action === required.action,
    );
    if (matched.length === 0) {
      throw new ForbiddenException(
        `ไม่มีสิทธิ์ ${required.resource}:${required.action}`,
      );
    }
    return true;
  }
}

/**
 * Helper — หา scope กว้างสุดที่ user มีสำหรับ resource:action
 * ใช้ใน service layer เพื่อสร้าง data filter (own/team/branch/all)
 */
export function resolveScope(
  user: AuthenticatedUser,
  resource: string,
  action: string,
): Scope | null {
  const scopes = user.permissions
    .filter((p) => p.resource === resource && p.action === action)
    .map((p) => p.scope);
  if (scopes.length === 0) return null;
  return scopes.reduce((widest, s) =>
    SCOPE_RANK[s] > SCOPE_RANK[widest] ? s : widest,
  );
}
