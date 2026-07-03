import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

async function streamToBuffer(s: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

describe('StorageService (local driver) — MR-04', () => {
  let dir: string;
  let StorageService: typeof import('./storage.service').StorageService;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ros-storage-'));
    process.env.STORAGE_DRIVER = 'local';
    process.env.STORAGE_LOCAL_DIR = dir;
    // require หลังตั้ง env (constructor อ่าน env)
    StorageService = require('./storage.service').StorageService;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_DIR;
    delete process.env.STORAGE_DRIVER;
  });

  it('keyFor สร้าง key แบบ prefix/uuid.ext', () => {
    const s = new StorageService();
    const k = s.keyFor('documents', '.pdf');
    expect(k).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
  });

  it('putObject แล้ว getObjectStream ได้ข้อมูลเดิม (roundtrip)', async () => {
    const s = new StorageService();
    const key = s.keyFor('documents', '.txt');
    const payload = Buffer.from('สวัสดี ROS MR-04', 'utf8');
    await s.putObject(key, payload, 'text/plain');
    const out = await streamToBuffer(await s.getObjectStream(key));
    expect(out.equals(payload)).toBe(true);
  });

  it('deleteObject ลบไฟล์แล้วอ่านไม่ได้', async () => {
    const s = new StorageService();
    const key = s.keyFor('properties', '.bin');
    await s.putObject(key, Buffer.from([1, 2, 3]));
    await s.deleteObject(key);
    await expect(s.getObjectStream(key)).rejects.toThrow();
  });

  it('กัน path traversal (key ออกนอก base)', async () => {
    const s = new StorageService();
    await expect(s.putObject('../evil.txt', Buffer.from('x'))).rejects.toThrow();
  });

  it('isLocal()=true และ publicUrl คืน /uploads/<key>', () => {
    const s = new StorageService();
    expect(s.isLocal()).toBe(true);
    expect(s.publicUrl('properties/a.jpg')).toBe('/uploads/properties/a.jpg');
  });
});
