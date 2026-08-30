import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Mayorista Demo', legalName: 'Mayorista Demo S.A.', taxId: '30-12345678-9',
      warehouses: { create: [
        { name: 'Depósito Central', code: 'CENTRAL', address: 'Av. Principal 123' },
        { name: 'Depósito Frío', code: 'FRIO', address: 'Calle 2 456' },
      ] },
      suppliers: { create: [{ name: 'Distribuidora Demo', legalName: 'Distribuidora Demo S.R.L.', taxId: '30-98765432-1' }] },
      customers: { create: [{ name: 'Almacén El Sol', taxId: '20-11111111-2' }] },
      products: { create: [
        { sku: 'ARROZ-001', barcode: '7790000000011', name: 'Arroz largo fino 1 kg', category: 'Almacén', unit: 'unidad', brand: 'Demo', manejaVencimiento: true },
        { sku: 'BALDE-001', name: 'Balde plástico 10 litros', category: 'Bazar', unit: 'unidad', manejaVencimiento: false },
      ] },
    }, include: { warehouses: true, suppliers: true, products: true },
  });

  await prisma.productLot.create({ data: {
    tenantId: tenant.id, productId: tenant.products[0].id, warehouseId: tenant.warehouses[0].id,
    supplierId: tenant.suppliers[0].id, lotNumber: 'ARZ-DEMO-001', expirationDate: new Date('2027-06-30'), receivedAt: new Date('2026-08-30'),
  } });
  const secondTenant = await prisma.tenant.create({ data: { name: 'Otro Mayorista Demo', legalName: 'Otro Mayorista Demo S.A.' } });
  console.log(`Seed creado: ${tenant.name} (${tenant.id}) y ${secondTenant.name} (${secondTenant.id})`);
}

main().catch(console.error).finally(async () => prisma.$disconnect());
