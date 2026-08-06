import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PropertyRequestService } from './property-request.service';
import {
  CreatePropertyRequestDto, QueryPropertyRequestDto, ReviewNoteDto, UpdatePropertyRequestDto,
} from './dto/property-request.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('property-requests')
export class PropertyRequestController {
  constructor(private readonly service: PropertyRequestService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post() @RequirePermission('property_request', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreatePropertyRequestDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Get() @RequirePermission('property_request', 'read')
  findAll(@CurrentUser() u: AuthenticatedUser, @Query() query: QueryPropertyRequestDto) {
    return this.service.findAll(u, query);
  }

  @Get(':id') @RequirePermission('property_request', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  @Patch(':id') @RequirePermission('property_request', 'update')
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePropertyRequestDto, @Req() req: Request) {
    return this.service.update(u, id, dto, this.meta(req));
  }

  // เซล: ถอนคำขอของตัวเอง (own-check ที่ service)
  @Post(':id/withdraw') @RequirePermission('property_request', 'update')
  withdraw(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.withdraw(u, id, this.meta(req));
  }

  // ผู้ดูแลทรัพย์: convert → สร้างประกาศ (ร่าง)
  @Post(':id/convert') @RequirePermission('property_request', 'convert')
  convert(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.convert(u, id, this.meta(req));
  }

  // ตีกลับให้แก้ (needs_info) — soft
  @Post(':id/request-info') @RequirePermission('property_request', 'reject')
  requestInfo(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewNoteDto, @Req() req: Request) {
    return this.service.requestInfo(u, id, dto.reason, this.meta(req));
  }

  // ปฏิเสธถาวร
  @Post(':id/reject') @RequirePermission('property_request', 'reject')
  reject(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewNoteDto, @Req() req: Request) {
    return this.service.reject(u, id, dto.reason, this.meta(req));
  }

  @Delete(':id') @RequirePermission('property_request', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }
}
