import { Controller, Get, Module, Query } from '@nestjs/common';
import { AuditQueryService } from './audit-query.service';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

@Controller('audit-logs')
class AuditController {
  constructor(private readonly service: AuditQueryService) {}

  @Get() @RequirePermission('audit', 'read')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limitRaw?: string,
  ) {
    return this.service.list(user, action, from, to, page, limitRaw);
  }

  /**
   * ฟีดกิจกรรมทีม — ทุกคนที่มีสิทธิ์ activity:read (รวม sales) เห็นสรุป;
   * ผู้มีสิทธิ์ audit:read เห็นดีเทล (ค่าเดิม→ใหม่ + IP + ชื่อเอนทิตี)
   */
  @Get('feed') @RequirePermission('activity', 'read')
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('page') page = '1',
    @Query('limit') limitRaw?: string,
  ) {
    return this.service.feed(user, action, from, page, limitRaw);
  }

  // MR-25: ลบ endpoint DELETE /audit-logs/feed ทิ้ง — audit immutable (trigger + REVOKE MR-18);
  // retention ทำผ่าน partition-archive (MR-20)

  /** รายการ action ที่มี (สำหรับ filter dropdown) */
  @Get('actions') @RequirePermission('activity', 'read')
  actions() {
    return this.service.actions();
  }
}

@Module({ controllers: [AuditController], providers: [AuditQueryService] })
export class AuditModule {}
