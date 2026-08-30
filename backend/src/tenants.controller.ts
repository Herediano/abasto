import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('tenants')
export class TenantsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list() { return this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } }); }

  @Get(':id')
  get(@Param('id') id: string) { return this.prisma.tenant.findUniqueOrThrow({ where: { id } }); }

  @Post()
  create(@Body() body: { name?: string; legalName?: string; taxId?: string }) {
    if (!body.name?.trim()) throw new BadRequestException('name es obligatorio');
    return this.prisma.tenant.create({ data: { name: body.name.trim(), legalName: body.legalName, taxId: body.taxId } });
  }
}
