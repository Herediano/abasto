import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { PurchasesService } from './purchases.service';
import { RequirePermission } from './require-permission.decorator';
import { sendExport } from './export.util';

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', confirmed: 'Confirmada', corrected: 'Corregida', cancelled: 'Anulada' };

@Controller('purchases/invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchases: PurchasesService) {}

  @Get() @RequirePermission('compras.ver')
  list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.purchases.list(request.user.tenantId, request.user.branchWarehouseIds, query);
  }

  @Get('export') @RequirePermission('compras.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query() query: Record<string, string | undefined>) {
    const rows = await this.purchases.exportRows(request.user.tenantId, request.user.branchWarehouseIds, query);
    await sendExport(
      res,
      query.format,
      'compras',
      [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Proveedor', key: 'proveedor', width: 28 },
        { header: 'Comprobante', key: 'comprobante', width: 20 },
        { header: 'Subtotal', key: 'subtotal', width: 14 },
        { header: 'IVA', key: 'iva', width: 14 },
        { header: 'Total', key: 'total', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      rows.map(r => ({
        fecha: r.issueDate.toLocaleDateString('es-AR'),
        proveedor: r.supplier?.name ?? '—',
        comprobante: `${r.invoiceType} ${r.pointOfSale}-${r.invoiceNumber}`,
        subtotal: Number(r.subtotal),
        iva: Number(r.taxTotal),
        total: Number(r.total),
        estado: STATUS_LABEL[r.status] ?? r.status,
      })),
    );
  }

  @Post() @RequirePermission('compras.crear') create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) { return this.purchases.createDraft(request.user, body); }
  @Post(':id/confirm') @RequirePermission('compras.crear') confirm(@Req() request: AuthRequest, @Param('id') id: string) { return this.purchases.confirm(request.user.tenantId, request.user.id, id); }
  @Post(':id/complete-invoice') @RequirePermission('compras.crear') completeInvoice(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.purchases.completeInvoice(request.user.tenantId, id, body); }
  @Post(':id/correct') @RequirePermission('compras.corregir') correct(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.purchases.correct(request.user, id, body); }
  @Post(':id/cancel') @RequirePermission('compras.anular') cancel(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.purchases.cancel(request.user, id, body); }
}
