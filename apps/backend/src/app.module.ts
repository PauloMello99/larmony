import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { AppCacheModule } from "./common/cache/cache.module";
import { RlsInterceptor } from "./common/interceptors/rls.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuditModule } from "./modules/audit/audit.module";
import { InternalCronModule } from "./modules/internal-cron/internal-cron.module";
import { TelemetryModule } from "./common/telemetry/telemetry.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelemetryModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AppCacheModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    OrganizationsModule,
    NotificationsModule,
    AdminModule,
    AuditModule,
    InternalCronModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
