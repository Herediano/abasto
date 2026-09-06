/**
 * Datos de demo para VER el sistema funcionando: productos con stock, dos
 * semanas de ventas, clientes con cuenta corriente, lotes por vencer y una
 * factura de compra sin cargar.
 *
 * Uso:  npm run db:seed-demo -- "<nombre de la empresa>"
 *       (o DEMO_TENANT="<nombre>" npm run db:seed-demo)
 *
 * Es idempotente por marca: sólo toca lo que él mismo creó (productos con
 * barcode que empieza en 779DEMO, etc.). Para volver a empezar, borralos desde
 * Productos o corré este script de nuevo (reemplaza).
 *
 * NO se corre en el seed normal (`db:seed`), que sólo carga el catálogo de
 * referencia.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const BARCODE_PREFIX = '779DEMO';

const CATEGORIAS = ['Almacén', 'Bebidas', 'Fiambrería', 'Limpieza', 'Perfumería'];

const PRODUCTOS: { name: string; cat: string; cost: number; price: number; min: number; venc?: boolean }[] = [
  { name: 'YERBA PLAYADITO 1KG', cat: 'Almacén', cost: 2310, price: 2950, min: 30 },
  { name: 'YERBA ROSAMONTE 1KG', cat: 'Almacén', cost: 2480, price: 3190, min: 24 },
  { name: 'AZUCAR LEDESMA 1KG', cat: 'Almacén', cost: 980, price: 1250, min: 40 },
  { name: 'HARINA 000 BLANCAFLOR 1KG', cat: 'Almacén', cost: 760, price: 990, min: 30 },
  { name: 'ACEITE NATURA GIRASOL 1.5L', cat: 'Almacén', cost: 2640, price: 3390, min: 30 },
  { name: 'ACEITE COCINERO GIRASOL 900ML', cat: 'Almacén', cost: 1780, price: 2290, min: 24 },
  { name: 'FIDEOS MATARAZZO TIRABUZON 500G', cat: 'Almacén', cost: 964, price: 1140, min: 36 },
  { name: 'FIDEOS LUCCHETTI SPAGHETTI 500G', cat: 'Almacén', cost: 990, price: 1190, min: 36 },
  { name: 'ARROZ GALLO ORO 1KG', cat: 'Almacén', cost: 1310, price: 1680, min: 24 },
  { name: 'PURE DE TOMATE ARCOR 520G', cat: 'Almacén', cost: 640, price: 830, min: 30 },
  { name: 'ARVEJAS ARCOR LATA 300G', cat: 'Almacén', cost: 720, price: 940, min: 24 },
  { name: 'MERMELADA BC LA COLINA 390G', cat: 'Almacén', cost: 1120, price: 1450, min: 12 },
  { name: 'GALLETITAS OREO 118G', cat: 'Almacén', cost: 806, price: 1040, min: 24 },
  { name: 'GALLETITAS CRIOLLITAS 300G', cat: 'Almacén', cost: 690, price: 890, min: 30 },
  { name: 'MAYONESA HELLMANNS 475G', cat: 'Almacén', cost: 1795, price: 2310, min: 18 },
  { name: 'COCA COLA 2.25L RETORNABLE', cat: 'Bebidas', cost: 1480, price: 1990, min: 48 },
  { name: 'COCA COLA 500ML', cat: 'Bebidas', cost: 720, price: 1050, min: 60 },
  { name: 'GASEOSA SPRITE 2.25L', cat: 'Bebidas', cost: 1390, price: 1890, min: 24 },
  { name: 'AGUA VILLAVICENCIO 2L', cat: 'Bebidas', cost: 640, price: 950, min: 36 },
  { name: 'CERVEZA QUILMES 1L RETORNABLE', cat: 'Bebidas', cost: 1180, price: 1650, min: 48 },
  { name: 'VINO TORO TINTO 1L', cat: 'Bebidas', cost: 1240, price: 1690, min: 24 },
  { name: 'JUGO BAGGIO NARANJA 1L', cat: 'Bebidas', cost: 780, price: 1050, min: 24 },
  { name: 'QUE. FONTINA LA PAULINA x KG', cat: 'Fiambrería', cost: 6900, price: 8850, min: 8 },
  { name: 'QUESO CREMOSO PUNTA DEL AGUA x KG', cat: 'Fiambrería', cost: 5400, price: 6990, min: 8 },
  { name: 'JAMON COCIDO CAGNOLI FETEADO x KG', cat: 'Fiambrería', cost: 7200, price: 9200, min: 6, venc: true },
  { name: 'SALAME MILAN PALADINI x KG', cat: 'Fiambrería', cost: 8100, price: 10400, min: 5 },
  { name: 'CREMA LA SERENISIMA 200G', cat: 'Fiambrería', cost: 690, price: 900, min: 20, venc: true },
  { name: 'YOG. ILOLAY BEBIBLE FRUTILLA x12', cat: 'Fiambrería', cost: 4200, price: 5300, min: 8, venc: true },
  { name: 'MANTECA SANCOR 200G', cat: 'Fiambrería', cost: 980, price: 1290, min: 18, venc: true },
  { name: 'LAVANDINA AYUDIN 1L', cat: 'Limpieza', cost: 640, price: 890, min: 30 },
  { name: 'DETERGENTE MAGISTRAL 750ML', cat: 'Limpieza', cost: 1180, price: 1590, min: 24 },
  { name: 'JABON EN POLVO SKIP 800G', cat: 'Limpieza', cost: 2100, price: 2790, min: 18 },
  { name: 'PAPEL HIGIENICO ELEGANTE x4', cat: 'Perfumería', cost: 1720, price: 2290, min: 40 },
  { name: 'SHAMPOO SEDAL 340ML', cat: 'Perfumería', cost: 1490, price: 1990, min: 18 },
  { name: 'PASTA DENTAL COLGATE 90G', cat: 'Perfumería', cost: 780, price: 1050, min: 24 },
];

const CLIENTES: { name: string; limite: number | null; deuda: number; morosoDias: number }[] = [
  { name: 'Kiosco El Trébol', limite: 80000, deuda: 96400, morosoDias: 34 },
  { name: 'Almacén Doña Rosa', limite: 150000, deuda: 52300, morosoDias: 11 },
  { name: 'Despensa San Cayetano', limite: null, deuda: 138900, morosoDias: 0 },
  { name: 'Fiambrería La Nonna', limite: 200000, deuda: 0, morosoDias: 0 },
];

const PROVEEDORES = ['La Cachuera S.A.', 'Molinos Río de la Plata', 'Arcor', 'Distribuidora Norte'];

const pad = (n: number, len: number) => String(n).padStart(len, '0');
const money = (n: number) => new Prisma.Decimal(n.toFixed(2));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Antes hacía falta corregir un desfasaje: las columnas eran `timestamp without
 * time zone` y Prisma escribía los Date como UTC mientras `@default(now())` los
 * ponía en hora local. Con la migración a `timestamptz` eso se terminó — un
 * `new Date()` se guarda como el instante que es. Queda como identidad para no
 * tocar los llamados.
 */
const bare = (d: Date) => d;

async function main() {
  const nombre = process.argv[2] || process.env.DEMO_TENANT;
  const tenant = nombre
    ? await prisma.tenant.findFirst({ where: { name: nombre } })
    : (await prisma.tenant.count()) === 1
      ? await prisma.tenant.findFirst()
      : null;

  if (!tenant) {
    console.error(
      nombre
        ? `No encontré la empresa «${nombre}».`
        : 'Hay más de una empresa. Pasá el nombre:  npm run db:seed-demo -- "<empresa>"',
    );
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log(`Sembrando demo en «${tenant.name}» (${tenantId})`);

  const user = await prisma.user.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  if (!user) throw new Error('La empresa no tiene usuarios.');

  const priceList =
    (await prisma.priceList.findFirst({ where: { tenantId, isDefault: true } })) ??
    (await prisma.priceList.create({ data: { tenantId, name: 'Mostrador', isDefault: true } }));

  // ---- Sucursal + depósito + caja ----
  const branch =
    (await prisma.branch.findFirst({ where: { tenantId } })) ??
    (await prisma.branch.create({ data: { tenantId, name: 'Casa Central', code: 'CC' } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { tenantId } })) ??
    (await prisma.warehouse.create({ data: { tenantId, branchId: branch.id, name: 'Depósito', code: 'CC-DEP' } }));
  if (!user.warehouseId) {
    await prisma.user.update({ where: { id: user.id }, data: { warehouseId: warehouse.id } });
    console.log(`  · asigné a ${user.name} a la sucursal ${warehouse.name}`);
  }
  await prisma.cashRegister.upsert({
    where: { tenantId_warehouseId_name: { tenantId, warehouseId: warehouse.id, name: 'Caja 1' } },
    update: {},
    create: { tenantId, warehouseId: warehouse.id, name: 'Caja 1' },
  });

  // ---- Limpiar demo anterior ----
  const DEMO_POS = '0001'; // punto de venta de las ventas de demo — así se limpian sin tocar ventas reales
  const previos = await prisma.product.findMany({ where: { tenantId, barcode: { startsWith: BARCODE_PREFIX } }, select: { id: true } });
  const ventasDemo = await prisma.sale.findMany({ where: { tenantId, pointOfSale: DEMO_POS }, select: { id: true } });
  if (previos.length || ventasDemo.length) {
    const ids = previos.map(p => p.id);
    const sids = ventasDemo.map(s => s.id);
    await prisma.customerAccountMovement.deleteMany({ where: { tenantId, saleId: { in: sids } } });
    await prisma.salePayment.deleteMany({ where: { tenantId, saleId: { in: sids } } });
    await prisma.saleLine.deleteMany({ where: { tenantId, saleId: { in: sids } } });
    await prisma.sale.deleteMany({ where: { tenantId, id: { in: sids } } });
    await prisma.purchaseInvoiceLine.deleteMany({ where: { tenantId, productId: { in: ids } } });
    await prisma.purchaseInvoice.deleteMany({ where: { tenantId, lines: { none: {} }, status: 'draft' } });
    await prisma.stockMovement.deleteMany({ where: { tenantId, productId: { in: ids } } });
    await prisma.productLot.deleteMany({ where: { tenantId, productId: { in: ids } } });
    await prisma.productPrice.deleteMany({ where: { tenantId, productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { tenantId, id: { in: ids } } });
    console.log(`  · limpié la demo anterior (${ids.length} productos, ${sids.length} ventas)`);
  }

  // ---- Categorías ----
  const catByName = new Map<string, string>();
  for (const name of CATEGORIAS) {
    const c = await prisma.category.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
    });
    catByName.set(name, c.id);
  }

  // ---- Proveedores ----
  for (const name of PROVEEDORES) {
    const existe = await prisma.supplier.findFirst({ where: { tenantId, name } });
    if (!existe) await prisma.supplier.create({ data: { tenantId, name } });
  }
  const proveedorMolinos = await prisma.supplier.findFirst({ where: { tenantId, name: 'Molinos Río de la Plata' } });

  // ---- Productos + stock inicial ----
  const creados: { id: string; name: string; cost: number; price: number; min: number; venc: boolean }[] = [];
  for (let i = 0; i < PRODUCTOS.length; i++) {
    const p = PRODUCTOS[i];
    const barcode = `${BARCODE_PREFIX}${pad(i + 1, 5)}`;
    const esPesable = / x KG$/.test(p.name);
    const prod = await prisma.product.create({
      data: {
        tenantId,
        barcode,
        internalCode: `D${pad(i + 1, 4)}`,
        name: p.name,
        categoryId: catByName.get(p.cat)!,
        unit: esPesable ? 'kg' : 'unidad',
        costPrice: money(p.cost),
        salePrice: money(p.price),
        taxRate: new Prisma.Decimal(21),
        minStock: new Prisma.Decimal(p.min),
        manejaVencimiento: !!p.venc,
        isWeighed: esPesable,
      },
    });
    await prisma.productPrice.create({
      data: { tenantId, productId: prod.id, priceListId: priceList.id, price: money(p.price), source: 'manual', userId: user.id },
    });

    // Stock inicial: cómodo salvo tres que quedan bajo mínimo a propósito.
    const bajoMinimo = ['COCA COLA 2.25L RETORNABLE', 'PAPEL HIGIENICO ELEGANTE x4'].includes(p.name);
    const qty = bajoMinimo ? Math.floor(p.min * rand(0.2, 0.4)) : Math.floor(p.min * rand(1.6, 3.2));
    if (qty > 0) {
      await prisma.stockMovement.create({
        data: {
          tenantId, productId: prod.id, warehouseId: warehouse.id, quantity: new Prisma.Decimal(qty),
          movementType: 'purchase_in', occurredAt: daysAgo(20), notes: 'Carga inicial (demo)',
        },
      });
    }

    // Lotes por vencer para los que manejan vencimiento.
    if (p.venc) {
      const dias = pick([2, 4, 6, 9, 13]);
      await prisma.productLot.create({
        data: {
          tenantId, productId: prod.id, warehouseId: warehouse.id, supplierId: proveedorMolinos?.id ?? null,
          lotNumber: `L-${pad(1000 + i, 4)}`, expirationDate: daysFromNow(dias),
        },
      });
    }

    creados.push({ id: prod.id, name: p.name, cost: p.cost, price: p.price, min: p.min, venc: !!p.venc });
  }
  console.log(`  · ${creados.length} productos con stock`);

  // ---- Clientes + cuenta corriente ----
  const clientesCreados: { id: string; name: string; deuda: number }[] = [];
  for (const c of CLIENTES) {
    const existente = await prisma.customer.findFirst({ where: { tenantId, name: c.name } });
    const cli = existente
      ? await prisma.customer.update({ where: { id: existente.id }, data: { creditLimit: c.limite != null ? money(c.limite) : null, accountBalance: money(c.deuda) } })
      : await prisma.customer.create({ data: { tenantId, name: c.name, priceListId: priceList.id, creditLimit: c.limite != null ? money(c.limite) : null, accountBalance: money(c.deuda) } });
    if (c.deuda > 0) {
      await prisma.customerAccountMovement.deleteMany({ where: { tenantId, customerId: cli.id } });
      await prisma.customerAccountMovement.create({
        data: {
          tenantId, customerId: cli.id, type: 'sale', amount: money(c.deuda), balanceAfter: money(c.deuda),
          userId: user.id, notes: 'Saldo inicial (demo)', occurredAt: daysAgo(c.morosoDias || 5),
        },
      });
    }
    clientesCreados.push({ id: cli.id, name: c.name, deuda: c.deuda });
  }

  // ---- Ventas de las últimas 15 jornadas ----
  const ahora = new Date();
  const hoy0 = new Date(ahora);
  hoy0.setHours(0, 0, 0, 0);
  // Ventana de las ventas de hoy: desde hace un rato hasta ahora, sin salirse de
  // hoy — así siempre están en el pasado (los reportes filtran < ahora) y la
  // demo muestra "ventas de hoy" a cualquier hora que se la mire.
  const transcurridoMs = Math.max(25 * 60_000, Math.min(7 * 3_600_000, ahora.getTime() - hoy0.getTime()));
  let numero = (await prisma.sale.count({ where: { tenantId } })) + 1;
  let ventasCreadas = 0;
  for (let d = 14; d >= 0; d--) {
    const dia = new Date(ahora);
    dia.setDate(dia.getDate() - d);
    const finde = dia.getDay() === 0 || dia.getDay() === 6;
    const hoy = d === 0;
    const baseOps = finde ? rand(6, 12) : rand(16, 26);
    const ops = hoy ? Math.round(baseOps * 0.7 * (transcurridoMs / (12 * 3_600_000))) : Math.round(baseOps);
    for (let k = 0; k < ops; k++) {
      const fecha = hoy
        ? new Date(ahora.getTime() - Math.floor(rand(60_000, transcurridoMs)))
        : (() => {
            const f = new Date(dia);
            f.setHours(0, 0, 0, 0);
            f.setMinutes(Math.floor(rand(8 * 60, 20 * 60)));
            return f;
          })();
      const nLineas = Math.round(rand(1, 6));
      const lineas: Omit<Prisma.SaleLineCreateManyInput, 'saleId'>[] = [];
      let subtotal = 0;
      let tax = 0;
      for (let l = 0; l < nLineas; l++) {
        const prod = pick(creados);
        const cant = prod.name.includes(' x KG') ? Math.round(rand(3, 12)) / 10 : Math.round(rand(1, 4));
        const neto = prod.price / 1.21;
        const lineSub = neto * cant;
        const lineTax = lineSub * 0.21;
        subtotal += lineSub;
        tax += lineTax;
        lineas.push({
          tenantId, productId: prod.id, barcode: '', description: prod.name, quantity: new Prisma.Decimal(cant.toFixed(3)),
          listPrice: money(prod.price), unitPrice: money(prod.price), taxRate: new Prisma.Decimal(21),
          lineSubtotal: money(lineSub), lineTax: money(lineTax), lineTotal: money(lineSub + lineTax),
        });
      }
      const total = subtotal + tax;
      const metodo = pick(['cash', 'cash', 'card', 'transfer', 'qr'] as const);
      const sale = await prisma.sale.create({
        data: {
          tenantId, warehouseId: warehouse.id, userId: user.id, priceListId: priceList.id,
          pointOfSale: DEMO_POS, number: numero++, subtotal: money(subtotal), taxTotal: money(tax), total: money(total),
          paymentMethod: metodo, occurredAt: bare(fecha),
        },
      });
      await prisma.saleLine.createMany({ data: lineas.map(l => ({ ...l, saleId: sale.id })) });
      await prisma.salePayment.createMany({ data: [{ tenantId, saleId: sale.id, method: metodo, amount: money(total) }] });
      ventasCreadas++;
    }
  }
  console.log(`  · ${ventasCreadas} ventas en 15 jornadas`);

  // ---- Una factura de compra sin cargar (borrador) ----
  const provArcor = await prisma.supplier.findFirst({ where: { tenantId, name: 'Arcor' } });
  if (provArcor) {
    const yaHay = await prisma.purchaseInvoice.findFirst({ where: { tenantId, status: 'draft', supplierId: provArcor.id } });
    if (!yaHay) {
      const algunos = creados.filter(p => ['GALLETITAS OREO 118G', 'PURE DE TOMATE ARCOR 520G', 'ARVEJAS ARCOR LATA 300G'].includes(p.name));
      let sub = 0;
      let iva = 0;
      const lineas = algunos.map(p => {
        const uc = p.cost * 1.06;
        const ls = uc * 24;
        const lt = ls * 0.21;
        sub += ls;
        iva += lt;
        return {
          tenantId, productId: p.id, barcode: '', description: p.name, quantity: new Prisma.Decimal(24),
          unitCost: money(uc), taxRate: new Prisma.Decimal(21),
          lineSubtotal: money(ls), lineTax: money(lt), lineTotal: money(ls + lt),
        };
      });
      const inv = await prisma.purchaseInvoice.create({
        data: {
          tenantId, supplierId: provArcor.id, warehouseId: warehouse.id, createdById: user.id, status: 'draft',
          invoiceType: 'A', pointOfSale: '0112', invoiceNumber: '00009930', issueDate: daysFromNow(-1),
          subtotal: money(sub), taxTotal: money(iva), total: money(sub + iva),
        },
      });
      await prisma.purchaseInvoiceLine.createMany({ data: lineas.map(l => ({ ...l, invoiceId: inv.id })) });
      console.log('  · 1 factura de compra en borrador (Arcor)');
    }
  }

  console.log('Demo lista.');
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return bare(d);
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return bare(d);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
