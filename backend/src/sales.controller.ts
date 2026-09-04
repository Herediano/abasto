import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalesController {
  constructor(@Inject(SalesService) private readonly sales: SalesService) {}

  @Get() @RequirePermission('ventas.ver') list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.sales.list(request.user, query);
  }

  /** Cotiza el carrito sin guardarlo. */
  @Post('quote') @RequirePermission('caja.operar') quote(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.sales.quote(request.user.tenantId, body);
  }

  @Post() @RequirePermission('caja.operar') create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.sales.create(request.user, body);
  }

  @Get(':id') @RequirePermission('ventas.ver') get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.sales.get(request.user.tenantId, id);
  }

  @Post(':id/cancel') @RequirePermission('ventas.anular') cancel(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.sales.cancel(request.user, id, body);
  }
}
