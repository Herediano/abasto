import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { MovementInput } from './stock.types';

@Controller('stock')
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  private tenantId(headers: Record<string, string | string[] | undefined>) {
    const value = headers['x-tenant-id'];
    const id = Array.isArray(value) ? value[0] : value;
    if (!id) throw new BadRequestException('Falta el header x-tenant-id');
    return id;
  }

  @Post('in') createIn(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: MovementInput) { return this.stock.createIn(this.tenantId(headers), body); }
  @Post('out') createOut(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: MovementInput) { return this.stock.createOut(this.tenantId(headers), body); }
  @Get('products/:productId') current(@Headers() headers: Record<string, string | string[] | undefined>, @Param('productId') productId: string, @Query('warehouseId') warehouseId?: string, @Query('productLotId') productLotId?: string) { return this.stock.current(this.tenantId(headers), productId, warehouseId, productLotId); }
  @Get('products/:productId/movements') history(@Headers() headers: Record<string, string | string[] | undefined>, @Param('productId') productId: string, @Query() query: Record<string, string | undefined>) { return this.stock.history(this.tenantId(headers), productId, query); }
}
