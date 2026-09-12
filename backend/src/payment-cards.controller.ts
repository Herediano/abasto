import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { PaymentCardsService } from './payment-cards.service';

@Controller('payment-cards')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentCardsController {
  constructor(@Inject(PaymentCardsService) private readonly cards: PaymentCardsService) {}

  // Cualquiera que pueda operar la caja necesita ver la lista para elegir al cobrar.
  @Get() @RequirePermission('caja.operar')
  list(@Req() request: AuthRequest, @Query('activeOnly') activeOnly?: string) {
    return this.cards.list(request.user.tenantId, activeOnly !== '0');
  }

  @Post() @RequirePermission('caja.administrar')
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.cards.create(request.user.tenantId, body);
  }

  @Put(':id') @RequirePermission('caja.administrar')
  update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cards.update(request.user.tenantId, id, body);
  }
}
