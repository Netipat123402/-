import { sniffMime, assertAllowedFileType, isDangerousInline } from './file-type';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const GIF = Buffer.from('GIF89a');
const PDF = Buffer.from('%PDF-1.7\n...');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML = Buffer.from('<!DOCTYPE html><html><body>x</body></html>');

describe('sniffMime (MR-09)', () => {
  it('ตรวจ binary image/pdf จาก magic bytes', () => {
    expect(sniffMime(PNG)).toBe('image/png');
    expect(sniffMime(JPEG)).toBe('image/jpeg');
    expect(sniffMime(GIF)).toBe('image/gif');
    expect(sniffMime(PDF)).toBe('application/pdf');
  });
  it('SVG/HTML → null (ไม่ใช่ไฟล์ binary ที่อนุญาต)', () => {
    expect(sniffMime(SVG)).toBeNull();
    expect(sniffMime(HTML)).toBeNull();
  });
});

describe('assertAllowedFileType (MR-09)', () => {
  it('รับรูปจริง', () => {
    expect(assertAllowedFileType(PNG, ['image'])).toBe('image/png');
    expect(assertAllowedFileType(PDF, ['image', 'pdf'])).toBe('application/pdf');
  });
  it('ปฏิเสธ SVG/HTML ปลอมเป็นรูป (Stored XSS)', () => {
    expect(() => assertAllowedFileType(SVG, ['image'])).toThrow();
    expect(() => assertAllowedFileType(HTML, ['image', 'pdf'])).toThrow();
  });
  it('PDF ไม่ผ่านเมื่ออนุญาตเฉพาะ image', () => {
    expect(() => assertAllowedFileType(PDF, ['image'])).toThrow();
  });
});

describe('isDangerousInline (MR-21)', () => {
  it('html/svg/xml = อันตราย → attachment', () => {
    expect(isDangerousInline('text/html')).toBe(true);
    expect(isDangerousInline('image/svg+xml')).toBe(true);
    expect(isDangerousInline('application/xml')).toBe(true);
  });
  it('image/pdf = inline ได้', () => {
    expect(isDangerousInline('image/png')).toBe(false);
    expect(isDangerousInline('application/pdf')).toBe(false);
  });
});
