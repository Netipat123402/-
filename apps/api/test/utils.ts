import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * บูต Nest app สำหรับ e2e (โครงเดียวกับ main.ts: prefix + pipe + envelope)
 * ต้องตั้ง DATABASE_URL ไปยังฐานทดสอบ + รัน migrate/seed ก่อน (ดู scripts/e2e-db.sh)
 */
export async function createTestApp(): Promise<INestApplication> {
  // ให้ scheduler ไม่รันใน e2e
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  return app;
}

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@ros.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!2026',
};

/** login → access token (throw ถ้าไม่ได้) */
export async function login(
  http: ReturnType<typeof import('supertest')>,
  email: string,
  password: string,
): Promise<string> {
  const res = await http.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken as string;
}
