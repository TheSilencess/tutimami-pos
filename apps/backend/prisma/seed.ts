import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

async function clearDemoData() {
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
}

async function main() {
  await clearDemoData();

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const permissionMap = new Map<string, string>();

  for (const key of permissions) {
    const permission = await prisma.permission.create({
      data: {
        key,
        description: key,
      },
    });

    permissionMap.set(key, permission.id);
  }

  const roleNames = ['ADMIN', 'SUPERVISOR', 'CAJERO'];
  const roleMap = new Map<string, string>();

  for (const name of roleNames) {
    const role = await prisma.role.create({
      data: {
        name,
        description: `Rol ${name}`,
      },
    });

    roleMap.set(name, role.id);
  }

  for (const key of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleMap.get('ADMIN')!,
        permissionId: permissionMap.get(key)!,
      },
    });
  }

  const supervisorBlocked = new Set([
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage_roles',
    'settings.edit',
  ]);

  // CAJERO: únicamente puede vender, agregar productos y consultar reportes.
  // customers.view/create se mantienen porque el flujo de venta necesita
  // seleccionar o crear el cliente de la operación.
  const cashierAllowed = new Set([
    'products.view',
    'products.create',
    'customers.view',
    'customers.create',
    'sales.create',
    'payments.create',
    'receipts.print',
    'reports.view',
  ]);

  for (const key of permissions) {
    if (!supervisorBlocked.has(key)) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap.get('SUPERVISOR')!,
          permissionId: permissionMap.get(key)!,
        },
      });
    }

    if (cashierAllowed.has(key)) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap.get('CAJERO')!,
          permissionId: permissionMap.get(key)!,
        },
      });
    }
  }

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador TutiMami',
      email: adminEmail,
      passwordHash,
      active: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: admin.id,
      roleId: roleMap.get('ADMIN')!,
    },
  });

  console.log('Seed completado.');
  console.log(`Administrador: ${adminEmail}`);
  console.log('Contraseña: Admin123!');
  console.log('No se crearon productos, clientes, categorías ni ventas demo.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
