import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * Al arrancar, deja operable cualquier empresa que se creó antes de que el
 * signup provisionara sucursal + caja (o a la que se le borró la única
 * sucursal): crea "Casa Central" + "Caja 1" y asigna a esa sucursal a los
 * usuarios que quedaron sin ninguna. Idempotente: no toca las que ya están.
 */
@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly log = new Logger('Bootstrap');
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const sinSucursal = await this.prisma.tenant.findMany({
      where: { warehouses: { none: {} } },
      select: { id: true, name: true },
    });
    for (const tenant of sinSucursal) {
      await this.prisma.$transaction(async tx => {
        const sucursal = await tx.warehouse.create({ data: { tenantId: tenant.id, name: 'Casa Central', code: 'CC' } });
        await tx.cashRegister.create({ data: { tenantId: tenant.id, warehouseId: sucursal.id, name: 'Caja 1' } });
        await tx.user.updateMany({ where: { tenantId: tenant.id, warehouseId: null }, data: { warehouseId: sucursal.id } });
      });
      this.log.log(`Empresa «${tenant.name}» quedó operable: se creó "Casa Central" + "Caja 1".`);
    }
  }
}
