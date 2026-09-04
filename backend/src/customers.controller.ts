import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

/**
 * El modelo Customer existía desde el principio pero nunca tuvo pantalla. Se
 * suma acá porque los precios por cliente se resuelven asignándole una lista, y
 * además es prerrequisito del módulo de ventas.
 */
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async parse(tenantId: string, body: Record<string, unknown>, actual?: { priceListId: string | null; creditLimit: Prisma.Decimal | null }) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const priceListId = body.priceListId === null || body.priceListId === ''
      ? null
      : typeof body.priceListId === 'string' ? body.priceListId : actual?.priceListId ?? null;
    if (priceListId && !(await this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId } }))) {
      throw new BadRequestException('Lista de precios no encontrada');
    }
    const texto = (campo: unknown) => (typeof campo === 'string' && campo.trim() ? campo.trim() : null);
    // Sin límite (no se manda el campo o llega vacío) es crédito sin tope
    // explícito; 0 bloquea la venta a cuenta corriente.
    const creditLimit = body.creditLimit === null || body.creditLimit === ''
      ? null
      : body.creditLimit === undefined ? (actual?.creditLimit !== null && actual?.creditLimit !== undefined ? Number(actual.creditLimit) : null) : Number(body.creditLimit);
    if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) throw new BadRequestException('El límite de crédito no puede ser negativo');
    return {
      name,
      legalName: texto(body.legalName),
      taxId: texto(body.taxId),
      email: texto(body.email),
      phone: texto(body.phone),
      address: texto(body.address),
      priceListId,
      creditLimit,
    };
  }

  @Get()
  async list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(query.status === 'inactive' ? { isActive: false } : query.status === 'all' ? {} : { isActive: true }),
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { taxId: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
    const clientes = await this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    // La lista se resuelve aparte: Customer no tiene relacion declarada hacia
    // PriceList para no forzar una FK sobre datos que ya existian sin ella.
    const listas = await this.prisma.priceList.findMany({ where: { tenantId }, select: { id: true, name: true } });
    const porId = new Map(listas.map(l => [l.id, l.name]));
    return clientes.map(c => ({ ...c, priceListName: c.priceListId ? porId.get(c.priceListId) ?? null : null }));
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    return this.prisma.customer.create({ data: { tenantId, ...(await this.parse(tenantId, body)) } });
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const actual = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!actual) throw new BadRequestException('Cliente no encontrado');
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(await this.parse(tenantId, body, actual)),
        isActive: typeof body.isActive === 'boolean' ? body.isActive : actual.isActive,
      },
    });
  }
}
