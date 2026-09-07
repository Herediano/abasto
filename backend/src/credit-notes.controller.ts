import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { CreditNotesService } from './credit-notes.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CreditNotesController {
  constructor(@Inject(CreditNotesService) private readonly notes: CreditNotesService) {}

  @Get('sales/:saleId/credit-notes') @RequirePermission('ventas.ver')
  listForSale(@Req() request: AuthRequest, @Param('saleId') saleId: string) {
    return this.notes.listForSale(request.user.tenantId, saleId);
  }

  @Post('sales/:saleId/credit-notes') @RequirePermission('ventas.devolver')
  create(@Req() request: AuthRequest, @Param('saleId') saleId: string, @Body() body: Record<string, unknown>) {
    return this.notes.create(request.user, saleId, body);
  }

  @Get('credit-notes') @RequirePermission('ventas.ver')
  list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.notes.list(request.user.tenantId, query, request.user.branchWarehouseIds);
  }

  @Get('credit-notes/:id') @RequirePermission('ventas.ver')
  get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.notes.get(request.user.tenantId, id);
  }
}
