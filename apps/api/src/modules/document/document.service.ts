import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import { extname } from 'node:path';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { assertAllowedFileType } from '../../common/files/file-type';
import { AuditService } from '../../common/trail/audit.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import { AddVersionDto, RegisterDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.DocumentWhereInput {
    const base: Prisma.DocumentWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    if (scope === 'own') return { ...base, createdBy: user.id };
    // branch/team — กัน null-leak ถ้า user ไม่มี branchId
    return user.branchId ? { ...base, branchId: user.branchId } : { ...base, ...NEVER_MATCH };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'document', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ document:${action}`);
    return scope;
  }

  /** ลงทะเบียนเอกสาร + เวอร์ชันแรก + link (no-orphan ในทรานแซกชันเดียว) */
  async register(user: AuthenticatedUser, dto: RegisterDocumentDto, meta: RequestMeta) {
    this.require(user, 'upload');
    const storageKey = this.storage.generateKey(dto.entityType, dto.entityId, dto.name);

    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          documentType: dto.documentType, name: dto.name, status: 'uploaded',
          branchId: user.branchId, createdBy: user.id, updatedBy: user.id,
        },
      });
      const version = await tx.documentVersion.create({
        data: {
          documentId: created.id, versionNo: 1, storageKey,
          mimeType: dto.mimeType, fileSize: dto.fileSize, checksum: dto.checksum,
          createdBy: user.id,
        },
      });
      await tx.document.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
      await tx.documentLink.create({
        data: { documentId: created.id, entityType: dto.entityType, entityId: dto.entityId, createdBy: user.id },
      });
      return created;
    });

    const uploadUrl = await this.storage.getUploadUrl(storageKey);
    await this.audit.record(user, {
      action: 'upload', entityType: dto.entityType, entityId: dto.entityId,
      newValue: { documentId: doc.id, name: doc.name }, ...meta,
    });
    return { document: doc, storageKey, uploadUrl };
  }

  /** อัปโหลดไฟล์เอกสารจริง (multer เก็บไฟล์แล้ว) + ผูก entity (no-orphan) */
  async uploadFile(
    user: AuthenticatedUser,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    dto: RegisterDocumentDto,
    meta: RequestMeta,
  ) {
    this.require(user, 'upload');
    // ตรวจ magic-byte จริง (MR-09) — กัน SVG/HTML ปลอมเป็นรูป (Stored XSS); ใช้ mime ที่ตรวจได้
    const safeMime = assertAllowedFileType(file.buffer, ['image', 'pdf']);
    // เก็บไฟล์ผ่าน StorageService (local disk หรือ MinIO) — ไม่ผูกดิสก์ตรง (MR-04)
    const storageKey = this.storage.keyFor('documents', extname(file.originalname));
    await this.storage.putObject(storageKey, file.buffer, safeMime);
    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          documentType: dto.documentType, name: dto.name || file.originalname, status: 'uploaded',
          branchId: user.branchId, createdBy: user.id, updatedBy: user.id,
        },
      });
      const version = await tx.documentVersion.create({
        data: {
          documentId: created.id, versionNo: 1, storageKey,
          mimeType: safeMime, fileSize: file.size, createdBy: user.id,
        },
      });
      await tx.document.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
      await tx.documentLink.create({
        data: { documentId: created.id, entityType: dto.entityType, entityId: dto.entityId, createdBy: user.id },
      });
      return created;
    });
    await this.audit.record(user, {
      action: 'upload', entityType: dto.entityType, entityId: dto.entityId,
      newValue: { documentId: doc.id, name: doc.name }, ...meta,
    });
    return doc;
  }

  async listForEntity(user: AuthenticatedUser, entityType: EntityType, entityId: string) {
    const scope = this.require(user, 'read');
    const items = await this.prisma.document.findMany({
      where: {
        AND: [this.scopeWhere(user, scope), { links: { some: { entityType, entityId } } }],
      },
      include: { currentVersion: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const scope = this.require(user, 'read');
    const doc = await this.prisma.document.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: { currentVersion: true, links: true, versions: { orderBy: { versionNo: 'desc' } } },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');
    return doc;
  }

  async addVersion(user: AuthenticatedUser, id: string, dto: AddVersionDto, meta: RequestMeta) {
    const doc = await this.requireInScope(user, id, 'update');
    const last = await this.prisma.documentVersion.findFirst({
      where: { documentId: id }, orderBy: { versionNo: 'desc' },
    });
    const versionNo = (last?.versionNo ?? 0) + 1;
    const link = await this.prisma.documentLink.findFirst({ where: { documentId: id } });
    const storageKey = this.storage.generateKey(link?.entityType ?? 'company', link?.entityId ?? id, `${doc.name}-v${versionNo}`);
    const version = await this.prisma.documentVersion.create({
      data: { documentId: id, versionNo, storageKey, mimeType: dto.mimeType, fileSize: dto.fileSize, checksum: dto.checksum, createdBy: user.id },
    });
    await this.prisma.document.update({ where: { id }, data: { currentVersionId: version.id, status: 'uploaded', updatedBy: user.id } });
    await this.audit.record(user, { action: 'upload', entityId: id, newValue: { versionNo }, ...meta });
    const uploadUrl = await this.storage.getUploadUrl(storageKey);
    return { version, uploadUrl };
  }

  async verify(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    await this.requireInScope(user, id, 'verify');
    const doc = await this.prisma.document.update({
      where: { id }, data: { status: 'verified', verifiedBy: user.id, verifiedAt: new Date(), updatedBy: user.id },
    });
    await this.audit.record(user, { action: 'approve', entityId: id, newValue: { status: 'verified' }, ...meta });
    return doc;
  }

  /**
   * คืนข้อมูลไฟล์สำหรับ stream ผ่าน controller (ผ่านการเช็คสิทธิ์ + scope + บันทึก audit แล้ว)
   * ไฟล์เอกสาร "ไม่" เสิร์ฟแบบ static อีกต่อไป — ป้องกัน IDOR/ข้อมูลรั่ว
   */
  async getDownloadStream(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const doc = await this.prisma.document.findFirst({
      where: { AND: [this.scopeWhere(user, this.require(user, 'download')), { id }] },
      include: { currentVersion: true },
    });
    if (!doc?.currentVersion) throw new NotFoundException('ไม่พบไฟล์');
    await this.audit.record(user, { action: 'download', entityId: id, ...meta }); // ทุก download → audit (Phase 7)
    const stream = await this.storage.getObjectStream(doc.currentVersion.storageKey);
    return {
      stream,
      mimeType: doc.currentVersion.mimeType ?? 'application/octet-stream',
      fileName: doc.name,
    };
  }

  /**
   * Print (Document Lifecycle §Print) — บันทึกการสั่งพิมพ์เพื่อ audit trail
   * backend สั่งพิมพ์เองไม่ได้ แต่ frontend เรียก endpoint นี้ตอนกดพิมพ์ → ได้ trail ว่าใครพิมพ์เอกสารอ่อนไหวเมื่อไร
   */
  async print(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    await this.requireInScope(user, id, 'download'); // ต้องมีสิทธิ์เข้าถึงไฟล์ก่อนถึงพิมพ์ได้
    await this.audit.record(user, { action: 'print', entityId: id, ...meta });
    return { success: true };
  }

  /**
   * Archive (Document Lifecycle §Archive) — ปิดเอกสารเป็นสถานะ archived (ยังเก็บไว้ ไม่ลบ)
   */
  async archive(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const existing = await this.requireInScope(user, id, 'update');
    if (existing.status === 'archived') throw new ConflictException('เอกสารถูก archive แล้ว');
    const doc = await this.prisma.document.update({
      where: { id }, data: { status: 'archived', updatedBy: user.id },
    });
    await this.audit.record(user, { action: 'archive', entityId: id, oldValue: { status: existing.status }, newValue: { status: 'archived' }, ...meta });
    return doc;
  }

  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    await this.requireInScope(user, id, 'delete');
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
    await this.audit.record(user, { action: 'delete', entityId: id, ...meta });
    return { success: true };
  }

  private async requireInScope(user: AuthenticatedUser, id: string, action: string) {
    const scope = this.require(user, action);
    const doc = await this.prisma.document.findFirst({ where: { AND: [this.scopeWhere(user, scope), { id }] } });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');
    return doc;
  }
}
