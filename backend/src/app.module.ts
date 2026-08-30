import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { TenantsController } from './tenants.controller';
import { ProductsController } from './products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, TenantsController, ProductsController],
})
export class AppModule {}
