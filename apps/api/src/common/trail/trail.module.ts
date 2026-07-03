import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ActivityService } from './activity.service';

/**
 * Global — audit + activity log ใช้ได้ทุก module (cross-cutting)
 */
@Global()
@Module({
  providers: [AuditService, ActivityService],
  exports: [AuditService, ActivityService],
})
export class TrailModule {}
