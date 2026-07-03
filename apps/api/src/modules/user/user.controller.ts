import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Get() @RequirePermission('user', 'read')
  list(@CurrentUser() u: AuthenticatedUser, @Query('q') q?: string) {
    return this.service.list(u, q);
  }

  // รายชื่อเจ้าหน้าที่ที่มอบหมายได้ (ทุกคนที่ล็อกอินเรียกได้ — ใช้กับ dropdown สร้างนัด/สัญญา)
  @Get('assignable')
  assignable(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listAssignable(u);
  }

  @Get('roles') @RequirePermission('user', 'read')
  roles(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listRoles(u);
  }

  @Post() @RequirePermission('user', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateUserDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Patch(':id') @RequirePermission('user', 'update')
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.service.update(u, id, dto, this.meta(req));
  }

  @Delete(':id') @RequirePermission('user', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }
}
