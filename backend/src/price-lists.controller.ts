import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, Res, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { resolverPrecios } from './price-resolver.util';
import { margenPorcentual } from './price-selection.util';
import { sendExport } from './export.util';

const MAX_PROFUNDIDAD = 10;

@Controller('price-lists')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PriceListsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Una lista no puede derivar de sí misma ni cerrar un ciclo: se sube por la
   * cadena desde el padre propuesto y se aborta si aparece la propia lista.
   * Sin esto, resolverPrecio giraría hasta agotar su tope de saltos y devolvería
   * null en vez de un precio.
   */
  private async validarDerivacion(tenantId: string, listaId: string | null, padreId: string) {
    if (listaId && padreId === listaId) throw new UnprocessableEntityException('Una lista no puede derivar de sí misma');
    let actual: string | null = padreId;
    for (let salto = 0; salto < MAX_PROFUNDIDAD && actual; salto++) {
      const lista: { derivesFromId: string | null } | null = await this.prisma.priceList.findFirst({
        where: { id: actual, tenantId },
        select: { derivesFromId: true },
      });
      if (!lista) throw new BadRequestException('La lista de la que querés derivar no existe');
      if (lista.derivesFromId && lista.derivesFromId === listaId) throw new UnprocessableEntityException('Esa derivación crearía un círculo entre listas');
      actual = lista.derivesFromId;
    }
  }

  private parseMarkup(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new UnprocessableEntityException('El recargo debe ser un número');
    if (n <= -100) throw new UnprocessableEntityException('Un recargo de -100% o menos dejaría los precios en cero o negativos');
    return n;
  }

  /**
   * Las listas con lo que hace falta saber de cada una.
   *
   * Antes devolvía `priceCount` = todas las filas de `product_prices` de la
   * lista, y lo mostraba como «Precios propios». Ese número no servía: la tabla
   * es un historial append-only (una fila por cambio, sin unique por
   * producto+lista), así que un catálogo de 100 productos repreciado 5 veces
   * decía 500. Lo que importa es **cuántos productos tienen precio vigente**,
   * cuántos cambios hay pendientes y cuántos clientes cobran con esta lista.
   */
  @Get() @RequirePermission('precios.ver')
  list(@Req() request: AuthRequest) {
    return this.filas(request.user.tenantId);
  }

  /** Las filas que ven la pantalla y el export, para que no se desincronicen. */
  private async filas(tenantId: string) {
    const [listas, cobertura, clientes, totalProductos] = await Promise.all([
      this.prisma.priceList.findMany({
        where: { tenantId },
        include: { derivesFrom: { select: { name: true } }, branch: { select: { name: true } } },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      // Una sola consulta para todas las listas: distinct de productos según la
      // vigencia, y la fecha del último cambio.
      this.prisma.$queryRaw<Array<{ price_list_id: string; vigentes: number; programados: number; ultimo: Date | null }>>`
        SELECT price_list_id,
               COUNT(DISTINCT product_id) FILTER (WHERE valid_from <= now())::int AS vigentes,
               COUNT(DISTINCT product_id) FILTER (WHERE valid_from >  now())::int AS programados,
               MAX(created_at) AS ultimo
        FROM product_prices
        WHERE tenant_id = ${tenantId}::uuid
        GROUP BY price_list_id
      `,
      this.prisma.customer.groupBy({
        by: ['priceListId'],
        where: { tenantId, priceListId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    const porLista = new Map(cobertura.map(c => [c.price_list_id, c]));
    const porClientes = new Map(clientes.map(c => [c.priceListId, c._count._all]));

    return listas.map(l => {
      const c = porLista.get(l.id);
      return {
        id: l.id,
        name: l.name,
        isDefault: l.isDefault,
        isActive: l.isActive,
        /** null = general: sirve en toda la empresa. */
        branchId: l.branchId,
        branchName: l.branch?.name ?? null,
        derivesFromId: l.derivesFromId,
        derivesFromName: l.derivesFrom?.name ?? null,
        markupPercent: l.markupPercent,
        /** Productos con precio propio vigente en esta lista. */
        pricedProducts: c?.vigentes ?? 0,
        /** Productos con un cambio cargado a futuro en esta lista. */
        scheduledProducts: c?.programados ?? 0,
        lastChangeAt: c?.ultimo ? c.ultimo.toISOString() : null,
        /** Clientes a los que se les cobra con esta lista. */
        customerCount: porClientes.get(l.id) ?? 0,
        /** Para leer la cobertura como "X de Y". Igual para todas las listas. */
        totalProducts: totalProductos,
      };
    });
  }

  @Get('export') @RequirePermission('precios.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query('format') format?: string) {
    const listas = await this.filas(request.user.tenantId);
    await sendExport(
      res,
      format,
      'listas-de-precios',
      [
        { header: 'Lista', key: 'name', width: 26 },
        { header: 'Alcance', key: 'alcance', width: 22 },
        { header: 'Se usa por defecto', key: 'pordefecto', width: 18 },
        { header: 'Productos con precio', key: 'pricedProducts', width: 20, numFmt: '#,##0' },
        { header: 'Clientes', key: 'customerCount', width: 12, numFmt: '#,##0' },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      listas.map(l => ({
        name: l.name,
        alcance: l.branchName ?? 'General',
        pordefecto: l.isDefault ? 'Sí' : '',
        pricedProducts: l.pricedProducts,
        customerCount: l.customerCount,
        estado: l.isActive ? 'Activa' : 'Inactiva',
      })),
    );
  }

  /**
   * Abrir una lista: qué cobra, producto por producto. Hasta ahora las listas se
   * podían crear y renombrar pero no se podían **ver**, así que no había forma
   * de contestar «¿a cuánto le vendo esto a un mayorista?» sin entrar producto
   * por producto.
   *
   * `explicit` distingue el precio cargado en esta lista del que le llega
   * calculado desde la lista de la que deriva — es la diferencia entre un precio
   * que vos pusiste y uno que se mueve solo.
   */
  @Get(':id') @RequirePermission('precios.ver')
  async detail(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const lista = (await this.filas(tenantId)).find(l => l.id === id);
    if (!lista) throw new BadRequestException('Lista no encontrada');

    const pageSize = Math.min(200, Math.max(1, Number.parseInt(query.pageSize ?? '50', 10) || 50));
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const busqueda = (query.search ?? '').trim();
    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      ...(busqueda
        ? {
          OR: [
            { name: { contains: busqueda, mode: 'insensitive' } },
            { sku: { contains: busqueda, mode: 'insensitive' } },
            { barcode: { contains: busqueda } },
          ],
        }
        : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: { id: true, name: true, sku: true, barcode: true, costPrice: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const ids = products.map(p => p.id);
    const ahora = new Date();
    const [precios, propios] = await Promise.all([
      resolverPrecios(this.prisma, tenantId, ids, id, ahora),
      // Los que tienen precio cargado en ESTA lista, para separarlos de los heredados.
      ids.length
        ? this.prisma.productPrice.findMany({
          where: { tenantId, priceListId: id, productId: { in: ids }, validFrom: { lte: ahora } },
          select: { productId: true },
          distinct: ['productId'],
        })
        : [],
    ]);
    const explicitos = new Set(propios.map(p => p.productId));

    return {
      list: lista,
      items: products.map(p => {
        const cost = p.costPrice === null ? null : Number(p.costPrice);
        const resuelto = precios.get(p.id);
        const price = resuelto === undefined ? null : Number(resuelto);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          cost,
          price,
          margin: margenPorcentual(cost, price),
          explicit: explicitos.has(p.id),
        };
      }),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  /**
   * El alcance pedido: `null` = general (toda la empresa), un id = sólo esa
   * sucursal. Se valida que la sucursal sea del tenant para que nadie mande el
   * id de otra empresa.
   */
  private async parseBranch(tenantId: string, raw: unknown): Promise<string | null> {
    if (raw === null || raw === undefined || raw === '' || raw === 'general') return null;
    if (typeof raw !== 'string') throw new UnprocessableEntityException('El alcance no es válido');
    const branch = await this.prisma.branch.findFirst({ where: { id: raw, tenantId }, select: { id: true } });
    if (!branch) throw new UnprocessableEntityException('La sucursal no existe');
    return branch.id;
  }

  /**
   * Sólo puede haber una lista por defecto por alcance: una general y, como
   * mucho, una por sucursal. Sin eso, cuál cobra la caja dependería del orden de
   * la consulta.
   *
   * El default se **transfiere**, no se rechaza: marcar una lista como la nueva
   * por defecto le quita el default a la anterior del mismo alcance, en la misma
   * transacción. Pedir primero que le saquen el default a la otra sería un
   * candado — quitárselo a la general está prohibido justamente para no dejar la
   * empresa sin fallback.
   */
  private async quitarDefaultAnterior(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string | null,
    exceptoId: string | null,
  ) {
    await tx.priceList.updateMany({
      where: { tenantId, isDefault: true, branchId, ...(exceptoId ? { id: { not: exceptoId } } : {}) },
      data: { isDefault: false },
    });
  }

  @Post()
  @RequirePermission('precios.editar')
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const branchId = await this.parseBranch(tenantId, body.branchId);
    const derivesFromId = typeof body.derivesFromId === 'string' && body.derivesFromId ? body.derivesFromId : null;
    const markupPercent = this.parseMarkup(body.markupPercent);
    if (derivesFromId) {
      await this.validarDerivacion(tenantId, null, derivesFromId);
      if (markupPercent === null) throw new UnprocessableEntityException('Indicá el recargo con el que se calcula la lista derivada');
    }
    const isDefault = body.isDefault === true;
    try {
      return await this.prisma.$transaction(async tx => {
        if (isDefault) await this.quitarDefaultAnterior(tx, tenantId, branchId, null);
        return tx.priceList.create({ data: { tenantId, name, branchId, isDefault, derivesFromId, markupPercent } });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una lista con ese nombre');
      throw error;
    }
  }

  @Put(':id')
  @RequirePermission('precios.editar')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const actual = await this.prisma.priceList.findFirst({ where: { id, tenantId } });
    if (!actual) throw new BadRequestException('Lista no encontrada');

    const name = typeof body.name === 'string' ? body.name.trim() : actual.name;
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const branchId = body.branchId === undefined ? actual.branchId : await this.parseBranch(tenantId, body.branchId);
    const derivesFromId = body.derivesFromId === null || body.derivesFromId === ''
      ? null
      : typeof body.derivesFromId === 'string' ? body.derivesFromId : actual.derivesFromId;
    const markupPercent = body.markupPercent === undefined ? actual.markupPercent : this.parseMarkup(body.markupPercent);

    if (derivesFromId) {
      if (actual.isDefault) throw new UnprocessableEntityException('La lista por defecto no puede derivar de otra: es el origen del resto.');
      await this.validarDerivacion(tenantId, id, derivesFromId);
      if (markupPercent === null) throw new UnprocessableEntityException('Indicá el recargo con el que se calcula la lista derivada');
    }

    const isDefault = typeof body.isDefault === 'boolean' ? body.isDefault : actual.isDefault;
    // Dejar la empresa sin lista general por defecto rompe la caja: el
    // consumidor final y el cliente sin lista propia no tendrían con qué
    // cobrarse. La forma de cambiarla es marcar OTRA como general por defecto
    // —eso transfiere el default—, no quitárselo a ésta.
    if (actual.isDefault && actual.branchId === null && (!isDefault || branchId !== null)) {
      throw new UnprocessableEntityException(
        'Esta es la lista general por defecto: la que paga el consumidor final. Para cambiarla, marcá otra lista general como «usar por defecto» y el default pasa sola.',
      );
    }
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : actual.isActive;
    // Una lista por defecto apagada dejaría a la caja sin con qué cobrar.
    if (isDefault && !isActive) throw new UnprocessableEntityException('Una lista que está por defecto no se puede desactivar.');

    try {
      return await this.prisma.$transaction(async tx => {
        if (isDefault) await this.quitarDefaultAnterior(tx, tenantId, branchId, id);
        return tx.priceList.update({
          where: { id },
          data: {
            name,
            branchId,
            isDefault,
            derivesFromId,
            markupPercent: derivesFromId ? markupPercent : null,
            isActive,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una lista con ese nombre');
      throw error;
    }
  }

  @Delete(':id')
  @RequirePermission('precios.editar')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    const lista = await this.prisma.priceList.findFirst({ where: { id, tenantId } });
    if (!lista) throw new BadRequestException('Lista no encontrada');
    if (lista.isDefault) throw new UnprocessableEntityException('No se puede borrar una lista que está puesta por defecto. Nombrá otra por defecto y después borrá ésta.');
    const derivadas = await this.prisma.priceList.count({ where: { tenantId, derivesFromId: id } });
    if (derivadas) throw new ConflictException(`Hay ${derivadas} lista(s) que derivan de esta. Cambiales el origen antes de borrarla.`);
    // Los precios de la lista se van en cascada (onDelete: Cascade).
    await this.prisma.priceList.delete({ where: { id } });
    return { deleted: true };
  }
}
