import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CategoriesController } from './categories.controller';
import { ProductReferenceController } from './product-reference.controller';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PricesController } from './prices.controller';
import { PriceListsController } from './price-lists.controller';
import { PriceRulesController } from './price-rules.controller';
import { PromotionsController } from './promotions.controller';
import { CustomersController } from './customers.controller';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PricesService } from './prices.service';
import { AdminGuard } from './admin.guard';
import { PriceActivationService } from './price-activation.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [HealthController, TenantsController, ProductsController, StockController, WarehousesController, SuppliersController, CategoriesController, ProductReferenceController, AuthController, UsersController, PurchasesController, PricesController, PriceListsController, PriceRulesController, PromotionsController, CustomersController, SalesController],
  providers: [StockService, AuthService, JwtAuthGuard, PurchasesService, AdminGuard, PriceActivationService, PricesService, SalesService],
})
export class AppModule {}
