import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { OPERATIONS, PricesService, ROUNDINGS, TARGETS, type BulkInput } from './prices.service';
import { describirSeleccion, normalizarSeleccion, seleccionDesdeScope, type PriceSelection } from './price-selection.util';

/**
 * Un criterio guardado es **a quién** se le aplica una actualización, con nombre,
 * para no volver a armar la selección cada vez ("los productos de Arcor",
 * "Bebidas sin cambios desde hace 30 días").
 *
 * El porcentaje es opcional a propósito: en el caso que más se repite —el
 * aumento del proveedor— la selección es siempre la misma y el número cambia
 * todos los meses, así que guardarlo congelado no servía de nada. Si el criterio
 * no trae valor, se pide al ejecutarlo. Ejecutar siempre recalcula con los
 * precios del momento: no repite los de la vez pasada.
 */
@Controller('price-rules')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('precios.editar')
export class PriceRulesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricesService) private readonly prices: PricesService,
  ) {}

  private parse(body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');

    const operationType = String(body.operationType ?? '');
    if (!OPERATIONS.includes(operationType as never)) throw new UnprocessableEntityException('La operación no es válida');

    // `margin` y `supplierIncrease` definen solos dónde escriben.
    const target = operationType === 'margin' || operationType === 'supplierIncrease' ? 'salePrice' : String(body.target ?? '');
    if (!TARGETS.includes(target as never)) throw new UnprocessableEntityException('El precio a modificar no es válido');

    const rounding = body.rounding === null || body.rounding === undefined || body.rounding === '' ? null : String(body.rounding);
    if (rounding && !ROUNDINGS.includes(rounding as never)) throw new UnprocessableEntityException('El redondeo no es válido');
    if (operationType === 'round' && !rounding) throw new UnprocessableEntityException('Elegí cómo redondear');

    // Sin valor el criterio queda "a pedir": es el caso del aumento de proveedor.
    const crudo = body.operationValue;
    const sinValor = crudo === null || crudo === undefined || crudo === '';
    const operationValue = operationType === 'round' || sinValor ? null : Number(crudo);
    if (operationValue !== null && !Number.isFinite(operationValue)) {
      throw new UnprocessableEntityException('El valor de la operación debe ser un número');
    }

    const selection = normalizarSeleccion(body.selection);
    return { name, target, operationType, operationValue, rounding, selection };
  }

  /** La selección de una regla, sea del modelo nuevo o del viejo. */
  private seleccionDe(regla: { selection: Prisma.JsonValue | null; scopeType: string | null; scopeValue: string | null }): PriceSelection {
    if (regla.selection) return normalizarSeleccion(regla.selection);
    return seleccionDesdeScope(regla.scopeType ?? undefined, regla.scopeValue);
  }

  @Get() @RequirePermission('precios.ver')
  async list(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const [reglas, categorias, proveedores] = await Promise.all([
      this.prisma.priceRule.findMany({
        where: { tenantId },
        include: { priceList: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.supplier.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    const nombres = {
      categories: new Map(categorias.map(c => [c.id, c.name])),
      suppliers: new Map(proveedores.map(s => [s.id, s.name])),
    };
    return reglas.map(r => {
      const selection = this.seleccionDe(r);
      return {
        ...r,
        priceListName: r.priceList.name,
        priceList: undefined,
        selection,
        // Para listarlo sin que el frontend tenga que rearmar el texto.
        selectionLabel: describirSeleccion(selection, nombres),
        needsValue: r.operationType !== 'round' && r.operationValue === null,
      };
    });
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const { selection, ...datos } = this.parse(body);
    const lista = await this.prices.resolverLista(tenantId, typeof body.priceListId === 'string' ? body.priceListId : undefined);
    try {
      return await this.prisma.priceRule.create({
        data: { tenantId, priceListId: lista.id, ...datos, selection: selection as Prisma.InputJsonValue },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un criterio con ese nombre');
      throw error;
    }
  }

  @Put(':id')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const actual = await this.prisma.priceRule.findFirst({ where: { id, tenantId } });
    if (!actual) throw new BadRequestException('Criterio no encontrado');
    const { selection, ...datos } = this.parse(body);
    const lista = await this.prices.resolverLista(tenantId, typeof body.priceListId === 'string' ? body.priceListId : actual.priceListId);
    try {
      return await this.prisma.priceRule.update({
        where: { id },
        data: {
          priceListId: lista.id,
          ...datos,
          selection: selection as Prisma.InputJsonValue,
          // Al pasar al modelo nuevo se limpia el alcance viejo para que no queden dos verdades.
          scopeType: null,
          scopeValue: null,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un criterio con ese nombre');
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const regla = await this.prisma.priceRule.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!regla) throw new BadRequestException('Criterio no encontrado');
    await this.prisma.priceRule.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Ejecuta el criterio. Con dryRun sólo calcula, igual que la acción masiva.
   * `value` pisa el valor guardado, y es obligatorio cuando el criterio no trae
   * uno propio.
   */
  @Post(':id/run')
  async run(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { dryRun?: boolean; validFrom?: string; value?: unknown }) {
    const tenantId = request.user.tenantId;
    const regla = await this.prisma.priceRule.findFirst({ where: { id, tenantId } });
    if (!regla) throw new BadRequestException('Criterio no encontrado');

    const guardado = regla.operationValue === null ? null : Number(regla.operationValue);
    const pasado = body?.value === null || body?.value === undefined || body?.value === '' ? null : Number(body.value);
    const value = pasado ?? guardado;
    if (regla.operationType !== 'round' && value === null) {
      throw new UnprocessableEntityException(`«${regla.name}» no tiene un porcentaje guardado: indicá cuánto aplicar.`);
    }

    const input: BulkInput = {
      priceListId: regla.priceListId,
      validFrom: body?.validFrom,
      selection: this.seleccionDe(regla),
      target: regla.target,
      operation: {
        type: regla.operationType,
        value: value ?? undefined,
        rounding: regla.rounding ?? undefined,
      },
      dryRun: body?.dryRun,
    };
    const resultado = await this.prices.ejecutar(tenantId, request.user.id, input);
    if (!body?.dryRun) await this.prisma.priceRule.update({ where: { id }, data: { lastRunAt: new Date() } });
    return { ...resultado, rule: { id: regla.id, name: regla.name } };
  }
}
