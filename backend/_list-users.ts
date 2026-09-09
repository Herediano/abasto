import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const users = await p.user.findMany({ select: { email: true, name: true, isActive: true } });
  const tenants = await p.tenant.findMany({ select: { name: true } });
  console.log('TENANTS:', JSON.stringify(tenants));
  console.log('USERS:', JSON.stringify(users));
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });