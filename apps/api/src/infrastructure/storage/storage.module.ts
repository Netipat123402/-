import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Global (MR-04) — document/property/contract ใช้ StorageService ตัวเดียวกัน
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
