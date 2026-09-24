import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissions = [
  'users.view','users.create','users.edit','users.delete','users.manage_roles',
  'products.view','products.create','products.edit','products.delete',
  'categories.view','categories.create','categories.edit','categories.delete',
  'customers.view','customers.create','customers.edit','customers.delete',
  'inventory.view','inventory.adjust',
  'sales.view','sales.create','sales.cancel','payments.create',
  'receipts.print','receipts.reprint',
  'reports.view','reports.export',
  'invoices.view','invoices.cancel','fel.view','fel.issue','fel.cancel',
  'settings.view','settings.edit','printers.view','printers.manage','audit.view',
];

const cashierAllowed = [
  'products.view',
  'products.create',
  'customers.view',
  'customers.create',
  'sales.create',
  'payments.create',
  'receipts.print',
  'reports.view',
];

async function main() {
  console.warn('ATENCIÓN: se eliminarán todos los datos operativos y usuarios existentes.');

  await prisma.printJob.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  const permissionMap = new Map<string, string>();
  for (const key of permissions) {
    const permission = await prisma.permission.create({ data: { key, description: key } });
    permissionMap.set(key, permission.id);
  }

  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Acceso completo al sistema' },
  });
  const cashierRole = await prisma.role.create({
    data: { name: 'CAJERO', description: 'Ventas, creación de productos y reportes' },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((key) => ({
      roleId: adminRole.id,
      permissionId: permissionMap.get(key)!,
    })),
  });

  await prisma.rolePermission.createMany({
    data: cashierAllowed.map((key) => ({
      roleId: cashierRole.id,
      permissionId: permissionMap.get(key)!,
    })),
  });

  const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador TutiMami',
      email,
      passwordHash,
      active: true,
      roles: { create: { roleId: adminRole.id } },
    },
  });

  console.log('Base de datos restablecida correctamente.');
  console.log(`Único usuario creado: ${admin.email}`);
  console.log('Contraseña: Admin123!');
  console.log('No se crearon productos, clientes, categorías ni ventas.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
