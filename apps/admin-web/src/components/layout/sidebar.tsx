'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard, Store, Package, Warehouse, ShoppingCart, Users,
  BarChart3, Bell, Settings, ChevronDown, ChevronRight, Store as StoreIcon,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  permission?: string;
  children?: NavItem[];
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { label: 'Marketplace', href: '/marketplace', icon: Store, permission: 'marketplace:read' },
  {
    label: 'Produk',
    icon: Package,
    permission: 'products:read',
    children: [
      { label: 'Daftar Produk', href: '/products', icon: Package },
      { label: 'Kategori', href: '/products/categories', icon: Package },
      { label: 'Brand', href: '/products/brands', icon: Package },
    ],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    permission: 'inventory:read',
    children: [
      { label: 'Stok', href: '/inventory', icon: Warehouse },
      { label: 'Gudang', href: '/inventory/warehouses', icon: Warehouse },
      { label: 'Transfer Stok', href: '/inventory/transfers', icon: Warehouse },
    ],
  },
  { label: 'Order', href: '/orders', icon: ShoppingCart, permission: 'orders:read' },
  { label: 'Pelanggan', href: '/customers', icon: Users, permission: 'customers:read' },
  { label: 'Laporan', href: '/reports', icon: BarChart3, permission: 'reports:read' },
  { label: 'Notifikasi', href: '/notifications', icon: Bell },
  {
    label: 'Pengaturan',
    icon: Settings,
    permission: 'settings:read',
    children: [
      { label: 'Profil', href: '/settings/profile', icon: Settings },
      { label: 'Pengguna', href: '/users', icon: Users },
      { label: 'Role & Akses', href: '/settings/roles', icon: Settings },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const { hasPermission } = useAuthStore();
  const [isOpen, setIsOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((child) => child.href && pathname.startsWith(child.href));
  });

  if (item.permission && !hasPermission(item.permission)) return null;

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
            depth === 0 ? 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
            {item.children.map((child) => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
        depth > 0 && 'text-sm',
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {item.label}
      {item.badge && (
        <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-sidebar h-full flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
          <StoreIcon className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-sidebar-foreground text-sm leading-tight">Omnichannel</p>
          <p className="text-sidebar-foreground/50 text-xs">Marketplace System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center">v1.0.0 Sprint 0</p>
      </div>
    </aside>
  );
}
