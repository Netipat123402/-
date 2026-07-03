/**
 * Sentry error tracking (MR-03) — เปิด/ปิดด้วย env `SENTRY_DSN`
 * ไม่ตั้ง DSN = no-op (dev ไม่ต้องมี Sentry)
 */
import * as Sentry from '@sentry/node';

let enabled = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** ส่ง error เข้า Sentry พร้อม tag (เช่น request_id) — no-op ถ้าไม่ได้เปิด */
export function captureError(
  err: unknown,
  tags?: Record<string, string | null | undefined>,
): void {
  if (!enabled) return;
  const cleanTags: Record<string, string> = {};
  for (const [k, v] of Object.entries(tags ?? {})) {
    if (v != null) cleanTags[k] = String(v);
  }
  Sentry.captureException(err, { tags: cleanTags });
}
