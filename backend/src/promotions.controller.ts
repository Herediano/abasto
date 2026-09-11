import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, Res, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { sendExport } from './export.util';
import { descuentoPromo, r2 } from './sale-pricing.util';

const TIPOS = ['nxm', 'a_plus_b', 'percent', 'amount', 'special_price'] as const;
const SCOPES = ['all', 'category', 'brand'];
const DIAS_LABEL = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "Todos los días" / "vie, sáb y dom", + la franja horaria si hay una cargada. */
function describirVigenciaSemanal(daysOfWeek: number[], startTime: string | null, endTime: string | null): string {
  const dias = daysOfWeek.length ? daysOfWeek.map(d => DIAS_LABEL[d]).join(', ') : 'todos los días';
  const horario = startTime && endTime ? `de ${startTime} a ${endTime}` : 'todo el día';
  return `${dias} · ${horario}`;
}

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

const TIPO_LABEL: Record<Tipo, string> = {
  nxm: 'NxM',
  a_plus_b: 'A+B',
  percent: 'Descuento %',
  amount: 'Descuento $',
  special_price: 'Precio especial',
};

/** Texto legible de la promoción, el mismo criterio que la tabla del frontend. */
function describirPromo(type: Tipo, config: Record<string, number>): string {
  switch (type) {
    case 'nxm': return `Llevá ${config.n}, pagá ${config.m}`;
    case 'a_plus_b': return `Comprá ${config.buyQty}, llevás ${config.getQty} de regalo`;
    case 'percent': return config.desdeUnidad > 1 ? `${config.percent}% off desde la unidad ${config.desdeUnidad}` : `${config.percent}% de descuento`;
    case 'amount': return `$${config.amount} de descuento`;
    case 'special_price': return `Precio especial $${config.price}`;
  }
}

@Controller('promotions')
@UseGuards(JwtAuthGuard, PermissionGuard)
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

    const exclusive = body.exclusive !== false;
    const { daysOfWeek, startTime, endTime } = this.parseVigenciaSemanal(body);
    return { name, type, config: parseConfig(type, body.config), scopeType, scopeValue, validFrom, validTo, isActive: body.isActive !== false, exclusive, daysOfWeek, startTime, endTime };
  }

  /**
   * Día de la semana y franja horaria, además del rango de fechas. Vacío/null
   * en cualquiera de los dos = sin esa restricción (todos los días / todo el
   * día), que es el caso de la enorme mayoría de las promos.
   */
  private parseVigenciaSemanal(body: Record<string, unknown>) {
    const crudos = Array.isArray(body.daysOfWeek) ? body.daysOfWeek : [];
    const daysOfWeek = [...new Set(crudos.map(d => Number(d)).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (daysOfWeek.length === 7) daysOfWeek.length = 0; // los 7 días es lo mismo que "sin restricción"

    const hora = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
    const startTime = hora(body.startTime);
    const endTime = hora(body.endTime);
    if ((startTime === null) !== (endTime === null)) {
      throw new UnprocessableEntityException('Si limitás el horario, indicá desde y hasta qué hora');
    }
    if (startTime !== null && endTime !== null && endTime <= startTime) {
      throw new UnprocessableEntityException('La hora de fin tiene que ser posterior a la de inicio');
    }
    return { daysOfWeek, startTime, endTime };
  }

  @Get() @RequirePermission('promociones.ver')
  list(@Req() request: AuthRequest) {
    // createdAt como desempate: las promos de antes de que existiera prioridad
    // quedaron todas en 0 (sin backfill), y sin un segundo criterio Postgres no
    // garantiza el mismo orden entre consultas — "gana la primera" necesita que
    // haya una primera de verdad.
    return this.prisma.promotion.findMany({ where: { tenantId: request.user.tenantId }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] });
  }

  @Get('export') @RequirePermission('promociones.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query('format') format?: string) {
    const tenantId = request.user.tenantId;
    const [promos, categorias] = await Promise.all([
      this.prisma.promotion.findMany({ where: { tenantId }, orderBy: [{ isActive: 'desc' }, { validFrom: 'desc' }] }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    const nombreCategoria = new Map(categorias.map(c => [c.id, c.name]));
    const alcance = (scopeType: string, scopeValue: string | null) => {
      if (scopeType === 'all' || !scopeValue) return 'Todos los productos';
      if (scopeType === 'category') return `Categoría: ${nombreCategoria.get(scopeValue) ?? scopeValue}`;
      return `Marca: ${scopeValue}`;
    };
    await sendExport(
      res,
      format,
      'promociones',
      [
        { header: 'Promoción', key: 'name', width: 28 },
        { header: 'Tipo', key: 'tipo', width: 16 },
        { header: 'Qué hace', key: 'detalle', width: 34 },
        { header: 'Alcance', key: 'alcance', width: 26 },
        { header: 'Desde', key: 'desde', width: 14 },
        { header: 'Hasta', key: 'hasta', width: 14 },
        { header: 'Cuándo', key: 'cuando', width: 26 },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      promos.map(p => ({
        name: p.name,
        tipo: TIPO_LABEL[p.type as Tipo] ?? p.type,
        detalle: describirPromo(p.type as Tipo, p.config as Record<string, number>),
        alcance: alcance(p.scopeType, p.scopeValue),
        desde: p.validFrom.toLocaleDateString('es-AR'),
        hasta: p.validTo ? p.validTo.toLocaleDateString('es-AR') : 'sin fin',
        cuando: describirVigenciaSemanal(p.daysOfWeek, p.startTime, p.endTime),
        estado: p.isActive ? 'Activa' : 'Inactiva',
      })),
    );
  }

  /**
   * Simula el descuento de una promoción sin guardar nada: para probar que un
   * NxM o un % está bien armado antes de cargarlo, con un precio y una
   * cantidad de ejemplo. Usa la misma cuenta que la caja (`descuentoPromo`),
   * así lo que ves acá es lo que va a pasar de verdad al vender.
   */
  @Post('preview') @RequirePermission('promociones.ver')
  preview(@Body() body: { type?: string; config?: unknown; quantity?: unknown; unitPrice?: unknown }) {
    const type = String(body.type ?? '') as Tipo;
    if (!TIPOS.includes(type)) throw new UnprocessableEntityException(`El tipo debe ser uno de: ${TIPOS.join(', ')}`);
    const config = parseConfig(type, body.config);

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new UnprocessableEntityException('La cantidad tiene que ser un entero mayor a cero');
    const unitPrice = Number(body.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new UnprocessableEntityException('El precio unitario tiene que ser mayor a cero');

    const bruto = r2(unitPrice * quantity);
    const discountAmount = Math.min(descuentoPromo(type, config, quantity, unitPrice), bruto);
    const total = r2(bruto - discountAmount);
    return {
      quantity,
      unitPrice,
      bruto,
      discountAmount,
      total,
      // Precio por unidad ya con el descuento adentro, para leerlo directo.
      unitPriceEfectivo: r2(total / quantity),
      aplica: discountAmount > 0,
    };
  }

  @Post() @RequirePermission('promociones.crear')
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    // Nueva promoción entra al final de la cola de evaluación: no hay que
    // reordenar todo para que un alta no salte por delante de lo que ya había.
    const ultima = await this.prisma.promotion.findFirst({ where: { tenantId }, orderBy: { priority: 'desc' }, select: { priority: true } });
    return this.prisma.promotion.create({ data: { tenantId, priority: (ultima?.priority ?? -1) + 1, ...this.parse(body) } });
  }

  // Va antes de :id porque si no, Nest matchea "reorder" como si fuera un id.
  @Put('reorder') @RequirePermission('promociones.editar')
  async reorder(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
    if (!ids.length) throw new BadRequestException('ids es obligatorio');
    const propias = await this.prisma.promotion.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
    if (propias.length !== ids.length) throw new BadRequestException('Alguna promoción no existe');
    await this.prisma.$transaction(ids.map((id, priority) => this.prisma.promotion.update({ where: { id }, data: { priority } })));
    return { reordered: ids.length };
  }

  @Put(':id') @RequirePermission('promociones.editar')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const actual = await this.prisma.promotion.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!actual) throw new BadRequestException('Promoción no encontrada');
    return this.prisma.promotion.update({ where: { id }, data: this.parse(body) });
  }

  @Delete(':id') @RequirePermission('promociones.eliminar')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const promo = await this.prisma.promotion.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!promo) throw new BadRequestException('Promoción no encontrada');
    await this.prisma.promotion.delete({ where: { id } });
    return { deleted: true };
  }
}
