import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { TrailModule } from './common/trail/trail.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { RevalidationModule } from './common/revalidation/revalidation.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { PropertyRequestModule } from './modules/property-request/property-request.module';
import { OwnerModule } from './modules/owner/owner.module';
import { LeadModule } from './modules/lead/lead.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { ContractModule } from './modules/contract/contract.module';
import { DocumentModule } from './modules/document/document.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PublicModule } from './modules/public/public.module';
import { UserModule } from './modules/user/user.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AuditModule } from './modules/audit/audit.module';
import { SearchModule } from './modules/search/search.module';
import { CommunityModule } from './modules/community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Rate limiting (Phase 4 §5) — default 300/นาที/IP (internal); public override ต่อ route
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    StorageModule,
    ObservabilityModule,
    TrailModule,
    CryptoModule,
    RevalidationModule,
    // --- Domain modules ---
    HealthModule,
    IdentityModule,
    AuthModule,
    PropertyModule,
    PropertyRequestModule,
    OwnerModule,
    LeadModule,
    AppointmentModule,
    ContractModule,
    DocumentModule,
    NotificationModule,
    PublicModule,
    UserModule,
    SettingsModule,
    CustomerModule,
    AuditModule,
    SearchModule,
    CommunityModule,
    SchedulerModule,
  ],
  providers: [
    // Global guards (เรียงลำดับ: rate limit → ยืนยันตัวตน → ตรวจสิทธิ์)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
