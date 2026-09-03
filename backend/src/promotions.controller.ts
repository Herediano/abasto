import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

const TIPOS = ['nxm', 'a_plus_b', 'percent', 'amount', 'special_price'] as const;
const SCOPES = ['all', 'category', 'brand'];

type Tipo = (typeof TIPOS)[number];

function entero(value: unknown, campo: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new UnprocessableEntityException(`${campo} debe ser un número entero mayor a cero`);
  return n;
}

function monto(value: unknown, campo: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new UnprocessableEntityException(`${campo} debe ser un número mayor a cero`);
  return n;
}

/**
 * Cada tipo de promoción tiene sus propios parámetros, así que se valida por
 * separado y se guarda normalizado. Sin esto, config sería un Json libre donde
 * cualquier error recién aparecería al vender.
 */
function parseConfig(tipo: Tipo, raw: unknown): Record<string, number> {
  const c = (raw ?? {}) as Record<string, unknown>;
  switch (tipo) {
    case 'nxm': {
      const n = entero(c.n, 'Cantidad que se lleva');
      const m = entero(c.m, 'Cantidad que se paga');
      if (m >= n) throw new UnprocessableEntityException('En un NxM se tiene que pagar menos de lo que se lleva (ej: 3x2)');
      return { n, m };
    }
    case 'a_plus_b': {
      const buyQty = entero(c.buyQty, 'Unidades a comprar');
      const getQty = entero(c.getQty, 'Unidades de regalo');
      return { buyQty, getQty };
    }
    case 'percent': {
      const percent = monto(c.percent, 'Porcentaje');
      if (percent >= 100) throw new UnprocessableEntityException('Un descuento del 100% o más dejaría el producto gratis o negativo');
      // unidad: a partir de qué unidad aplica (2 = "la segunda al 50%")
      const desdeUnidad = c.desdeUnidad === undefined || c.desdeUnidad === null || c.desdeUnidad === '' ? 1 : entero(c.desdeUnidad, 'Unidad desde la que aplica');
      return { percent, desdeUnidad };
    }
    case 'amount':
      return { amount: monto(c.amount, 'Monto de descuento') };
    case 'special_price':
      return { price: monto(c.price, 'Precio especial') };
  }
}

@Controller('promotions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PromotionsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private parse(body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const type = String(body.type ?? '') as Tipo;
    if (!TIPOS.includes(type)) throw new UnprocessableEntityException(`El tipo debe ser uno de: ${TIPOS.join(', ')}`);
    const scopeType = String(body.scopeType ?? '');
    if (!SCOPES.includes(scopeType)) throw new UnprocessableEntityException('El alcance no es válido');
    const scopeValue = body.scopeValue === null || body.scopeValue === undefined || body.scopeValue === '' ? null : String(body.scopeValue);
    if (scopeType !== 'all' && !scopeValue) throw new UnprocessableEntityException('Falta el valor del alcance');

    const validFrom = body.validFrom ? new Date(String(body.validFrom)) : new Date();
    if (Number.isNaN(validFrom.getTime())) throw new UnprocessableEntityException('La fecha de inicio no es válida');
    const validTo = body.validTo ? new Date(String(body.validTo)) : null;
    if (validTo && Number.isNaN(validTo.getTime())) throw new UnprocessableEntityException('La fecha de fin no es válida');
    if (validTo && validTo <= validFrom) throw new UnprocessableEntityException('La fecha de fin tiene que ser posterior a la de inicio');

    return { name, type, config: parseConfig(type, body.config), scopeType, scopeValue, validFrom, validTo, isActive: body.isActive !== false };
  }

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.promotion.findMany({ where: { tenantId: request.user.tenantId }, orderBy: [{ isActive: 'desc' }, { validFrom: 'desc' }] });
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.prisma.promotion.create({ data: { tenantId: request.user.tenantId, ...this.parse(body) } });
  }

  @Put(':id')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const actual = await this.prisma.promotion.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!actual) throw new BadRequestException('Promoción no encontrada');
    return this.prisma.promotion.update({ where: { id }, data: this.parse(body) });
  }

  @Delete(':id')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const promo = await this.prisma.promotion.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!promo) throw new BadRequestException('Promoción no encontrada');
    await this.prisma.promotion.delete({ where: { id } });
    return { deleted: true };
  }
}
