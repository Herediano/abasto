import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { PurchasesService } from './purchases.service';
import { RequirePermission } from './require-permission.decorator';

@Controller('purchases/invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchases: PurchasesService) {}
  @Get() @RequirePermission('compras.ver') list(@Req() request: AuthRequest) { return this.purchases.list(request.user.tenantId); }
  @Post() @RequirePermission('compras.crear') create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) { return this.purchases.createDraft(request.user, body); }
  @Post(':id/confirm') @RequirePermission('compras.crear') confirm(@Req() request: AuthRequest, @Param('id') id: string) { return this.purchases.confirm(request.user.tenantId, id); }
  @Post(':id/correct') @RequirePermission('compras.corregir') correct(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.purchases.correct(request.user, id, body); }
  @Post(':id/cancel') @RequirePermission('compras.anular') cancel(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.purchases.cancel(request.user, id, body); }
}
