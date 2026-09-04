import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { CajaService } from './caja.service';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard)
export class CashRegistersController {
  constructor(@Inject(CajaService) private readonly caja: CajaService) {}

  @Get() list(@Req() request: AuthRequest, @Query('warehouseId') warehouseId?: string) {
    return this.caja.listRegisters(request.user.tenantId, warehouseId);
  }

  @Post() @UseGuards(AdminGuard) create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.caja.createRegister(request.user.tenantId, body);
  }
}

@Controller('cash-shifts')
@UseGuards(JwtAuthGuard)
export class CashShiftsController {
  constructor(@Inject(CajaService) private readonly caja: CajaService) {}

  /** Historial de turnos: sólo un supervisor necesita ver todas las cajas. */
  @Get() @UseGuards(AdminGuard) list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.caja.list(request.user.tenantId, query);
  }

  /** El turno abierto del usuario que consulta, o null. Lo primero que pregunta la pantalla de caja. */
  @Get('current') current(@Req() request: AuthRequest) {
    return this.caja.current(request.user);
  }

  @Post('open') open(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.caja.open(request.user, body);
  }

  @Get(':id') detail(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.caja.detail(request.user, id);
  }

  @Post(':id/movements') addMovement(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.caja.addMovement(request.user, id, body);
  }

  @Post(':id/close') close(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.caja.close(request.user, id, body);
  }
}
