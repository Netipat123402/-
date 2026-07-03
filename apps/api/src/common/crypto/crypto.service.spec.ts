import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

function makeService(key?: string): CryptoService {
  const config = {
    get: (k: string) => (k === 'PII_ENCRYPTION_KEY' ? key : undefined),
  } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  const KEY = 'a'.repeat(64); // 32 ไบต์ hex
  let svc: CryptoService;

  beforeEach(() => {
    svc = makeService(KEY);
  });

  it('encrypt → decrypt คืนค่าเดิม (roundtrip)', () => {
    const id = '1234567890123';
    const enc = svc.encrypt(id);
    expect(enc).not.toBeNull();
    expect(enc!.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain(id); // ต้องไม่เห็น plaintext ใน ciphertext
    expect(svc.decrypt(enc)).toBe(id);
  });

  it('ciphertext ต่างกันทุกครั้ง (IV สุ่ม) แต่ถอดได้ค่าเดิม', () => {
    const a = svc.encrypt('secret');
    const b = svc.encrypt('secret');
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe('secret');
    expect(svc.decrypt(b)).toBe('secret');
  });

  it('null/ว่าง → null ทั้ง encrypt และ decrypt', () => {
    expect(svc.encrypt(null)).toBeNull();
    expect(svc.encrypt('')).toBeNull();
    expect(svc.encrypt(undefined)).toBeNull();
    expect(svc.decrypt(null)).toBeNull();
    expect(svc.decrypt('')).toBeNull();
  });

  it('legacy plaintext (ไม่มี prefix) → decrypt คืนค่าเดิม (รองรับ migrate)', () => {
    expect(svc.decrypt('9999999999999')).toBe('9999999999999');
  });

  it('ถอดรหัสด้วยคีย์ผิด → โยน error (authenticated encryption)', () => {
    const enc = svc.encrypt('topsecret');
    const other = makeService('b'.repeat(64));
    expect(() => other.decrypt(enc)).toThrow();
  });

  it('ciphertext ที่ถูกแก้ (tamper) → โยน error', () => {
    const enc = svc.encrypt('1111111111111')!;
    // สลับตัวอักษรท้ายของ cipher body
    const tampered = enc.slice(0, -1) + (enc.endsWith('a') ? 'b' : 'a');
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('mask เปิดเฉพาะ 4 ตัวท้าย ไม่หลุดเลขเต็ม', () => {
    const enc = svc.encrypt('1234567890123');
    const masked = svc.mask(enc)!;
    expect(masked).toContain('0123');
    expect(masked).not.toContain('1234567890123');
    expect(masked.startsWith('•')).toBe(true);
  });

  it('mask รับ plaintext ได้ด้วย (legacy)', () => {
    expect(svc.mask('1234567890123')).toContain('0123');
    expect(svc.mask(null)).toBeNull();
  });
});
