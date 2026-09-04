import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

@Controller('customers/:customerId/account')
@UseGuards(JwtAuthGuard)
export class CuentasCorrientesController {
  constructor(@Inject(CuentasCorrientesService) private readonly cuentas: CuentasCorrientesService) {}

  @Get() get(@Req() request: AuthRequest, @Param('customerId') customerId: string) {
    return this.cuentas.account(request.user.tenantId, customerId);
  }

  @Post('payments') payment(@Req() request: AuthRequest, @Param('customerId') customerId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerPayment(request.user, customerId, body);
  }

  @Post('adjustments') @UseGuards(AdminGuard) adjustment(@Req() request: AuthRequest, @Param('customerId') customerId: string, @Body() body: Record<string, unknown>) {
    return this.cuentas.registerAdjustment(request.user, customerId, body);
  }
}
