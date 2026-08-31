import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { TenantsController } from './tenants.controller';
import { ProductsController } from './products.controller';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { WarehousesController } from './warehouses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, TenantsController, ProductsController, StockController, WarehousesController],
  providers: [StockService],
})
export class AppModule {}
