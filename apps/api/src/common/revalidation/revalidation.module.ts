import { Global, Module } from '@nestjs/common';
import { RevalidationService } from './revalidation.service';

/** Global — โมดูลอื่นเรียก revalidatePublicProperties() ได้ (cross-cutting) */
@Global()
@Module({
  providers: [RevalidationService],
  exports: [RevalidationService],
})
export class RevalidationModule {}
