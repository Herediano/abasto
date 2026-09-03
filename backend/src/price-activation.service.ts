import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { activarPreciosVigentes } from './price-resolver.util';

/**
 * Los precios programados no necesitan que nadie los "aplique": resolverPrecio
 * ya los toma en cuenta apenas pasa su validFrom. Lo único que hace falta es
 * refrescar la caché Product.salePrice, que es de donde el listado saca el
 * precio para filtrar y ordenar.
 *
 * Corre al arrancar (por si el server estuvo apagado cuando vencía un cambio)
 * y después cada hora.
 */
@Injectable()
export class PriceActivationService implements OnModuleInit {
  private readonly logger = new Logger(PriceActivationService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.activar('arranque');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cadaHora() {
    await this.activar('programado');
  }

  private async activar(motivo: string) {
    try {
      const filas = await activarPreciosVigentes(this.prisma);
      if (filas > 0) this.logger.log(`Precios programados activados (${motivo}): ${filas} productos`);
    } catch (error) {
      // Que falle el refresco de la caché no debe tumbar el arranque del server.
      this.logger.error(`No se pudieron activar los precios programados (${motivo})`, error as Error);
    }
  }
}
