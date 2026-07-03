import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global — ทุก module เรียกใช้ PrismaService ได้โดยไม่ต้อง import ซ้ำ
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
