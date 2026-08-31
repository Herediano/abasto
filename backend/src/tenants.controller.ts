import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() request: AuthRequest) { return this.prisma.tenant.findMany({ where: { id: request.user.tenantId } }); }

  @Get(':id')
  get(@Req() request: AuthRequest, @Param('id') id: string) { if (id !== request.user.tenantId) throw new NotFoundException('Tenant no encontrado'); return this.prisma.tenant.findUniqueOrThrow({ where: { id } }); }

  @Post()
  create(@Body() body: { name?: string; legalName?: string; taxId?: string }) {
    if (!body.name?.trim()) throw new BadRequestException('name es obligatorio');
    return this.prisma.tenant.create({ data: { name: body.name.trim(), legalName: body.legalName, taxId: body.taxId } });
  }
}
