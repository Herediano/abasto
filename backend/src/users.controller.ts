import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.user.findMany({
      where: { tenantId: request.user.tenantId },
      select: { id: true, name: true, email: true, role: true, isActive: true, warehouseId: true, warehouse: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.createUser(request.user.tenantId, body);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Usuario no encontrado');

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name;
    const role = body.role === 'admin' || body.role === 'user' ? body.role : current.role;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : current.isActive;
    const warehouseId = body.warehouseId === null ? null : typeof body.warehouseId === 'string' && body.warehouseId ? body.warehouseId : current.warehouseId;

    if (warehouseId && !(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } }))) throw new BadRequestException('Depósito no encontrado');

    const losesAdmin = current.role === 'admin' && (role !== 'admin' || !isActive);
    if (losesAdmin) {
      const remainingAdmins = await this.prisma.user.count({ where: { tenantId, role: 'admin', isActive: true, id: { not: id } } });
      if (remainingAdmins === 0) throw new ConflictException('Debe quedar al menos un administrador activo en el tenant');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { name, role, isActive, warehouseId } });
    return { id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive, warehouseId: updated.warehouseId };
  }
}
