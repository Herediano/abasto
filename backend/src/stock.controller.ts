import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { MovementInput } from './stock.types';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Post('in') createIn(@Req() request: AuthRequest, @Body() body: MovementInput) { return this.stock.createIn(request.user.tenantId, body); }
  @Post('out') createOut(@Req() request: AuthRequest, @Body() body: MovementInput) { return this.stock.createOut(request.user.tenantId, body); }
  @Get() all(@Req() request: AuthRequest) { return this.stock.currentAll(request.user.tenantId); }
  @Get('products/:productId') current(@Req() request: AuthRequest, @Param('productId') productId: string, @Query('warehouseId') warehouseId?: string, @Query('productLotId') productLotId?: string) { return this.stock.current(request.user.tenantId, productId, warehouseId, productLotId); }
  @Get('products/:productId/movements') history(@Req() request: AuthRequest, @Param('productId') productId: string, @Query() query: Record<string, string | undefined>) { return this.stock.history(request.user.tenantId, productId, query); }
}
