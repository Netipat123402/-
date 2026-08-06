import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { PropertyService } from './property.service';
import type { RequestMeta } from '../../common/types/request-meta';
import { ActivityService } from '../../common/trail/activity.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ChangeStatusDto, RejectDto } from './dto/change-status.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly service: PropertyService,
    private readonly activity: ActivityService,
  ) {}

  @Post()
  @RequirePermission('property', 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
    @Req() req: Request,
  ) {
    return this.service.create(user, dto, this.meta(req));
  }

  @Get()
  @RequirePermission('property', 'read')
  findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryPropertyDto,
  ) {
    return this.service.findMany(user, query);
  }

  @Get(':id')
  @RequirePermission('property', 'read')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Get(':id/activities')
  @RequirePermission('property', 'read')
  activities(@Param('id', ParseUUIDPipe) id: string) {
    return this.activity.timeline('property', id);
  }

  @Patch(':id')
  @RequirePermission('property', 'update')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request,
  ) {
    return this.service.update(user, id, dto, this.meta(req));
  }

  @Delete(':id')
  @RequirePermission('property', 'delete')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.remove(user, id, this.meta(req));
  }

  // --- media (รูปทรัพย์) ---
  @Post(':id/media')
  @RequirePermission('property', 'update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // เก็บใน memory → StorageService (local/MinIO) — MR-04
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
      fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
    }),
  )
  uploadMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string } | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('กรุณาเลือกไฟล์รูปภาพ (jpg/png, ≤8MB)');
    return this.service.addMedia(user, id, file, this.meta(req));
  }

  @Delete(':id/media/:mediaId')
  @RequirePermission('property', 'update')
  deleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Req() req: Request,
  ) {
    return this.service.deleteMedia(user, id, mediaId, this.meta(req));
  }

  @Post(':id/media/:mediaId/cover')
  @RequirePermission('property', 'update')
  setCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Req() req: Request,
  ) {
    return this.service.setCover(user, id, mediaId, this.meta(req));
  }

  @Get(':id/completeness')
  @RequirePermission('property', 'read')
  completeness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.completeness(user, id);
  }

  // --- lifecycle transitions ---
  @Post(':id/submit-review')
  @RequirePermission('property', 'change_status')
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.submitReview(user, id, this.meta(req));
  }

  @Post(':id/approve')
  @RequirePermission('property', 'approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.approve(user, id, this.meta(req));
  }

  @Post(':id/reject')
  @RequirePermission('property', 'reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
    @Req() req: Request,
  ) {
    return this.service.reject(user, id, dto.reason, this.meta(req));
  }

  @Patch(':id/status')
  @RequirePermission('property', 'change_status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: Request,
  ) {
    return this.service.changeStatus(user, id, dto.toStatus, dto.reason, this.meta(req));
  }

  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
