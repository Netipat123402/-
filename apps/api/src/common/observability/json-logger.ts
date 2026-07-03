/**
 * JSON logger (MR-03) — log เป็น 1 บรรทัด/1 JSON เพื่อให้ log aggregation (Loki/ELK) parse ได้
 * เปิดเมื่อ LOG_FORMAT=json (ค่า default ใน production) — ไม่งั้นใช้ logger ปกติของ Nest
 */
import type { LoggerService } from '@nestjs/common';

type Level = 'info' | 'warn' | 'error' | 'debug' | 'verbose';

export class JsonLogger implements LoggerService {
  private emit(level: Level, message: unknown, context?: string, stack?: string): void {
    const line = {
      time: new Date().toISOString(),
      level,
      context: context ?? undefined,
      message:
        typeof message === 'string' ? message : safeStringify(message),
      ...(stack ? { stack } : {}),
    };
    const out = JSON.stringify(line) + '\n';
    if (level === 'error') process.stderr.write(out);
    else process.stdout.write(out);
  }

  log(message: unknown, context?: string): void {
    this.emit('info', message, context);
  }
  error(message: unknown, stack?: string, context?: string): void {
    this.emit('error', message, context, stack);
  }
  warn(message: unknown, context?: string): void {
    this.emit('warn', message, context);
  }
  debug(message: unknown, context?: string): void {
    this.emit('debug', message, context);
  }
  verbose(message: unknown, context?: string): void {
    this.emit('verbose', message, context);
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
