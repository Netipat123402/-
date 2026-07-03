import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LeadService } from './lead.service';
import {
  AssignLeadDto, ChangeLeadStatusDto, CreateLeadDto, QueryLeadDto, UpdateLeadDto,
} from './dto/lead.dto';
import { ActivityService } from '../../common/trail/activity.service';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('leads')
export class LeadController {
  constructor(
    private readonly service: LeadService,
    private readonly activity: ActivityService,
  ) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post() @RequirePermission('lead', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateLeadDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Get() @RequirePermission('lead', 'read')
  findMany(@CurrentUser() u: AuthenticatedUser, @Query() q: QueryLeadDto) {
    return this.service.findMany(u, q);
  }

  @Get(':id') @RequirePermission('lead', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  @Get(':id/activities') @RequirePermission('lead', 'read')
  activities(@Param('id', ParseUUIDPipe) id: string) {
    return this.activity.timeline('lead', id);
  }

  @Patch(':id') @RequirePermission('lead', 'update')
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto, @Req() req: Request) {
    return this.service.update(u, id, dto, this.meta(req));
  }

  @Post(':id/assign') @RequirePermission('lead', 'assign')
  assign(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignLeadDto, @Req() req: Request) {
    return this.service.assign(u, id, dto, this.meta(req));
  }

  @Patch(':id/status') @RequirePermission('lead', 'change_status')
  changeStatus(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeLeadStatusDto, @Req() req: Request) {
    return this.service.changeStatus(u, id, dto.toStatus, dto.lostReason, this.meta(req));
  }

  @Post(':id/convert') @RequirePermission('lead', 'convert')
  convert(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.convert(u, id, this.meta(req));
  }

  @Delete(':id') @RequirePermission('lead', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }
}
