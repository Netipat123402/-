import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // แดชบอร์ดแยกตามบทบาท — service คำนวณเมตริก/คิวงานตาม role ของผู้เรียก
  @Get() @RequirePermission('dashboard', 'read')
  get(@CurrentUser() u: AuthenticatedUser) {
    return this.service.get(u);
  }
}
