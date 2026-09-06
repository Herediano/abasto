import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * Al arrancar, deja operable cualquier empresa a la que le falte lo mínimo:
 * una sucursal con su depósito y su caja, y el/los usuarios asignados. Cubre
 * empresas viejas (antes de que el signup lo provisionara) y las que se
 * quedaron sin depósito. Idempotente: no toca las que ya están.
 */
@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly log = new Logger('Bootstrap');
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const sinDeposito = await this.prisma.tenant.findMany({
      where: { warehouses: { none: {} } },
      select: { id: true, name: true },
    });
    for (const tenant of sinDeposito) {
      await this.prisma.$transaction(async tx => {
        const sucursal =
          (await tx.branch.findFirst({ where: { tenantId: tenant.id } })) ??
          (await tx.branch.create({ data: { tenantId: tenant.id, name: 'Casa Central', code: 'CC' } }));
        const deposito = await tx.warehouse.create({ data: { tenantId: tenant.id, branchId: sucursal.id, name: 'Depósito', code: 'CC-DEP' } });
        await tx.cashRegister.create({ data: { tenantId: tenant.id, warehouseId: deposito.id, name: 'Caja 1' } });
        await tx.user.updateMany({ where: { tenantId: tenant.id, branchId: null }, data: { branchId: sucursal.id, warehouseId: deposito.id } });
      });
      this.log.log(`Empresa «${tenant.name}» quedó operable: sucursal "Casa Central" + depósito + "Caja 1".`);
    }
  }
}
