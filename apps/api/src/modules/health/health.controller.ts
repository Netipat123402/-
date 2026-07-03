import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Public } from '../../common/auth/decorators';

/**
 * Health check (Phase 10 §10 — monitoring)
 *   GET /health     → liveness (API ตื่นอยู่)
 *   GET /health/db  → readiness (ต่อฐานข้อมูลได้)
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return {
      status: 'ok',
      service: 'ros-api',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async readiness() {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'postgresql',
      latency_ms: Date.now() - start,
    };
  }
}
