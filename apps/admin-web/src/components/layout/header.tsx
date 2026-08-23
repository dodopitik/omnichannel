'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Search, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const pathToBreadcrumb: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/marketplace': 'Marketplace',
  '/products': 'Produk',
  '/inventory': 'Inventory',
  '/orders': 'Order',
  '/customers': 'Pelanggan',
  '/reports': 'Laporan',
  '/users': 'Pengguna',
  '/settings': 'Pengaturan',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout, refreshToken } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const breadcrumb = pathToBreadcrumb[pathname] ||
    pathname.split('/').filter(Boolean).map((s) =>
      s.charAt(0).toUpperCase() + s.slice(1)
    ).join(' > ');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(refreshToken ?? undefined),
    onSuccess: () => {
      logout();
      toast.success('Berhasil logout');
      router.push('/login');
    },
    onError: () => {
      logout();
      router.push('/login');
    },
  });

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40 flex items-center px-6 gap-4">
      {/* Breadcrumb */}
      <div className="flex-1">
        <h2 className="text-sm font-medium text-foreground">{breadcrumb}</h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground">
          <Search className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {user ? getInitials(`${user.firstName} ${user.lastName}`) : '?'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="text-xs text-muted-foreground">{user?.roles?.[0] || 'Staff'}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : ''}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition"
                onClick={() => setDropdownOpen(false)}
              >
                <User className="w-3.5 h-3.5" />
                Profil Saya
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="w-3.5 h-3.5" />
                Pengaturan
              </Link>
              <div className="border-t border-border mt-1">
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
