/**
 * Observability (MR-03) — /metrics endpoint + global metrics interceptor
 * Sentry + JSON logger ถูก init ใน main.ts (bootstrap) เพราะต้องทำงานก่อน app สร้าง
 */
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
})
export class ObservabilityModule {}
