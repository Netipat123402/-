import 'reflect-metadata';

// ให้ BigInt (เช่น fileSize) serialize เป็นตัวเลขใน JSON ได้ (กัน 500 ตอนคืน document)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { initSentry } from './common/observability/sentry';
import { JsonLogger } from './common/observability/json-logger';

async function bootstrap(): Promise<void> {
  // MR-03: error tracking — init ก่อนสร้าง app (no-op ถ้าไม่ตั้ง SENTRY_DSN)
  initSentry();

  // MR-03: log เป็น JSON เมื่อ LOG_FORMAT=json (default ใน production) → log aggregation parse ได้
  const useJson =
    (process.env.LOG_FORMAT ?? (process.env.NODE_ENV === 'production' ? 'json' : 'pretty')) === 'json';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    ...(useJson ? { logger: new JsonLogger() } : {}),
  });
  const logger = new Logger('Bootstrap');

  // Trust reverse proxy (MR-07) — อยู่หลัง Caddy/Nginx ที่ terminate TLS
  // ให้ req.ip = client จริงจาก X-Forwarded-For (สำคัญต่อ audit IP + throttle/lockout ราย IP)
  // ค่า: จำนวน hop (เช่น 1) หรือ true; default = 1 hop ใน production
  const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '');
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true');
  }

  // HTTP security headers (MR-15) — helmet
  // - frameguard deny: กัน clickjacking · noSniff/HSTS: ค่า default ของ helmet
  // - CSP: ปิดที่ API (คืน JSON) → จัดการ CSP ที่ web apps (Next headers) แทน
  // - crossOriginResourcePolicy=cross-origin: ให้ web-public โหลดรูปทรัพย์จาก origin :4000 ได้
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
    }),
  );

  // อ่าน cookie (refresh token — Phase 7 §3)
  app.use(cookieParser());

  // เสิร์ฟไฟล์ที่อัปโหลด — apps/api/uploads
  // หมายเหตุ: dev เก็บในเครื่อง; production ย้ายเป็น MinIO/S3 (Phase 10)
  const uploadsDir = join(__dirname, '..', 'uploads');
  mkdirSync(join(uploadsDir, 'properties'), { recursive: true });
  mkdirSync(join(uploadsDir, 'documents'), { recursive: true });
  // เสิร์ฟ "เฉพาะรูปทรัพย์" แบบสาธารณะ (ตั้งใจให้โชว์บนเว็บ public)
  // เอกสาร (บัตร/สัญญา/ใบเสร็จ) ห้ามเสิร์ฟ static — ต้องผ่าน GET /documents/:id/download
  // ที่เช็คสิทธิ์ + scope + บันทึก audit เท่านั้น (กันข้อมูลรั่ว)
  app.useStaticAssets(join(uploadsDir, 'properties'), {
    prefix: '/uploads/properties/',
    // MR-09: กันเบราว์เซอร์ sniff ไฟล์เป็น HTML/script (รูปจริงไม่ถูกตีความเป็นอย่างอื่น)
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  // API prefix + versioning (Phase 4 §7)
  app.setGlobalPrefix('api/v1');

  // Validation กลาง (Phase 4 §4) — whitelist กัน mass-assignment
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Error envelope + response envelope กลาง (Phase 4 §6 / §1.4)
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS (Phase 7 / MR-32)
  // - production: เฉพาะ origin ใน allowlist (CORS_ORIGINS)
  // - dev: allowlist + localhost + private-LAN IP (มือถือทดสอบผ่าน WiFi) — ไม่ reflect-any (กัน evil.com)
  const isProd = process.env.NODE_ENV === 'production';
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // localhost + RFC1918 (192.168/10/172.16-31) ทุกพอร์ต — เฉพาะ dev
  const devLanRe = /^https?:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/;
  app.enableCors({
    origin: (origin, cb) => {
      // ไม่มี Origin (เช่น curl/health/same-origin) → อนุญาต
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      if (!isProd && devLanRe.test(origin)) return cb(null, true);
      return cb(null, false); // นอก allowlist → ไม่ใส่ ACAO (เบราว์เซอร์บล็อกเอง)
    },
    credentials: true,
  });

  // Graceful shutdown (MR-05) — SIGTERM/SIGINT → onModuleDestroy ทั่วระบบ
  // (PrismaService.$disconnect + SchedulerService clearInterval) → กัน connection leak/งานค้าง
  // จำเป็นต่อ zero-downtime rolling deploy (Docker/compose ส่ง SIGTERM ตอน stop)
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`🚀 ROS API running on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start ROS API:', err);
  process.exit(1);
});
