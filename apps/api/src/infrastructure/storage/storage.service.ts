import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * StorageService — abstraction เหนือ Object Storage (MR-04)
 *
 * 2 ไดรเวอร์ เลือกด้วย env `STORAGE_DRIVER`:
 *   - local : เก็บไฟล์ในดิสก์ (apps/api/uploads) — dev/Postgres.app (default)
 *   - s3    : MinIO/S3/R2 ผ่าน AWS SDK v3 — production (durable + แยก domain)
 *
 * storageKey รูปแบบเดียวกันทั้ง 2 ไดรเวอร์ (เช่น "documents/<uuid>.pdf",
 * "properties/<uuid>.jpg") → สลับไดรเวอร์ได้โดยไม่ต้องแก้ DB/โค้ดอื่น
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 's3' | 'local';
  private readonly bucket: string;
  private readonly localBase: string;
  private readonly publicBase?: string; // base URL สาธารณะ (แยก domain) สำหรับรูปทรัพย์
  private readonly s3?: S3Client;

  constructor() {
    this.driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
    this.bucket = process.env.STORAGE_BUCKET ?? 'ros-files';
    this.localBase =
      process.env.STORAGE_LOCAL_DIR ?? join(__dirname, '..', '..', '..', 'uploads');
    this.publicBase = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, '');

    if (this.driver === 's3') {
      this.s3 = new S3Client({
        endpoint: process.env.S3_ENDPOINT, // MinIO เช่น http://minio:9000
        region: process.env.S3_REGION ?? 'us-east-1',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // MinIO ต้อง path-style
        credentials:
          process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
            ? {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY,
              }
            : undefined,
      });
      this.logger.log(`Storage driver = s3 (bucket=${this.bucket}, endpoint=${process.env.S3_ENDPOINT})`);
    } else {
      this.logger.log(`Storage driver = local (dir=${this.localBase})`);
    }
  }

  /** สร้าง storage key ที่ไม่ชนกัน (ผูกกับ entity) */
  generateKey(entityType: string, entityId: string, filename: string): string {
    const safe = filename.replace(/[^\w.\-]/g, '_');
    return `${entityType}/${entityId}/${randomUUID()}-${safe}`;
  }

  /** key สำหรับไฟล์ใน "หมวด" (documents/properties) แบบ flat (ชื่อ uuid) */
  keyFor(prefix: string, ext: string): string {
    const clean = ext.startsWith('.') ? ext : ext ? `.${ext}` : '';
    return `${prefix}/${randomUUID()}${clean}`;
  }

  /** บันทึกไฟล์ (buffer) — ใช้ทั้ง local และ s3 */
  async putObject(key: string, body: Buffer, contentType?: string): Promise<void> {
    if (this.driver === 's3') {
      await this.s3!.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
      );
      return;
    }
    const abs = this.localPath(key);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }

  /** อ่านไฟล์เป็น stream (สำหรับ download endpoint ที่เช็คสิทธิ์แล้ว) */
  async getObjectStream(key: string): Promise<Readable> {
    if (this.driver === 's3') {
      const res = await this.s3!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) throw new NotFoundException('ไฟล์ไม่พร้อมใช้งาน');
      return res.Body as Readable;
    }
    const abs = this.localPath(key);
    if (!existsSync(abs)) throw new NotFoundException('ไฟล์ไม่พร้อมใช้งาน');
    return createReadStream(abs);
  }

  /** ลบไฟล์ (best-effort — ไม่ throw ถ้าไม่มี) */
  async deleteObject(key: string): Promise<void> {
    try {
      if (this.driver === 's3') {
        await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } else {
        const abs = this.localPath(key);
        if (existsSync(abs)) rmSync(abs, { force: true });
      }
    } catch (e) {
      this.logger.warn(`deleteObject(${key}) ล้มเหลว: ${(e as Error).message}`);
    }
  }

  /** presigned URL สำหรับ download (s3) / path (local) */
  async getDownloadUrl(key: string, expiresSec = 900): Promise<string> {
    if (this.driver === 's3') {
      return getSignedUrl(this.s3!, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
        expiresIn: expiresSec,
      });
    }
    return `/uploads/${key}`;
  }

  /** presigned URL สำหรับ upload ตรงเข้า storage (s3) / placeholder (local) */
  async getUploadUrl(key: string, expiresSec = 900): Promise<string> {
    if (this.driver === 's3') {
      return getSignedUrl(this.s3!, new PutObjectCommand({ Bucket: this.bucket, Key: key }), {
        expiresIn: expiresSec,
      });
    }
    return `local:///uploads/${key}`;
  }

  /**
   * URL สาธารณะของไฟล์ (รูปทรัพย์ที่ตั้งใจโชว์บนเว็บ public)
   *   - s3 + STORAGE_PUBLIC_URL : เสิร์ฟจาก domain แยก (MinIO/CDN)
   *   - local : เสิร์ฟ static ที่ /uploads/<key> (พฤติกรรมเดิม)
   */
  publicUrl(key: string): string {
    if (this.driver === 's3' && this.publicBase) return `${this.publicBase}/${key}`;
    return `/uploads/${key}`;
  }

  isLocal(): boolean {
    return this.driver === 'local';
  }

  /** path ในดิสก์ + กัน path traversal (key เป็นค่าที่ server สร้างเอง แต่กันไว้อีกชั้น) */
  private localPath(key: string): string {
    const base = normalize(this.localBase);
    const abs = normalize(join(base, key));
    if (!abs.startsWith(base)) throw new NotFoundException('ไฟล์ไม่ถูกต้อง');
    return abs;
  }
}
