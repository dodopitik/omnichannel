import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [DatabaseModule, MarketplaceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
