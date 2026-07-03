import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

/** SettingsService (MR-27) — แยก logic ออกจาก controller (unit-test ได้, ไม่เรียก prisma ตรงใน controller) */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list() {
    const rows = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return rows.map((s) => ({ key: s.key, value: s.value, scope: s.scope }));
  }

  async update(user: AuthenticatedUser, key: string, value: Prisma.InputJsonValue) {
    const updated = await this.prisma.setting.update({ where: { key }, data: { value, updatedBy: user.id } });
    // settings key ไม่ใช่ UUID → ใส่ใน newValue แทน entityId (คอลัมน์ entityId เป็น UUID)
    await this.audit.record(user, { action: 'update', newValue: { key, value } });
    return { key: updated.key, value: updated.value };
  }
}
