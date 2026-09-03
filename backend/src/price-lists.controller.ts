import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

const MAX_PROFUNDIDAD = 10;

@Controller('price-lists')
@UseGuards(JwtAuthGuard)
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

  @Get()
  async list(@Req() request: AuthRequest) {
    const listas = await this.prisma.priceList.findMany({
      where: { tenantId: request.user.tenantId },
      include: { derivesFrom: { select: { name: true } }, _count: { select: { prices: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return listas.map(l => ({
      id: l.id,
      name: l.name,
      isDefault: l.isDefault,
      isActive: l.isActive,
      derivesFromId: l.derivesFromId,
      derivesFromName: l.derivesFrom?.name ?? null,
      markupPercent: l.markupPercent,
      priceCount: l._count.prices,
    }));
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const derivesFromId = typeof body.derivesFromId === 'string' && body.derivesFromId ? body.derivesFromId : null;
    const markupPercent = this.parseMarkup(body.markupPercent);
    if (derivesFromId) {
      await this.validarDerivacion(tenantId, null, derivesFromId);
      if (markupPercent === null) throw new UnprocessableEntityException('Indicá el recargo con el que se calcula la lista derivada');
    }
    try {
      return await this.prisma.priceList.create({ data: { tenantId, name, derivesFromId, markupPercent } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una lista con ese nombre');
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const actual = await this.prisma.priceList.findFirst({ where: { id, tenantId } });
    if (!actual) throw new BadRequestException('Lista no encontrada');

    const name = typeof body.name === 'string' ? body.name.trim() : actual.name;
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    const derivesFromId = body.derivesFromId === null || body.derivesFromId === ''
      ? null
      : typeof body.derivesFromId === 'string' ? body.derivesFromId : actual.derivesFromId;
    const markupPercent = body.markupPercent === undefined ? actual.markupPercent : this.parseMarkup(body.markupPercent);

    if (derivesFromId) {
      if (actual.isDefault) throw new UnprocessableEntityException('La lista base no puede derivar de otra');
      await this.validarDerivacion(tenantId, id, derivesFromId);
      if (markupPercent === null) throw new UnprocessableEntityException('Indicá el recargo con el que se calcula la lista derivada');
    }

    try {
      return await this.prisma.priceList.update({
        where: { id },
        data: {
          name,
          derivesFromId,
          markupPercent: derivesFromId ? markupPercent : null,
          isActive: typeof body.isActive === 'boolean' ? body.isActive : actual.isActive,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una lista con ese nombre');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    const lista = await this.prisma.priceList.findFirst({ where: { id, tenantId } });
    if (!lista) throw new BadRequestException('Lista no encontrada');
    if (lista.isDefault) throw new UnprocessableEntityException('No se puede borrar la lista base');
    const derivadas = await this.prisma.priceList.count({ where: { tenantId, derivesFromId: id } });
    if (derivadas) throw new ConflictException(`Hay ${derivadas} lista(s) que derivan de esta. Cambiales el origen antes de borrarla.`);
    // Los precios de la lista se van en cascada (onDelete: Cascade).
    await this.prisma.priceList.delete({ where: { id } });
    return { deleted: true };
  }
}
