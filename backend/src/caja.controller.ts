import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { CajaService } from './caja.service';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CashRegistersController {
  constructor(@Inject(CajaService) private readonly caja: CajaService) {}

  @Get() @RequirePermission('caja.operar') list(@Req() request: AuthRequest, @Query('warehouseId') warehouseId?: string) {
    return this.caja.listRegisters(request.user.tenantId, warehouseId);
  }

  @Post() @RequirePermission('caja.administrar') create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.caja.createRegister(request.user.tenantId, body);
  }
}

@Controller('cash-shifts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CashShiftsController {
  constructor(@Inject(CajaService) private readonly caja: CajaService) {}

  /** Historial de turnos: sólo quien puede ver todas las cajas de la sucursal. */
  @Get() @RequirePermission('caja.ver_todas') list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.caja.list(request.user.tenantId, query);
  }

  /** El turno abierto del usuario que consulta, o null. Lo primero que pregunta la pantalla de caja. */
  @Get('current') @RequirePermission('caja.operar') current(@Req() request: AuthRequest) {
    return this.caja.current(request.user);
  }

  @Post('open') @RequirePermission('caja.operar') open(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.caja.open(request.user, body);
  }

  @Get(':id') @RequirePermission('caja.operar') detail(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.caja.detail(request.user, id);
  }

  @Post(':id/movements') @RequirePermission('caja.operar') addMovement(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.caja.addMovement(request.user, id, body);
  }

  @Post(':id/close') @RequirePermission('caja.operar') close(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.caja.close(request.user, id, body);
  }
}
