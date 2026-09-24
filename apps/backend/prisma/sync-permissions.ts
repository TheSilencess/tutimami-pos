import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.manage_roles',
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'categories.view',
  'categories.create',
  'categories.edit',
  'categories.delete',
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  'inventory.view',
  'inventory.adjust',
  'sales.view',
  'sales.create',
  'sales.cancel',
  'payments.create',
  'receipts.print',
  'receipts.reprint',
  'reports.view',
  'reports.export',
  'invoices.view',
  'invoices.cancel',
  'fel.view',
  'fel.issue',
  'fel.cancel',
  'settings.view',
  'settings.edit',
  'printers.view',
  'printers.manage',
  'audit.view',
];

const cashierAllowed = [
  // Required to operate the POS and create products.
  'products.view',
  'products.create',
  'customers.view',
  'customers.create',
  'sales.create',
  'payments.create',
  'reports.view',
];

async function setRolePermissions(roleId: string, keys: string[]) {
  const rows = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (rows.length) {
    await prisma.rolePermission.createMany({
      data: rows.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
  }

  const admin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'Rol ADMIN' },
    create: { name: 'ADMIN', description: 'Rol ADMIN' },
  });

  const cashier = await prisma.role.upsert({
    where: { name: 'CAJERO' },
    update: { description: 'Rol CAJERO' },
    create: { name: 'CAJERO', description: 'Rol CAJERO' },
  });

  await setRolePermissions(admin.id, permissions);
  await setRolePermissions(cashier.id, cashierAllowed);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (adminUser) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: admin.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: admin.id,
      },
    });
  }

  console.log('Permisos sincronizados.');
  console.log('ADMIN: acceso completo.');
  console.log('CAJERO: ventas + crear productos + reportes.');
  console.log('No se eliminaron usuarios, productos, clientes ni ventas.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
