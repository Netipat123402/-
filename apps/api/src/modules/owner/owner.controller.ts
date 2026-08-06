import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OwnerService } from './owner.service';
import { CreateOwnerDto, QueryOwnerDto, UpdateOwnerDto } from './dto/owner.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('owners')
export class OwnerController {
  constructor(private readonly service: OwnerService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post() @RequirePermission('owner', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateOwnerDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Get() @RequirePermission('owner', 'read')
  findMany(@CurrentUser() u: AuthenticatedUser, @Query() q: QueryOwnerDto) {
    return this.service.findMany(u, q);
  }

  @Get(':id') @RequirePermission('owner', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  // Phase 6: เปิดดูเลขบัตรเต็ม — เจ้าของ (reveal_pii) เท่านั้น + audit
  @Get(':id/idcard') @RequirePermission('owner', 'reveal_pii')
  revealIdCard(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.revealIdCard(u, id, this.meta(req));
  }

  @Patch(':id') @RequirePermission('owner', 'update')
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerDto, @Req() req: Request) {
    return this.service.update(u, id, dto, this.meta(req));
  }

  @Delete(':id') @RequirePermission('owner', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }
}
