import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findOrCreateSupplier(tenantId: string) {
  const data = { name: 'Distribuidora Demo', legalName: 'Distribuidora Demo S.R.L.', taxId: '30-98765432-1' };
  const existing = await prisma.supplier.findFirst({ where: { tenantId, taxId: data.taxId } });
  return existing ?? prisma.supplier.create({ data: { tenantId, ...data } });
}

async function findOrCreateCustomer(tenantId: string) {
  const data = { name: 'Almacén El Sol', taxId: '20-11111111-2' };
  const existing = await prisma.customer.findFirst({ where: { tenantId, taxId: data.taxId } });
  return existing ?? prisma.customer.create({ data: { tenantId, ...data } });
}

async function main() {
  const tenantData = { name: 'Mayorista Demo', legalName: 'Mayorista Demo S.A.', taxId: '30-12345678-9' };
  const existingTenant = await prisma.tenant.findFirst({ where: { taxId: tenantData.taxId } });
  const tenant = existingTenant ?? await prisma.tenant.create({ data: tenantData });

  const central = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CENTRAL' } },
    update: { name: 'Depósito Central', address: 'Av. Principal 123', isActive: true },
    create: { tenantId: tenant.id, name: 'Depósito Central', code: 'CENTRAL', address: 'Av. Principal 123' },
  });
  await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FRIO' } },
    update: { name: 'Depósito Frío', address: 'Calle 2 456', isActive: true },
    create: { tenantId: tenant.id, name: 'Depósito Frío', code: 'FRIO', address: 'Calle 2 456' },
  });

  const supplier = await findOrCreateSupplier(tenant.id);
  await findOrCreateCustomer(tenant.id);

  const almacen = await prisma.category.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Almacén' } }, update: {}, create: { tenantId: tenant.id, name: 'Almacén' } });
  const bazar = await prisma.category.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Bazar' } }, update: {}, create: { tenantId: tenant.id, name: 'Bazar' } });

  const rice = await prisma.product.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: '7790000000011' } },
    update: { name: 'Arroz largo fino 1 kg', categoryId: almacen.id, unit: 'unidad', brand: 'Demo', manejaVencimiento: true, isActive: true },
    create: { tenantId: tenant.id, barcode: '7790000000011', name: 'Arroz largo fino 1 kg', categoryId: almacen.id, unit: 'unidad', brand: 'Demo', manejaVencimiento: true },
  });
  await prisma.product.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: '7790000000028' } },
    update: { name: 'Balde plástico 10 litros', categoryId: bazar.id, unit: 'unidad', brand: null, manejaVencimiento: false, isActive: true },
    create: { tenantId: tenant.id, barcode: '7790000000028', name: 'Balde plástico 10 litros', categoryId: bazar.id, unit: 'unidad', manejaVencimiento: false },
  });

  await prisma.productLot.upsert({
    where: { tenantId_productId_lotNumber: { tenantId: tenant.id, productId: rice.id, lotNumber: 'ARZ-DEMO-001' } },
    update: { warehouseId: central.id, supplierId: supplier.id, expirationDate: new Date('2027-06-30'), receivedAt: new Date('2026-08-30') },
    create: { tenantId: tenant.id, productId: rice.id, warehouseId: central.id, supplierId: supplier.id, lotNumber: 'ARZ-DEMO-001', expirationDate: new Date('2027-06-30'), receivedAt: new Date('2026-08-30') },
  });

  const secondTenant = await prisma.tenant.findFirst({ where: { name: 'Otro Mayorista Demo' } })
    ?? await prisma.tenant.create({ data: { name: 'Otro Mayorista Demo', legalName: 'Otro Mayorista Demo S.A.' } });

  console.log(`Seed verificado: ${tenant.name} (${tenant.id}) y ${secondTenant.name} (${secondTenant.id})`);
}

main().catch(console.error).finally(async () => prisma.$disconnect());
