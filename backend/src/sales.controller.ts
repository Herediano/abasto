import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { SalesService } from './sales.service';
import { PrismaService } from './prisma/prisma.service';
import { sendExport } from './export.util';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente', mixed: 'Varios medios' };

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalesController {
  constructor(
    @Inject(SalesService) private readonly sales: SalesService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get() @RequirePermission('ventas.ver') list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.sales.list(request.user, query);
  }

  @Get('export')
  @RequirePermission('ventas.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const search = query.search?.trim();
    const searchNumber = search ? Number.parseInt(search.replace(/^0+/, ''), 10) : NaN;
    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(request.user.branchWarehouseIds ? { warehouseId: { in: request.user.branchWarehouseIds } } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
        ...(query.from || query.to
          ? { occurredAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59`) } : {}) } }
          : {}),
        ...(search
          ? {
              OR: [
                ...(Number.isFinite(searchNumber) ? [{ number: searchNumber }] : []),
                { customer: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: { customer: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 10000,
    });
    await sendExport(
      res,
      query.format,
      'ventas',
      [
        { header: 'Comprobante', key: 'comprobante', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Cliente', key: 'cliente', width: 28 },
        { header: 'Vendedor', key: 'vendedor', width: 20 },
        { header: 'Pago', key: 'pago', width: 16 },
        { header: 'Subtotal', key: 'subtotal', width: 14, numFmt: '#,##0.00' },
        { header: 'IVA', key: 'iva', width: 14, numFmt: '#,##0.00' },
        { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      rows.map(s => ({
        comprobante: `${s.pointOfSale}-${String(s.number).padStart(8, '0')}`,
        fecha: s.occurredAt.toLocaleString('es-AR'),
        cliente: s.customer?.name ?? 'Consumidor final',
        vendedor: s.user.name,
        pago: PAGOS[s.paymentMethod] ?? s.paymentMethod,
        subtotal: Number(s.subtotal),
        iva: Number(s.taxTotal),
        total: Number(s.total),
        estado: s.status === 'cancelled' ? 'Anulada' : 'Confirmada',
      })),
    );
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
