/**
 * บันทึก HTTP metrics ทุก request (MR-03)
 * - latency histogram + request counter (ราย method/route/status)
 * - ใช้ route "pattern" (เช่น /api/v1/properties/:id) ไม่ใช่ URL จริง — กัน label cardinality ระเบิด
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { httpRequestDuration, httpRequestsTotal } from './metrics';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    const record = (statusOverride?: number): void => {
      const routePattern =
        ((req.baseUrl ?? '') + (req.route?.path ?? '')) || req.path || 'unknown';
      const status = String(statusOverride ?? res.statusCode);
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      httpRequestDuration.labels(req.method, routePattern, status).observe(seconds);
      httpRequestsTotal.labels(req.method, routePattern, status).inc();
    };

    return next.handle().pipe(
      tap({
        next: () => record(),
        error: (err: { status?: number }) => record(err?.status ?? 500),
      }),
    );
  }
}
