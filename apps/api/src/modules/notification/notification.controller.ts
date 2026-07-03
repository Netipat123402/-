import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { QueryNotificationDto, UpdatePreferenceDto } from './dto/notification.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get() @RequirePermission('notification', 'read')
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: QueryNotificationDto) {
    return this.service.listMine(u, q);
  }

  @Get('preferences') @RequirePermission('notification', 'read')
  preferences(@CurrentUser() u: AuthenticatedUser) {
    return this.service.getPreferences(u);
  }

  @Patch('preferences') @RequirePermission('notification', 'read')
  updatePreference(@CurrentUser() u: AuthenticatedUser, @Body() dto: UpdatePreferenceDto) {
    return this.service.updatePreference(u, dto);
  }

  @Patch('read-all') @RequirePermission('notification', 'read')
  markAllRead(@CurrentUser() u: AuthenticatedUser) {
    return this.service.markAllRead(u);
  }

  @Patch(':id/read') @RequirePermission('notification', 'read')
  markRead(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(u, id);
  }
}
