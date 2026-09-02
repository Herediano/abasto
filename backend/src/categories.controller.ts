import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.category.findMany({ where: { tenantId: request.user.tenantId }, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('name es obligatorio');
    try { return await this.prisma.category.create({ data: { tenantId: request.user.tenantId, name } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('La categoría ya existe'); throw error; }
  }
}
