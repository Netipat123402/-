import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * CryptoService (Phase 7 §5) — เข้ารหัส PII ที่ application layer
 *
 * ใช้กับฟิลด์อ่อนไหว เช่น idCardNo (เลขบัตรประชาชน) ก่อนเก็บลง DB
 * อัลกอริทึม: AES-256-GCM (authenticated encryption — กันทั้งความลับและการแก้ไข)
 *
 * รูปแบบ ciphertext: `enc:v1:<ivHex>:<tagHex>:<cipherHex>`
 *   - prefix `enc:v1:` ใช้แยกข้อมูลที่เข้ารหัสแล้ว ออกจากข้อมูลเดิม (legacy plaintext)
 *   - decrypt() จะคืนค่าเดิมหากเจอ legacy plaintext (ไม่มี prefix) — รองรับ migrate ค่อยเป็นค่อยไป
 *
 * คีย์: env PII_ENCRYPTION_KEY (hex 64 ตัว = 32 ไบต์)
 *   - dev: ถ้าไม่ตั้ง จะ derive จากค่า dev คงที่ (ใช้ทดสอบเท่านั้น)
 *   - prod: env.validation บังคับให้ตั้งคีย์จริง (fail fast ตอนบูต)
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  private static readonly PREFIX = 'enc:v1:';

  constructor(private readonly config: ConfigService) {
    this.key = this.resolveKey();
  }

  private resolveKey(): Buffer {
    const raw = this.config.get<string>('PII_ENCRYPTION_KEY');
    if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    // MR-17: dev-key fallback ใช้ได้เฉพาะ development/test เท่านั้น
    // นอกเหนือจากนั้น (staging/production) ห้าม derive จากค่าคงที่ → โยน error
    // (env.validation บล็อก boot ของ staging/production ที่ไม่ตั้ง key อยู่แล้ว — นี่เป็น defense-in-depth)
    const env = this.config.get<string>('NODE_ENV') ?? 'development';
    if (env !== 'development' && env !== 'test') {
      throw new Error(
        `PII_ENCRYPTION_KEY ไม่ถูกตั้ง/ผิดรูปแบบใน NODE_ENV=${env} — ต้องตั้ง hex 64 ตัว (openssl rand -hex 32)`,
      );
    }
    this.logger.warn(
      'PII_ENCRYPTION_KEY ไม่ถูกตั้ง/ผิดรูปแบบ — ใช้คีย์ dev (ห้ามใช้นอก development/test)',
    );
    return createHash('sha256').update('ros_dev_pii_key_change_me').digest();
  }

  /** เข้ารหัสค่า (คืน null ถ้า input ว่าง — เพื่อให้คอลัมน์ optional ยังเป็น null ได้) */
  encrypt(plain: string | null | undefined): string | null {
    if (plain == null || plain === '') return null;
    const iv = randomBytes(12); // GCM nonce 96-bit
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${CryptoService.PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  /**
   * ถอดรหัสค่า
   * - null/ว่าง → null
   * - legacy plaintext (ไม่มี prefix) → คืนค่าเดิม (รองรับข้อมูลก่อนเปิดใช้การเข้ารหัส)
   * - ciphertext → ถอดรหัส; ถ้า tag ไม่ผ่าน (ถูกแก้/คีย์ผิด) → โยน error
   */
  decrypt(stored: string | null | undefined): string | null {
    if (stored == null || stored === '') return null;
    if (!stored.startsWith(CryptoService.PREFIX)) return stored; // legacy plaintext
    const body = stored.slice(CryptoService.PREFIX.length);
    const [ivHex, tagHex, dataHex] = body.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new InternalServerErrorException('ciphertext PII เสียหาย');
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const dec = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]);
      return dec.toString('utf8');
    } catch {
      throw new InternalServerErrorException('ถอดรหัส PII ไม่สำเร็จ');
    }
  }

  /**
   * mask สำหรับแสดงผล — เปิดเฉพาะ 4 ตัวท้าย (เช่น เลขบัตร 13 หลัก → x-xxxx-xxxxx-12-3 → •••• 1234)
   * รับได้ทั้ง ciphertext และ plaintext (ถอดให้ก่อนถ้าจำเป็น)
   */
  mask(stored: string | null | undefined): string | null {
    const plain = this.decrypt(stored);
    if (!plain) return null;
    const digits = plain.replace(/\D/g, '');
    const tail = (digits || plain).slice(-4);
    return `••••••••${tail}`;
  }
}
