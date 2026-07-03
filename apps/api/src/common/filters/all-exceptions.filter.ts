import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { captureError } from '../observability/sentry';
import { unhandledErrorsTotal } from '../observability/metrics';

/**
 * Error envelope กลาง (Phase 4 §6)
 * - รูปแบบเดียวกันทุก error
 * - ไม่รั่ว stack trace ออก client (500)
 * - แนบ request_id เพื่อ debug
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'เกิดข้อผิดพลาดภายในระบบ';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      code = this.codeFromStatus(status);
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        message = (r.message as string) ?? message;
        if (Array.isArray(r.message)) {
          message = 'ข้อมูลไม่ถูกต้อง';
          details = r.message;
        }
        if (r.code) code = String(r.code);
        if (r.details) details = r.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // แปลง Prisma error เป็น HTTP status ที่ถูกต้อง (เดิมหลุดเป็น 500)
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND; code = 'NOT_FOUND'; message = 'ไม่พบข้อมูลที่ต้องการ';
      } else if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT; code = 'CONFLICT'; message = 'ข้อมูลซ้ำกับที่มีอยู่ในระบบ';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST; code = 'BAD_REQUEST'; message = 'ข้อมูลอ้างอิงไม่ถูกต้อง';
      }
    }

    // log ภายใน (500 = error เต็ม, อื่น ๆ = warn)
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // MR-03: นับ 5xx + ส่งเข้า Sentry พร้อม request_id (no-op ถ้าไม่ได้ตั้ง SENTRY_DSN)
      unhandledErrorsTotal.labels(code).inc();
      captureError(exception, { request_id: requestId, path: req.url, method: req.method });
    } else {
      this.logger.warn(`[${requestId}] ${req.method} ${req.url} → ${status} ${code}`);
    }

    res.status(status).json({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
    };
    return map[status] ?? 'ERROR';
  }
}
