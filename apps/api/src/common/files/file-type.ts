import { BadRequestException } from '@nestjs/common';

/**
 * ตรวจชนิดไฟล์จาก "magic bytes" จริง (MR-09) — ไม่เชื่อ mimetype/นามสกุลที่ client ส่งมา
 * ปิดช่องอัป SVG/HTML ปลอมเป็นรูป → Stored XSS
 */
export type AllowedKind = 'image' | 'pdf';

/** คืน mime ที่ตรวจได้จาก signature, หรือ null ถ้าไม่รู้จัก/อันตราย */
export function sniffMime(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;

  // รูปภาพ (binary signatures)
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'; // GIF8
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';

  // PDF: %PDF-
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';

  return null; // รวมถึง SVG/HTML/XML (เริ่มด้วย '<') และไฟล์ข้อความอื่น ๆ
}

const KIND_MIMES: Record<AllowedKind, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  pdf: ['application/pdf'],
};

/**
 * บังคับว่า buffer ตรงกับชนิดที่อนุญาตจริง — ไม่งั้นโยน 400
 * @returns mime ที่ตรวจได้ (เชื่อถือได้) เพื่อเก็บแทน mimetype จาก client
 */
export function assertAllowedFileType(buf: Buffer, kinds: AllowedKind[]): string {
  const detected = sniffMime(buf);
  const allowed = kinds.flatMap((k) => KIND_MIMES[k]);
  if (!detected || !allowed.includes(detected)) {
    const label = kinds.includes('pdf') ? 'รูปภาพ (JPG/PNG/GIF/WEBP) หรือ PDF' : 'รูปภาพ (JPG/PNG/GIF/WEBP)';
    throw new BadRequestException(`ไฟล์ไม่ถูกต้องหรือไม่ปลอดภัย — รับเฉพาะ ${label} (ตรวจจากเนื้อไฟล์จริง)`);
  }
  return detected;
}

/** ชนิดที่ "render ได้และอันตราย" → ต้องบังคับดาวน์โหลดเป็น attachment (MR-09/MR-21) */
export function isDangerousInline(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m.includes('html') || m.includes('svg') || m.includes('xml') ||
    m.includes('javascript') || m.includes('xhtml')
  );
}
