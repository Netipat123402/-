import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

// StorageService มาจาก StorageModule (@Global) — ไม่ต้อง provide ซ้ำ (MR-04)
@Module({
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
