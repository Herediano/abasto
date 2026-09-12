import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { TenantsController } from './tenants.controller';
import { ProductsController } from './products.controller';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { WarehousesController } from './warehouses.controller';
import { BranchesController } from './branches.controller';
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
import { PriceActivationService } from './price-activation.service';
import { CashRegistersController, CashShiftsController } from './caja.controller';
import { CajaService } from './caja.service';
import { CuentasCorrientesController } from './cuentas-corrientes.controller';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { RangosController } from './rangos.controller';
import { RangosService } from './rangos.service';
import { PermissionGuard } from './permission.guard';
import { EscritorioController } from './escritorio.controller';
import { ReportesController } from './reportes.controller';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { TasksController } from './tasks.controller';
import { BootstrapService } from './bootstrap.service';
import { SuppliersAccountController } from './suppliers-account.controller';
import { SuppliersAccountService } from './suppliers-account.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { SupplierNotesController } from './supplier-notes.controller';
import { SupplierNotesService } from './supplier-notes.service';
import { PaymentCardsController } from './payment-cards.controller';
import { PaymentCardsService } from './payment-cards.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [HealthController, TenantsController, ProductsController, StockController, WarehousesController, BranchesController, SuppliersController, CategoriesController, ProductReferenceController, AuthController, UsersController, PurchasesController, PricesController, PriceListsController, PriceRulesController, PromotionsController, CustomersController, SalesController, CashRegistersController, CashShiftsController, CuentasCorrientesController, SuppliersAccountController, PurchaseOrdersController, RangosController, EscritorioController, ReportesController, CreditNotesController, TasksController, SupplierNotesController, PaymentCardsController],
  providers: [
    StockService, AuthService, JwtAuthGuard, PermissionGuard, PurchasesService, PriceActivationService, PricesService, SalesService,
    CajaService, CuentasCorrientesService, SuppliersAccountService, PurchaseOrdersService, RangosService, BootstrapService, CreditNotesService,
    SupplierNotesService, PaymentCardsService,
  ],
})
export class AppModule {}
