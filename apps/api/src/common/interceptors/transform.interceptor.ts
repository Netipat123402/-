import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response envelope กลาง (Phase 4 §1.4)
 *   single : { data, meta:{ request_id } }
 *   list   : controller คืน { items, page, ... } → meta รวม pagination
 *
 * ถ้า controller คืน object ที่มี key 'items' จะถือเป็น paginated
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? null;

    return next.handle().pipe(
      map((payload) => {
        // ไฟล์ stream (เช่น ดาวน์โหลดเอกสาร) ต้องไม่ถูกห่อด้วย envelope — ปล่อยให้ Nest stream ตรง ๆ
        if (payload instanceof StreamableFile) return payload;
        if (
          payload &&
          typeof payload === 'object' &&
          'items' in (payload as Record<string, unknown>)
        ) {
          const { items, ...meta } = payload as Record<string, unknown>;
          return { data: items, meta: { ...meta, request_id: requestId } };
        }
        return { data: payload ?? null, meta: { request_id: requestId } };
      }),
    );
  }
}
