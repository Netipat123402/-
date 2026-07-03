import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * RevalidationService — สั่ง web-public ล้าง cache ทันทีเมื่อทรัพย์ขึ้น/ลงเว็บ
 * (approve / change-status / sync จากสัญญา / แก้ไข / เปลี่ยนรูป)
 * best-effort: ถ้า web-public ปิด/ยิงไม่ถึง แค่ log ไม่ทำให้ business op พัง
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly config: ConfigService) {}

  /** ล้าง cache รายการทรัพย์สาธารณะ (+ หน้า detail ของ code ถ้าระบุ) */
  revalidatePublicProperties(code?: string): void {
    const url = this.config.get<string>('WEB_PUBLIC_REVALIDATE_URL') || 'http://localhost:3000/api/revalidate';
    const secret = this.config.get<string>('REVALIDATE_SECRET') || 'dev_revalidate_secret';
    const body = JSON.stringify({ tag: 'public-properties', ...(code ? { path: `/properties/${code}` } : {}) });
    // fire-and-forget — ไม่ await ใน business flow
    void (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
          body,
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) this.logger.warn(`revalidate web-public ตอบ ${res.status}`);
      } catch (e) {
        this.logger.warn(`revalidate web-public ไม่สำเร็จ: ${(e as Error).message}`);
      }
    })();
  }
}
