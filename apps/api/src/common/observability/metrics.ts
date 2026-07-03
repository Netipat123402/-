/**
 * Prometheus metrics registry (MR-03)
 * - default Node metrics (mem/cpu/event-loop/gc)
 * - HTTP req count + latency (ราย method/route/status)
 * - security counters: login_failed, token_reuse (ไว้ตั้ง alert spike)
 * Prisma DB-pool/query metrics ผนวกใน MetricsController ผ่าน $metrics.prometheus()
 *
 * เป็น module-level singletons (registry เดียวทั้งแอป) — interceptor/filter/controller
 * import ตัวเดียวกัน ไม่ต้องผ่าน DI
 */
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ app: 'ros-api' });
collectDefaultMetrics({ register: registry, prefix: 'ros_' });

export const httpRequestDuration = new Histogram({
  name: 'ros_http_request_duration_seconds',
  help: 'HTTP request latency (seconds)',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'ros_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const loginFailedTotal = new Counter({
  name: 'ros_login_failed_total',
  help: 'Failed login attempts (ตั้ง alert เมื่อพุ่งผิดปกติ = brute force)',
  registers: [registry],
});

export const tokenReuseTotal = new Counter({
  name: 'ros_token_reuse_total',
  help: 'Refresh-token reuse detections (ตั้ง alert ทันที = token ถูกขโมย)',
  registers: [registry],
});

export const unhandledErrorsTotal = new Counter({
  name: 'ros_unhandled_errors_total',
  help: 'Server errors (5xx) ที่หลุดถึง exception filter',
  labelNames: ['code'] as const,
  registers: [registry],
});
