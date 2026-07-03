/**
 * GET /api/v1/metrics — Prometheus exposition (MR-03)
 * - default Node + HTTP + security counters (registry)
 * - ผนวก Prisma DB-pool/query metrics ($metrics.prometheus(), preview feature)
 * - ป้องกันด้วย bearer `METRICS_TOKEN` ถ้าตั้งไว้ (production ควรตั้ง หรือจำกัดที่ reverse proxy — MR-07)
 */
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { registry } from './metrics';

// Prisma metrics preview: $metrics.prometheus() — พิมพ์ type หลวม ๆ กันผูกกับ generated type
type PrismaWithMetrics = {
  $metrics?: { prometheus?: () => Promise<string> };
};

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async scrape(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = process.env.METRICS_TOKEN;
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'metrics token required' } });
      return;
    }

    let body = await registry.metrics();
    try {
      const prismaMetrics = await (this.prisma as unknown as PrismaWithMetrics).$metrics?.prometheus?.();
      if (prismaMetrics) body += '\n' + prismaMetrics;
    } catch {
      // metrics preview ไม่พร้อม — ข้าม (ยังคืน registry metrics ปกติ)
    }

    res.setHeader('Content-Type', registry.contentType);
    res.send(body);
  }
}
