import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { PrismaService } from './prisma/prisma.service';

/**
 * Checklist personal del escritorio: las tareas de cada usuario, en la lista
 * que arma él mismo. Sin permiso de rango: son de quien las crea, no del
 * negocio. `sort` es la posición del dueño (orden de la lista).
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private readonly SELECT = { id: true, text: true, done: true, sort: true, createdAt: true, updatedAt: true } as const;

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.task.findMany({
      where: { userId: request.user.id },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      select: this.SELECT,
    });
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: { text?: unknown }) {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) throw new BadRequestException('Falta el texto de la tarea');
    if (text.length > 400) throw new BadRequestException('La tarea es demasiado larga');
    const last = await this.prisma.task.findFirst({
      where: { userId: request.user.id },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });
    return this.prisma.task.create({
      data: {
        userId: request.user.id,
        tenantId: request.user.tenantId,
        text,
        sort: (last?.sort ?? -1) + 1,
      },
      select: this.SELECT,
    });
  }

  @Patch(':id')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { text?: unknown; done?: unknown }) {
    const current = await this.prisma.task.findFirst({ where: { id, userId: request.user.id }, select: { id: true } });
    if (!current) throw new NotFoundException('Tarea no encontrada');

    const data: { text?: string; done?: boolean } = {};
    if (body.text !== undefined) {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) throw new BadRequestException('Falta el texto de la tarea');
      data.text = text;
    }
    if (body.done !== undefined) {
      if (typeof body.done !== 'boolean') throw new BadRequestException('done debe ser booleano');
      data.done = body.done;
    }

    return this.prisma.task.update({ where: { id }, data, select: this.SELECT });
  }

  @Delete(':id')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const current = await this.prisma.task.findFirst({ where: { id, userId: request.user.id }, select: { id: true } });
    if (!current) throw new NotFoundException('Tarea no encontrada');
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}