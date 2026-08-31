import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { TenantsController } from './tenants.controller';
import { ProductsController } from './products.controller';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { WarehousesController } from './warehouses.controller';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { SuppliersController } from './suppliers.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, TenantsController, ProductsController, StockController, WarehousesController, SuppliersController, AuthController, UsersController],
  providers: [StockService, AuthService, JwtAuthGuard],
})
export class AppModule {}
