'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  Clock, Box, Truck, XCircle, RotateCcw, Store,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: { value: number; label: string };
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function OrderStatusCard({ label, count, icon: Icon, color }: {
  label: string; count: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold">{formatNumber(count)}</p>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard', 'chart', 'month'],
    queryFn: () => dashboardService.getSalesChart('month'),
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: dashboardService.getTopProducts,
  });

  const { data: topMarketplacesData } = useQuery({
    queryKey: ['dashboard', 'top-marketplaces'],
    queryFn: dashboardService.getTopMarketplaces,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: dashboardService.getLowStock,
  });

  const stats = statsData?.data;
  const chartItems = chartData?.data || [];
  const topProducts = topProductsData?.data || [];
  const topMarketplaces = topMarketplacesData?.data || [];
  const lowStockItems = lowStockData?.data || [];

  if (statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Selamat datang kembali. Berikut ringkasan bisnis Anda.</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue Bulan Ini"
          value={formatCurrency(stats?.revenue?.thisMonth || 0)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100 dark:bg-emerald-950"
        />
        <StatCard
          title="Profit Bulan Ini"
          value={formatCurrency(stats?.revenue?.profit || 0)}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-950"
        />
        <StatCard
          title="Order Hari Ini"
          value={formatNumber(stats?.orders?.today || 0)}
          icon={ShoppingCart}
          iconColor="text-orange-600"
          iconBg="bg-orange-100 dark:bg-orange-950"
        />
        <StatCard
          title="Produk Aktif"
          value={formatNumber(stats?.products?.total || 0)}
          subtitle={`${stats?.products?.lowStock || 0} hampir habis`}
          icon={Package}
          iconColor="text-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-950"
        />
      </div>

      {/* Order Status Grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Status Order
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <OrderStatusCard label="Pending" count={stats?.orders?.pending || 0} icon={Clock} color="bg-yellow-500" />
          <OrderStatusCard label="Packing" count={stats?.orders?.packing || 0} icon={Box} color="bg-blue-500" />
          <OrderStatusCard label="Siap Pickup" count={stats?.orders?.pickup || 0} icon={Truck} color="bg-indigo-500" />
          <OrderStatusCard label="Dibatalkan" count={stats?.orders?.cancel || 0} icon={XCircle} color="bg-red-500" />
          <OrderStatusCard label="Return/Refund" count={stats?.orders?.return || 0} icon={RotateCcw} color="bg-orange-500" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Grafik Penjualan — Bulan Ini</h3>
          {chartLoading ? (
            <div className="h-56 bg-muted rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartItems}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Marketplaces */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Performa Marketplace</h3>
          {topMarketplaces.length === 0 ? (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <Store className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada marketplace terhubung</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topMarketplaces.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="totalOrders" fill="hsl(var(--primary))" name="Order" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Produk Terlaris — Bulan Ini</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((product: { name: string; totalSold: number; totalRevenue: number }, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(product.totalSold)} terjual
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 shrink-0">
                    {formatCurrency(product.totalRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Stok Hampir Habis</h3>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Semua stok aman</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item: {
                id: string;
                product: { name: string; sku: string };
                warehouse: { name: string };
                availableStock: number;
              }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product?.sku} · {item.warehouse?.name}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.availableStock === 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                  }`}>
                    {item.availableStock === 0 ? 'Habis' : `${item.availableStock} sisa`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
