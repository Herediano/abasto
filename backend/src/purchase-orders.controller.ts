import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchaseOrdersController {
  constructor(@Inject(PurchaseOrdersService) private readonly orders: PurchaseOrdersService) {}

  @Get() @RequirePermission('compras.ver')
  list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.orders.list(request.user.tenantId, request.user.branchWarehouseIds, query);
  }

  @Post() @RequirePermission('compras.crear')
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.orders.create(request.user, body);
  }

  @Post(':id/receive') @RequirePermission('compras.crear')
  receive(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.markReceived(request.user.tenantId, id);
  }

  @Post(':id/cancel') @RequirePermission('compras.crear')
  cancel(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.cancel(request.user.tenantId, id);
  }
}
