import { Body, Controller, Get, Param, Patch, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsDefined } from 'class-validator';
import { SettingsService } from './settings.service';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

class UpdateSettingDto {
  // ต้องมี value เสมอ (กันส่ง body ว่าง/มั่ว) — ค่าเป็น JSON ใด ๆ ได้ (string/number/object)
  @IsDefined({ message: 'ต้องระบุค่า value' })
  value!: Prisma.InputJsonValue;
}

@Controller('settings')
class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get() @RequirePermission('setting', 'read')
  list() {
    return this.service.list();
  }

  @Patch(':key') @RequirePermission('setting', 'update')
  update(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Body() body: UpdateSettingDto) {
    return this.service.update(user, key, body.value);
  }
}

@Module({ controllers: [SettingsController], providers: [SettingsService] })
export class SettingsModule {}
