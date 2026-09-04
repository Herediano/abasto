import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { OPERATIONS, PricesService, ROUNDINGS, SCOPES, TARGETS, type BulkInput } from './prices.service';

/**
 * Un criterio es el cuerpo de una actualización masiva guardado con nombre, para
 * volver a aplicarlo sin reconfigurarlo ("Bebidas = costo +35%"). Ejecutarlo
 * recalcula con los valores del momento: no repite los precios de la vez pasada.
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
    const scopeType = String(body.scopeType ?? '');
    if (!SCOPES.includes(scopeType as never)) throw new UnprocessableEntityException('El alcance no es válido');
    const target = String(body.target ?? '');
    if (!TARGETS.includes(target as never)) throw new UnprocessableEntityException('El precio a modificar no es válido');
    const operationType = String(body.operationType ?? '');
    if (!OPERATIONS.includes(operationType as never)) throw new UnprocessableEntityException('La operación no es válida');
    const rounding = body.rounding === null || body.rounding === undefined || body.rounding === '' ? null : String(body.rounding);
    if (operationType === 'round' && (!rounding || !ROUNDINGS.includes(rounding as never))) {
      throw new UnprocessableEntityException('Elegí un tipo de redondeo');
    }
    const operationValue = operationType === 'round' ? null : Number(body.operationValue);
    if (operationType !== 'round' && !Number.isFinite(operationValue)) throw new UnprocessableEntityException('El valor de la operación debe ser un número');
    const scopeValue = body.scopeValue === null || body.scopeValue === undefined || body.scopeValue === '' ? null : String(body.scopeValue);
    if ((scopeType === 'category' || scopeType === 'brand') && !scopeValue) throw new UnprocessableEntityException('Falta el valor del alcance');
    return { name, scopeType, scopeValue, target, operationType, operationValue, rounding };
  }

  @Get()
  async list(@Req() request: AuthRequest) {
    const reglas = await this.prisma.priceRule.findMany({
      where: { tenantId: request.user.tenantId },
      include: { priceList: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return reglas.map(r => ({ ...r, priceListName: r.priceList.name, priceList: undefined }));
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const datos = this.parse(body);
    const lista = await this.prices.resolverLista(tenantId, typeof body.priceListId === 'string' ? body.priceListId : undefined);
    try {
      return await this.prisma.priceRule.create({ data: { tenantId, priceListId: lista.id, ...datos } });
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
    const datos = this.parse(body);
    const lista = await this.prices.resolverLista(tenantId, typeof body.priceListId === 'string' ? body.priceListId : actual.priceListId);
    try {
      return await this.prisma.priceRule.update({ where: { id }, data: { priceListId: lista.id, ...datos } });
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

  /** Ejecuta el criterio. Con dryRun sólo calcula, igual que la acción masiva. */
  @Post(':id/run')
  async run(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { dryRun?: boolean; validFrom?: string }) {
    const tenantId = request.user.tenantId;
    const regla = await this.prisma.priceRule.findFirst({ where: { id, tenantId } });
    if (!regla) throw new BadRequestException('Criterio no encontrado');

    const input: BulkInput = {
      priceListId: regla.priceListId,
      validFrom: body?.validFrom,
      scope: { type: regla.scopeType, value: regla.scopeValue ?? undefined },
      target: regla.target,
      operation: {
        type: regla.operationType,
        value: regla.operationValue === null ? undefined : Number(regla.operationValue),
        rounding: regla.rounding ?? undefined,
      },
      dryRun: body?.dryRun,
    };
    const resultado = await this.prices.ejecutar(tenantId, request.user.id, input);
    if (!body?.dryRun) await this.prisma.priceRule.update({ where: { id }, data: { lastRunAt: new Date() } });
    return { ...resultado, rule: { id: regla.id, name: regla.name } };
  }
}
