import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { PurchasesService } from './purchases.service';

@Controller('purchases/invoices')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchases: PurchasesService) {}
  @Get() list(@Req() request: AuthRequest) { return this.purchases.list(request.user.tenantId); }
  @Post() create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) { return this.purchases.createDraft(request.user, body); }
  @Post(':id/confirm') confirm(@Req() request: AuthRequest, @Param('id') id: string) { return this.purchases.confirm(request.user.tenantId, id); }
}
