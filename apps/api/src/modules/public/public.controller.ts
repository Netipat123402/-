import {
  Body, Controller, Get, HttpCode, Param, Post, Query, Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PublicService } from './public.service';
import { PublicLeadDto, PublicSearchDto } from './dto/public.dto';
import { Public } from '../../common/auth/decorators';

/**
 * Public API (Phase 2/5) — ไม่มี auth, surface เล็ก, ป้องกันด้วย rate limit
 * prefix: /api/v1/public
 */
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  // ค้นหา — 60 ครั้ง/นาที/IP (Phase 4 §5: กัน scraping)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('properties')
  search(@Query() query: PublicSearchDto) {
    return this.service.search(query);
  }

  @Get('properties/:code')
  detail(@Param('code') code: string) {
    return this.service.getByCode(code);
  }

  // MR-13: นับยอดเข้าชม แยกจาก read ที่ถูก ISR cache — client เรียกตอนเปิดหน้า detail
  // throttle กันสแปม/บอท; 204 No Content (fire-and-forget)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(204)
  @Post('properties/:code/view')
  recordView(@Param('code') code: string) {
    return this.service.recordView(code);
  }

  // ทรัพย์ใกล้เคียง (ranking by similarity) — ใต้หน้า detail
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('properties/:code/similar')
  similar(@Param('code') code: string) {
    return this.service.similar(code);
  }

  @Get('master-data')
  masterData() {
    return this.service.masterData();
  }

  // ฟอร์มนัด — จำกัดเข้มกัน spam/bot (Phase 4 §5: 5 ครั้ง/นาที/IP)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('leads')
  @HttpCode(201)
  createLead(@Body() dto: PublicLeadDto, @Req() req: Request) {
    return this.service.createLead(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  @HttpCode(201)
  contact(@Body() dto: PublicLeadDto, @Req() req: Request) {
    return this.service.createLead(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
