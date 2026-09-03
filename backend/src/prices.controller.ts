import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { activarPreciosVigentes } from './price-resolver.util';
import { PricesService, type BulkInput } from './prices.service';

const MODOS_REDONDEO = ['nearest10', 'nearest100', 'ending99', 'none'];

@Controller('prices')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PricesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricesService) private readonly prices: PricesService,
  ) {}

  @Post('bulk')
  bulk(@Req() request: AuthRequest, @Body() body: BulkInput) {
    return this.prices.ejecutar(request.user.tenantId, request.user.id, body);
  }

  // --- cambios programados ---

  /**
   * Precios cargados con fecha futura, agrupados por lista y fecha: es la vista
   * de "lo que va a entrar en vigencia" y desde donde se cancelan.
   */
  @Get('scheduled')
  async scheduled(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const filas = await this.prisma.productPrice.findMany({
      where: { tenantId, validFrom: { gt: new Date() } },
      include: { priceList: { select: { name: true } } },
      orderBy: { validFrom: 'asc' },
    });
    const grupos = new Map<string, { priceListId: string; priceListName: string; validFrom: string; products: number; source: string }>();
    for (const f of filas) {
      const clave = `${f.priceListId}|${f.validFrom.toISOString()}`;
      const g = grupos.get(clave);
      if (g) g.products++;
      else grupos.set(clave, { priceListId: f.priceListId, priceListName: f.priceList.name, validFrom: f.validFrom.toISOString(), products: 1, source: f.source });
    }
    return [...grupos.values()];
  }

  /** Cancela un lote programado. Sólo toca filas futuras: lo vigente no se puede borrar. */
  @Delete('scheduled')
  async cancelScheduled(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    if (!query.priceListId || !query.validFrom) throw new BadRequestException('Indicá la lista y la fecha del cambio a cancelar');
    const validFrom = new Date(query.validFrom);
    if (Number.isNaN(validFrom.getTime())) throw new UnprocessableEntityException('La fecha no es válida');
    if (validFrom <= new Date()) throw new UnprocessableEntityException('Ese cambio ya está vigente y no se puede cancelar');
    const { count } = await this.prisma.productPrice.deleteMany({
      where: { tenantId, priceListId: query.priceListId, validFrom },
    });
    return { cancelled: count };
  }

  /** Fuerza el refresco de la caché. El job lo hace solo, esto es para probar. */
  @Post('activate')
  async activate() {
    return { updated: await activarPreciosVigentes(this.prisma) };
  }

  // --- politica de redondeo por tramo ---

  @Get('rounding-rules')
  roundingRules(@Req() request: AuthRequest) {
    return this.prisma.roundingRule.findMany({ where: { tenantId: request.user.tenantId }, orderBy: { fromAmount: 'asc' } });
  }

  @Post('rounding-rules')
  async createRoundingRule(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const fromAmount = Number(body.fromAmount);
    if (!Number.isFinite(fromAmount) || fromAmount < 0) throw new UnprocessableEntityException('El monto desde debe ser un número mayor o igual a cero');
    const toAmount = body.toAmount === null || body.toAmount === undefined || body.toAmount === '' ? null : Number(body.toAmount);
    if (toAmount !== null && (!Number.isFinite(toAmount) || toAmount <= fromAmount)) {
      throw new UnprocessableEntityException('El monto hasta tiene que ser mayor que el monto desde');
    }
    const mode = typeof body.mode === 'string' ? body.mode : '';
    if (!MODOS_REDONDEO.includes(mode)) throw new UnprocessableEntityException(`El modo debe ser uno de: ${MODOS_REDONDEO.join(', ')}`);

    // Los tramos no se pueden pisar: con dos reglas cubriendo el mismo monto,
    // cual gana dependeria del orden de la consulta.
    const existentes = await this.prisma.roundingRule.findMany({ where: { tenantId } });
    const solapa = existentes.some(r => {
      const rHasta = r.toAmount === null ? Infinity : Number(r.toAmount);
      const nHasta = toAmount === null ? Infinity : toAmount;
      return fromAmount < rHasta && Number(r.fromAmount) < nHasta;
    });
    if (solapa) throw new UnprocessableEntityException('Ese tramo se superpone con otro ya cargado');

    return this.prisma.roundingRule.create({ data: { tenantId, fromAmount, toAmount, mode } });
  }

  @Delete('rounding-rules/:id')
  async deleteRoundingRule(@Req() request: AuthRequest, @Param('id') id: string) {
    const encontrada = await this.prisma.roundingRule.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!encontrada) throw new BadRequestException('Tramo no encontrado');
    await this.prisma.roundingRule.delete({ where: { id } });
    return { deleted: true };
  }
}
