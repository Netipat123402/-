import {
  BadRequestException, Body, Controller, Delete, Get, Param,
  ParseUUIDPipe, Post, Req, Res, StreamableFile, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { EntityType } from '@prisma/client';
import type { Request } from 'express';
import { DocumentService } from './document.service';
import { isDangerousInline } from '../../common/files/file-type';
import { AddVersionDto, RegisterDocumentDto } from './dto/document.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller()
export class DocumentController {
  constructor(private readonly service: DocumentService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  // ลงทะเบียน metadata (presigned flow — production/MinIO)
  @Post('documents') @RequirePermission('document', 'upload')
  register(@CurrentUser() u: AuthenticatedUser, @Body() dto: RegisterDocumentDto, @Req() req: Request) {
    return this.service.register(u, dto, this.meta(req));
  }

  // อัปโหลดไฟล์จริง (multipart) — เก็บใน memory แล้วส่งเข้า StorageService (local/MinIO) — MR-04
  @Post('documents/upload') @RequirePermission('document', 'upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (_r, file, cb) => cb(null, /^(image\/|application\/pdf)/.test(file.mimetype)),
  }))
  uploadFile(
    @CurrentUser() u: AuthenticatedUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
    @Body() dto: RegisterDocumentDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('กรุณาเลือกไฟล์ (รูปภาพ หรือ PDF, ≤15MB)');
    return this.service.uploadFile(u, file, dto, this.meta(req));
  }

  /** เอกสารทั้งหมดของ entity (Document Center inline — Phase 5) */
  @Get('entities/:type/:id/documents') @RequirePermission('document', 'read')
  listForEntity(@Param('type') type: EntityType, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.service.listForEntity(u, type, id);
  }

  @Get('documents/:id') @RequirePermission('document', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  @Get('documents/:id/download') @RequirePermission('document', 'download')
  async download(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // ดึงไฟล์ผ่าน StorageService (local disk หรือ MinIO) หลังเช็คสิทธิ์+scope+audit แล้ว — MR-04
    const f = await this.service.getDownloadStream(u, id, this.meta(req));
    // MR-09/MR-21: nosniff เสมอ + บังคับ attachment สำหรับชนิดที่ render ได้และอันตราย (html/svg/xml)
    const disposition = isDangerousInline(f.mimeType) ? 'attachment' : 'inline';
    res.set({
      'Content-Type': f.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
    });
    return new StreamableFile(f.stream);
  }

  @Post('documents/:id/versions') @RequirePermission('document', 'update')
  addVersion(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddVersionDto, @Req() req: Request) {
    return this.service.addVersion(u, id, dto, this.meta(req));
  }

  @Post('documents/:id/verify') @RequirePermission('document', 'verify')
  verify(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.verify(u, id, this.meta(req));
  }

  // Print (Document Lifecycle) — บันทึก audit ตอนสั่งพิมพ์เอกสารอ่อนไหว
  @Post('documents/:id/print') @RequirePermission('document', 'download')
  print(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.print(u, id, this.meta(req));
  }

  // Archive (Document Lifecycle) — ปิดเอกสารเป็น archived (ยังเก็บไว้ ไม่ลบ)
  @Post('documents/:id/archive') @RequirePermission('document', 'update')
  archive(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.archive(u, id, this.meta(req));
  }

  @Delete('documents/:id') @RequirePermission('document', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }
}
