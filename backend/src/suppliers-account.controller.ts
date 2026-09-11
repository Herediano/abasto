import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { SuppliersAccountService } from './suppliers-account.service';

@Controller('suppliers/:supplierId/account')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SuppliersAccountController {
  constructor(@Inject(SuppliersAccountService) private readonly cuentas: SuppliersAccountService) {}

  @Get() @RequirePermission('proveedores.ver') get(@Req() request: AuthRequest, @Param('supplierId') supplierId: string) {
    return this.cuentas.account(request.user.tenantId, supplierId);
  }

  @Post('payments') @RequirePermission('compras.crear') payment(@Req() request: AuthRequest, @Param('supplierId') supplierId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerPayment(request.user, supplierId, body);
  }

  @Post('adjustments') @RequirePermission('compras.corregir') adjustment(@Req() request: AuthRequest, @Param('supplierId') supplierId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerAdjustment(request.user, supplierId, body);
  }
}
