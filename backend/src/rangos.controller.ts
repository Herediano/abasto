import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { RangosService } from './rangos.service';

@Controller('rangos')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RangosController {
  constructor(@Inject(RangosService) private readonly rangos: RangosService) {}

  @Get('catalogo') catalog() {
    return this.rangos.catalog();
  }

  @Get() @RequirePermission('rangos.ver') list(@Req() request: AuthRequest) {
    return this.rangos.list(request.user.tenantId);
  }

  @Get(':id') @RequirePermission('rangos.ver') get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.rangos.get(request.user.tenantId, id);
  }

  @Post() @RequirePermission('rangos.gestionar') create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.rangos.create(request.user.tenantId, body);
  }

  @Put(':id') @RequirePermission('rangos.gestionar') update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.rangos.update(request.user.tenantId, id, body);
  }

  @Delete(':id') @RequirePermission('rangos.gestionar') remove(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.rangos.remove(request.user.tenantId, id);
  }
}
