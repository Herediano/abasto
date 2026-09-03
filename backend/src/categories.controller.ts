import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // El @@unique es sensible a mayusculas y no recorta espacios, asi que "Bebidas",
  // "bebidas" y "Bebidas " podian convivir. Se normaliza y se chequea a mano.
  private async assertNameFree(tenantId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    if (clash) throw new ConflictException('Ya existe una categoría con ese nombre');
  }

  @Get()
  async list(@Req() request: AuthRequest) {
    const rows = await this.prisma.category.findMany({
      where: { tenantId: request.user.tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('name es obligatorio');
    await this.assertNameFree(tenantId, name);
    try {
      return await this.prisma.category.create({ data: { tenantId, name } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('La categoría ya existe');
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async rename(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Categoría no encontrada');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('name es obligatorio');
    await this.assertNameFree(tenantId, name, id);
    try {
      return await this.prisma.category.update({ where: { id }, data: { name } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('La categoría ya existe');
      throw error;
    }
  }

  // Al borrar, los productos quedan sin categoria. Si se pasa ?reassignTo, se
  // mueven a esa categoria en su lugar (sirve tambien para fusionar dos).
  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Req() request: AuthRequest, @Param('id') id: string, @Query('reassignTo') reassignTo?: string) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Categoría no encontrada');

    let target: string | null = null;
    if (reassignTo) {
      if (reassignTo === id) throw new BadRequestException('No se puede reasignar los productos a la misma categoría que se elimina');
      const dest = await this.prisma.category.findFirst({ where: { id: reassignTo, tenantId } });
      if (!dest) throw new BadRequestException('Categoría de destino no encontrada');
      target = reassignTo;
    }

    const [{ count }] = await this.prisma.$transaction([
      this.prisma.product.updateMany({ where: { tenantId, categoryId: id }, data: { categoryId: target } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { deleted: true, reassignedProducts: count, reassignedTo: target };
  }
}
