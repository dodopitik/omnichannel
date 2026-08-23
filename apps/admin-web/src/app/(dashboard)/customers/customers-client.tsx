'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ban, Repeat2, Users, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataToolbar } from '@/components/common/data-toolbar';
import { MetricCard } from '@/components/common/metric-card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { customersService } from '@/services/commerce.service';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  marketplace?: string | null;
  totalOrders: number;
  totalSpending: number;
  isBlacklisted: boolean;
  createdAt: string;
  addresses: Array<{ city?: string | null; province?: string | null }>;
  _count: { orders: number };
}

export function CustomersClient() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersService.getAll({ search, limit: 20 }),
  });
  const { data: statsData } = useQuery({
    queryKey: ['customers', 'stats'],
    queryFn: customersService.getStats,
  });

  const customers: Customer[] = data?.data?.items || [];
  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Pelanggan</h1>
          <p className="text-sm text-muted-foreground">Database pelanggan, riwayat pembelian, dan status blacklist.</p>
        </div>
        <DataToolbar value={search} onChange={setSearch} placeholder="Cari nama, email, atau telepon..." />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Total Pelanggan" value={formatNumber(stats?.total || 0)} icon={Users} tone="blue" />
        <MetricCard title="Repeat Buyer" value={formatNumber(stats?.repeatCustomers || 0)} icon={Repeat2} tone="emerald" />
        <MetricCard title="Total Spending" value={formatCurrency(stats?.totalSpending || 0)} icon={WalletCards} tone="slate" />
        <MetricCard title="Blacklist" value={formatNumber(stats?.blacklisted || 0)} icon={Ban} tone="red" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead className="text-right">Order</TableHead>
              <TableHead className="text-right">Spending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Memuat pelanggan...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada pelanggan.</TableCell></TableRow>
            ) : customers.map((customer) => {
              const address = customer.addresses[0];
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{customer.name}</p>
                      {customer.isBlacklisted && <Badge variant="destructive">Blacklist</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Sejak {formatDate(customer.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <p>{customer.phone || '-'}</p>
                    <p className="text-xs text-muted-foreground">{customer.email || '-'}</p>
                  </TableCell>
                  <TableCell>{address ? `${address.city || '-'}, ${address.province || '-'}` : '-'}</TableCell>
                  <TableCell>{customer.marketplace || '-'}</TableCell>
                  <TableCell className="text-right">{formatNumber(customer.totalOrders || customer._count.orders)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(customer.totalSpending)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
