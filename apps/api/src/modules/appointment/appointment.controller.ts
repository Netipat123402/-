import {
  Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentService } from './appointment.service';
import {
  CancelDto, CreateAppointmentDto, QueryAppointmentDto, RescheduleDto,
} from './dto/appointment.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post() @RequirePermission('appointment', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateAppointmentDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Get() @RequirePermission('appointment', 'read')
  findMany(@CurrentUser() u: AuthenticatedUser, @Query() q: QueryAppointmentDto) {
    return this.service.findMany(u, q);
  }

  @Get(':id') @RequirePermission('appointment', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  @Post(':id/reschedule') @RequirePermission('appointment', 'change_status')
  reschedule(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleDto, @Req() req: Request) {
    return this.service.reschedule(u, id, dto, this.meta(req));
  }

  @Post(':id/cancel') @RequirePermission('appointment', 'change_status')
  cancel(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelDto, @Req() req: Request) {
    return this.service.cancel(u, id, dto, this.meta(req));
  }

  @Post(':id/no-show') @RequirePermission('appointment', 'change_status')
  noShow(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.noShow(u, id, this.meta(req));
  }

  @Post(':id/complete') @RequirePermission('appointment', 'change_status')
  complete(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.complete(u, id, this.meta(req));
  }
}
