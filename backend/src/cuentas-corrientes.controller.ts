import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

@Controller('customers/:customerId/account')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CuentasCorrientesController {
  constructor(@Inject(CuentasCorrientesService) private readonly cuentas: CuentasCorrientesService) {}

  @Get() @RequirePermission('clientes.ver') get(@Req() request: AuthRequest, @Param('customerId') customerId: string) {
    return this.cuentas.account(request.user.tenantId, customerId);
  }

  @Post('payments') @RequirePermission('clientes.cobrar') payment(@Req() request: AuthRequest, @Param('customerId') customerId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerPayment(request.user, customerId, body);
  }

  @Post('adjustments') @RequirePermission('clientes.ajustar_cuenta') adjustment(@Req() request: AuthRequest, @Param('customerId') customerId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerAdjustment(request.user, customerId, body);
  }
}
