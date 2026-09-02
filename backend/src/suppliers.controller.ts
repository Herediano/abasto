import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get() list(@Req() request: AuthRequest) { return this.prisma.supplier.findMany({ where: { tenantId: request.user.tenantId, isActive: true }, orderBy: { name: 'asc' } }); }
  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('name es obligatorio');
    try { return await this.prisma.supplier.create({ data: { tenantId: request.user.tenantId, name, legalName: typeof body.legalName === 'string' ? body.legalName.trim() : undefined, taxId: typeof body.taxId === 'string' ? body.taxId.trim() : undefined, email: typeof body.email === 'string' ? body.email.trim() : undefined, phone: typeof body.phone === 'string' ? body.phone.trim() : undefined, address: typeof body.address === 'string' ? body.address.trim() : undefined } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El proveedor ya existe'); throw error; }
  }
  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('name es obligatorio');
    try { return await this.prisma.supplier.updateMany({ where: { id, tenantId: request.user.tenantId, isActive: true }, data: { name, legalName: typeof body.legalName === 'string' ? body.legalName.trim() : null, taxId: typeof body.taxId === 'string' ? body.taxId.trim() : null, email: typeof body.email === 'string' ? body.email.trim() : null, phone: typeof body.phone === 'string' ? body.phone.trim() : null, address: typeof body.address === 'string' ? body.address.trim() : null } }).then(async result => { if (!result.count) throw new BadRequestException('Proveedor no encontrado'); return this.prisma.supplier.findFirstOrThrow({ where: { id, tenantId: request.user.tenantId } }); }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El proveedor ya existe'); throw error; }
  }
}
