import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/**
 * Global — CryptoService ใช้เข้ารหัส/ถอดรหัส PII ได้ทุก module (cross-cutting)
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
