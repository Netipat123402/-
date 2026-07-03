import { validateEnv } from './env.validation';

// env ที่ผ่านเกณฑ์ production ครบ (ใช้เป็นฐาน แล้วปรับให้ผิดทีละตัว)
const prodBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/ros?schema=public',
  CORS_ORIGINS: 'https://rent.example.com,https://app.example.com',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  COOKIE_SECURE: 'true',
  PII_ENCRYPTION_KEY: 'f'.repeat(64),
  REVALIDATE_SECRET: 'super-secret-revalidate',
};

describe('validateEnv (MR-16/MR-17 prod hardening)', () => {
  it('production env ครบถ้วน → ผ่าน', () => {
    expect(() => validateEnv({ ...prodBase })).not.toThrow();
  });

  it('MR-16: production + REVALIDATE_SECRET เป็น default → ไม่บูต', () => {
    expect(() => validateEnv({ ...prodBase, REVALIDATE_SECRET: 'dev_revalidate_secret' })).toThrow(/REVALIDATE_SECRET/);
  });

  it('MR-16: production ไม่ตั้ง REVALIDATE_SECRET (ใช้ default) → ไม่บูต', () => {
    const { REVALIDATE_SECRET, ...noSecret } = prodBase;
    expect(() => validateEnv(noSecret)).toThrow(/REVALIDATE_SECRET/);
  });

  it('production + PII key ไม่ใช่ hex64 → ไม่บูต', () => {
    expect(() => validateEnv({ ...prodBase, PII_ENCRYPTION_KEY: 'short' })).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it('MR-17: staging ไม่ตั้ง PII_ENCRYPTION_KEY → ไม่บูต', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging', DATABASE_URL: 'postgresql://db/ros' })).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it('MR-17: staging + PII key ครบ → ผ่าน (staging ไม่บังคับ CORS/COOKIE แบบ prod)', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging', DATABASE_URL: 'postgresql://db/ros', PII_ENCRYPTION_KEY: 'a'.repeat(64) })).not.toThrow();
  });

  it('development ใช้ default ได้ (ไม่ throw)', () => {
    expect(() => validateEnv({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://localhost:5432/ros' })).not.toThrow();
  });

  it('STORAGE_DRIVER=s3 แต่ไม่ตั้ง endpoint/creds → ไม่บูต (ทุก env)', () => {
    expect(() => validateEnv({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://localhost/ros', STORAGE_DRIVER: 's3' })).toThrow(/S3_/);
  });
});
