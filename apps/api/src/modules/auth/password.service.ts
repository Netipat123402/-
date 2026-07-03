import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * PasswordService (Phase 7 §5)
 * ใช้ scrypt (built-in, memory-hard) — รูปแบบ: scrypt$<saltHex>$<hashHex>
 * สอดคล้องกับ hash ที่ seed สร้าง (db/seed/seed.ts)
 *
 * หมายเหตุ: ดีไซน์ระบุ Argon2id เป็นเป้าหมาย production —
 *   service นี้แยก interface ไว้ สลับเป็น argon2 ได้โดยไม่กระทบที่เรียกใช้
 */
@Injectable()
export class PasswordService {
  private readonly keyLen = 64;

  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = (await scryptAsync(plain, salt, this.keyLen)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const derived = (await scryptAsync(plain, salt, expected.length)) as Buffer;

    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }
}
