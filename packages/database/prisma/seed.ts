import { PrismaClient, RoleType } from '../generated/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Permissions ──────────────────────────────────────────
  const permissions = [
    // User Management
    { name: 'users:read', displayName: 'View Users', module: 'users', action: 'read' },
    { name: 'users:create', displayName: 'Create Users', module: 'users', action: 'create' },
    { name: 'users:update', displayName: 'Update Users', module: 'users', action: 'update' },
    { name: 'users:delete', displayName: 'Delete Users', module: 'users', action: 'delete' },
    // Roles
    { name: 'roles:read', displayName: 'View Roles', module: 'roles', action: 'read' },
    { name: 'roles:create', displayName: 'Create Roles', module: 'roles', action: 'create' },
    { name: 'roles:update', displayName: 'Update Roles', module: 'roles', action: 'update' },
    { name: 'roles:delete', displayName: 'Delete Roles', module: 'roles', action: 'delete' },
    // Marketplace
    { name: 'marketplace:read', displayName: 'View Marketplace', module: 'marketplace', action: 'read' },
    { name: 'marketplace:connect', displayName: 'Connect Marketplace', module: 'marketplace', action: 'connect' },
    { name: 'marketplace:disconnect', displayName: 'Disconnect Marketplace', module: 'marketplace', action: 'disconnect' },
    { name: 'marketplace:sync', displayName: 'Sync Marketplace', module: 'marketplace', action: 'sync' },
    // Products
    { name: 'products:read', displayName: 'View Products', module: 'products', action: 'read' },
    { name: 'products:create', displayName: 'Create Products', module: 'products', action: 'create' },
    { name: 'products:update', displayName: 'Update Products', module: 'products', action: 'update' },
    { name: 'products:delete', displayName: 'Delete Products', module: 'products', action: 'delete' },
    { name: 'products:import', displayName: 'Import Products', module: 'products', action: 'import' },
    { name: 'products:export', displayName: 'Export Products', module: 'products', action: 'export' },
    // Inventory
    { name: 'inventory:read', displayName: 'View Inventory', module: 'inventory', action: 'read' },
    { name: 'inventory:adjust', displayName: 'Adjust Stock', module: 'inventory', action: 'adjust' },
    { name: 'inventory:transfer', displayName: 'Transfer Stock', module: 'inventory', action: 'transfer' },
    // Orders
    { name: 'orders:read', displayName: 'View Orders', module: 'orders', action: 'read' },
    { name: 'orders:update', displayName: 'Update Orders', module: 'orders', action: 'update' },
    { name: 'orders:cancel', displayName: 'Cancel Orders', module: 'orders', action: 'cancel' },
    { name: 'orders:export', displayName: 'Export Orders', module: 'orders', action: 'export' },
    // Customers
    { name: 'customers:read', displayName: 'View Customers', module: 'customers', action: 'read' },
    { name: 'customers:update', displayName: 'Update Customers', module: 'customers', action: 'update' },
    // Reports
    { name: 'reports:read', displayName: 'View Reports', module: 'reports', action: 'read' },
    { name: 'reports:export', displayName: 'Export Reports', module: 'reports', action: 'export' },
    // Settings
    { name: 'settings:read', displayName: 'View Settings', module: 'settings', action: 'read' },
    { name: 'settings:update', displayName: 'Update Settings', module: 'settings', action: 'update' },
    // Dashboard
    { name: 'dashboard:read', displayName: 'View Dashboard', module: 'dashboard', action: 'read' },
  ];

  console.log('Creating permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: perm,
      create: perm,
    });
  }

  // ─── Roles ────────────────────────────────────────────────
  console.log('Creating roles...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: { displayName: 'Super Administrator', type: RoleType.SUPER_ADMIN, isSystem: true },
    create: {
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full access to all features',
      type: RoleType.SUPER_ADMIN,
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { displayName: 'Administrator', type: RoleType.ADMIN, isSystem: true },
    create: {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Administrative access',
      type: RoleType.ADMIN,
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: { displayName: 'Manager', type: RoleType.MANAGER, isSystem: true },
    create: {
      name: 'manager',
      displayName: 'Manager',
      description: 'Management access',
      type: RoleType.MANAGER,
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'staff' },
    update: { displayName: 'Staff', type: RoleType.STAFF, isSystem: true },
    create: {
      name: 'staff',
      displayName: 'Staff',
      description: 'Basic staff access',
      type: RoleType.STAFF,
      isSystem: true,
    },
  });

  // Assign all permissions to super_admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // Assign most permissions to admin (excluding system-level)
  const adminPermNames = permissions
    .filter((p) => !['roles:delete', 'settings:update'].includes(p.name))
    .map((p) => p.name);
  const adminPerms = await prisma.permission.findMany({ where: { name: { in: adminPermNames } } });
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Manager permissions
  const managerPermNames = ['dashboard:read', 'products:read', 'products:update', 'inventory:read', 'inventory:adjust', 'orders:read', 'orders:update', 'customers:read', 'reports:read', 'reports:export', 'marketplace:read', 'marketplace:sync'];
  const managerPerms = await prisma.permission.findMany({ where: { name: { in: managerPermNames } } });
  for (const perm of managerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // ─── Super Admin User ─────────────────────────────────────
  console.log('Creating super admin user...');
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@omnichannel.com' },
    update: {},
    create: {
      email: 'admin@omnichannel.com',
      username: 'superadmin',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });

  // ─── Default Warehouse ────────────────────────────────────
  console.log('Creating default warehouse...');
  await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      name: 'Gudang Utama',
      code: 'WH-001',
      address: 'Jl. Contoh No. 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      country: 'ID',
      isDefault: true,
      createdBy: superAdminUser.id,
    },
  });

  // ─── Sample Categories ────────────────────────────────────
  console.log('Creating sample categories...');
  await prisma.category.upsert({
    where: { slug: 'elektronik' },
    update: {},
    create: { name: 'Elektronik', slug: 'elektronik', level: 0 },
  });
  await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { name: 'Fashion', slug: 'fashion', level: 0 },
  });
  await prisma.category.upsert({
    where: { slug: 'rumah-tangga' },
    update: {},
    create: { name: 'Rumah Tangga', slug: 'rumah-tangga', level: 0 },
  });

  console.log('✅ Database seed completed!');
  console.log('');
  console.log('Super Admin Credentials:');
  console.log('  Email: admin@omnichannel.com');
  console.log('  Password: Admin@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
