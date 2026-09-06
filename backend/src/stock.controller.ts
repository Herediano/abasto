import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { StockService } from './stock.service';
import { MovementInput } from './stock.types';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { sendExport } from './export.util';

@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Post('in') @RequirePermission('stock.mover') createIn(@Req() request: AuthRequest, @Body() body: MovementInput) { return this.stock.createIn(request.user.tenantId, body); }
  @Post('out') @RequirePermission('stock.mover') createOut(@Req() request: AuthRequest, @Body() body: MovementInput) { return this.stock.createOut(request.user.tenantId, body); }
  @Get() @RequirePermission('stock.ver') all(@Req() request: AuthRequest) { return this.stock.currentAll(request.user.tenantId); }

  @Get('export')
  @RequirePermission('stock.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query('format') format?: string) {
    const { items } = await this.stock.currentAll(request.user.tenantId);
    await sendExport(
      res,
      format,
      'stock',
      [
        { header: 'Producto', key: 'productName', width: 42 },
        { header: 'Depósito', key: 'warehouseName', width: 20 },
        { header: 'Lote', key: 'lotNumber', width: 16 },
        { header: 'Vencimiento', key: 'expirationDate', width: 14, numFmt: 'dd/mm/yyyy' },
        { header: 'Proveedor', key: 'supplierName', width: 24 },
        { header: 'Stock', key: 'quantity', width: 12, numFmt: '#,##0.###' },
      ],
      items.map(i => ({
        productName: i.productName,
        warehouseName: i.warehouseName,
        lotNumber: i.lotNumber ?? '',
        expirationDate: i.expirationDate ? new Date(i.expirationDate) : '',
        supplierName: i.supplierName ?? '',
        quantity: Number(i.quantity),
      })),
    );
  }
  @Get('products/:productId') @RequirePermission('stock.ver') current(@Req() request: AuthRequest, @Param('productId') productId: string, @Query('warehouseId') warehouseId?: string, @Query('productLotId') productLotId?: string) { return this.stock.current(request.user.tenantId, productId, warehouseId, productLotId); }
  @Get('movements') @RequirePermission('stock.ver') history(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) { return this.stock.history(request.user.tenantId, query); }
}
