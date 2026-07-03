import { z } from 'zod';

/**
 * ตรวจ environment variables ตอนบูต (fail fast ถ้าตั้งค่าผิด)
 * Phase 4: validation | Phase 7: secrets ผ่าน env
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // JWT (Phase 7 §2/§3) — dev ใช้ HS256+secret; prod เปลี่ยนเป็น RS256 ได้ (config-only)
  JWT_ACCESS_SECRET: z.string().min(16).default('dev_access_secret_change_me_please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev_refresh_secret_change_me_please'),
  JWT_ACCESS_TTL: z.string().default('900s'), // 15 นาที
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // PII encryption (Phase 7 §5) — AES-256-GCM key = hex 64 ตัว (32 ไบต์)
  // dev: เว้นได้ (CryptoService ใช้คีย์ dev) | prod: บังคับ (superRefine ด้านล่าง)
  PII_ENCRYPTION_KEY: z.string().optional(),

  // On-demand revalidation → web-public (ทรัพย์ขึ้น/ลงเว็บทันที)
  WEB_PUBLIC_REVALIDATE_URL: z.string().default('http://localhost:3000/api/revalidate'),
  REVALIDATE_SECRET: z.string().default('dev_revalidate_secret'),

  // Observability (MR-03) — ทั้งหมด optional, ไม่ตั้ง = ปิดฟีเจอร์นั้น
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(), // default: json ใน prod, pretty ที่อื่น
  SENTRY_DSN: z.string().optional(),                 // ไม่ตั้ง = ปิด error tracking
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  METRICS_TOKEN: z.string().optional(),              // ตั้ง = /metrics ต้องใส่ Bearer token

  // Storage (MR-04) — local (default, dev) | s3 (MinIO/S3/R2, prod)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().default('ros-files'),
  STORAGE_LOCAL_DIR: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),   // base URL สาธารณะของรูปทรัพย์ (แยก domain)
  S3_ENDPOINT: z.string().optional(),          // MinIO เช่น http://minio:9000
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),
})
  .superRefine((cfg, ctx) => {
    // storage driver=s3 ต้องตั้ง endpoint/credential/bucket ครบ (ทุก NODE_ENV — MR-04)
    if (cfg.STORAGE_DRIVER === 's3') {
      for (const k of ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
        if (!cfg[k]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: `STORAGE_DRIVER=s3 ต้องตั้ง ${k}` });
      }
    }

    // MR-17: PII_ENCRYPTION_KEY บังคับทั้ง staging + production (ห้าม dev-key นอก development)
    if (cfg.NODE_ENV === 'production' || cfg.NODE_ENV === 'staging') {
      if (!cfg.PII_ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(cfg.PII_ENCRYPTION_KEY)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PII_ENCRYPTION_KEY'], message: `${cfg.NODE_ENV} ต้องตั้ง PII_ENCRYPTION_KEY เป็น hex 64 ตัว (32 ไบต์) — openssl rand -hex 32` });
      }
    }

    // production ต้องไม่ใช้ secret/ตั้งค่าเริ่มต้นที่ไม่ปลอดภัย (fail fast ตอนบูต)
    if (cfg.NODE_ENV !== 'production') return;
    const weak = (s: string) => !s || s.includes('change_me') || s.startsWith('dev_');
    if (weak(cfg.JWT_ACCESS_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_ACCESS_SECRET'], message: 'production ต้องตั้ง JWT_ACCESS_SECRET เป็นค่าลับจริง (ห้ามใช้ค่า default)' });
    }
    if (weak(cfg.JWT_REFRESH_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_REFRESH_SECRET'], message: 'production ต้องตั้ง JWT_REFRESH_SECRET เป็นค่าลับจริง (ห้ามใช้ค่า default)' });
    }
    if (weak(cfg.REVALIDATE_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['REVALIDATE_SECRET'], message: 'production ต้องตั้ง REVALIDATE_SECRET เป็นค่าลับจริง (ห้ามใช้ค่า default) — MR-16' });
    }
    if (cfg.CORS_ORIGINS.includes('localhost')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CORS_ORIGINS'], message: 'production ไม่ควรอนุญาต localhost ใน CORS_ORIGINS' });
    }
    if (!cfg.COOKIE_SECURE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['COOKIE_SECURE'], message: 'production ต้องตั้ง COOKIE_SECURE=true' });
    }
    // PII_ENCRYPTION_KEY ตรวจไปแล้วในบล็อก staging+production ด้านบน (MR-17)
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
