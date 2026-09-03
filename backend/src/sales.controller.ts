import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(@Inject(SalesService) private readonly sales: SalesService) {}

  @Get() list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.sales.list(request.user.tenantId, query);
  }

  /** Cotiza el carrito sin guardarlo. */
  @Post('quote') quote(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.sales.quote(request.user.tenantId, body);
  }

  @Post() create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.sales.create(request.user, body);
  }

  @Get(':id') get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.sales.get(request.user.tenantId, id);
  }

  @Post(':id/cancel') @UseGuards(AdminGuard) cancel(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.sales.cancel(request.user, id, body);
  }
}
