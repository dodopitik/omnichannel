import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { mailConfig } from './config/mail.config';
import { storageConfig } from './config/storage.config';
import { shopeeConfig } from './config/shopee.config';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { QueueModule } from './infrastructure/queue/queue.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [
    // ─── Configuration ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, mailConfig, storageConfig, shopeeConfig],
      cache: true,
    }),

    // ─── Rate Limiting ──────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // ─── Task Scheduling ────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Event Emitter ──────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),

    // ─── Infrastructure ─────────────────────────────────────────────
    DatabaseModule,
    RedisModule,
    MailModule,
    QueueModule,

    // ─── Feature Modules ────────────────────────────────────────────
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    HealthModule,
    MarketplaceModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
  ],
})
export class AppModule {}
