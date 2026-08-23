'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, FileText, PackageCheck, ShoppingCart, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataToolbar } from '@/components/common/data-toolbar';
import { MetricCard } from '@/components/common/metric-card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { ordersService } from '@/services/commerce.service';

interface Order {
  id: string;
  orderNumber: string;
  marketplaceOrderId: string;
  status: string;
  totalAmount: number;
  profit?: number | null;
  createdAt: string;
  marketplace: { name: string; type: string };
  customer?: { name: string; phone?: string | null } | null;
  _count: { items: number };
}

const statusVariant = (status: string) => {
  if (['COMPLETED', 'SHIPPED'].includes(status)) return 'success';
  if (['PAID', 'PACKED', 'READY_TO_SHIP'].includes(status)) return 'info';
  if (['CANCELLED', 'RETURNED', 'REFUNDED'].includes(status)) return 'destructive';
  return 'warning';
};

export function OrdersClient() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['orders', search],
    queryFn: () => ordersService.getAll({ search, limit: 20 }),
  });
  const { data: statsData } = useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: ordersService.getStats,
  });

  const orders: Order[] = data?.data?.items || [];
  const stats = statsData?.data;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersService.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status order diperbarui');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersService.cancel(id, { notes: 'Cancelled from admin' }),
    onSuccess: () => {
      toast.success('Order dibatalkan');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const openLabel = async (id: string) => {
    try {
      const response = await ordersService.getShippingLabel(id);
      const url = response?.data?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else toast.info('Label belum tersedia');
    } catch {
      toast.error('Gagal mengambil label');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Order</h1>
          <p className="text-sm text-muted-foreground">Semua order marketplace dalam satu antrian operasional.</p>
        </div>
        <DataToolbar value={search} onChange={setSearch} placeholder="Cari nomor order atau pelanggan..." />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Order Hari Ini" value={formatNumber(stats?.today || 0)} icon={ShoppingCart} tone="blue" />
        <MetricCard title="Pending" value={formatNumber(stats?.pending || 0)} icon={Clock} tone="orange" />
        <MetricCard title="Packing" value={formatNumber(stats?.packed || 0)} icon={PackageCheck} tone="slate" />
        <MetricCard title="Selesai" value={formatNumber(stats?.completed || 0)} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Item</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Memuat order...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada order.</TableCell></TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, 'DD/MM/YYYY HH:mm')}</p>
                </TableCell>
                <TableCell>
                  <p>{order.customer?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{order.customer?.phone || order.marketplaceOrderId}</p>
                </TableCell>
                <TableCell>
                  <p>{order.marketplace.name}</p>
                  <p className="text-xs text-muted-foreground">{order.marketplace.type}</p>
                </TableCell>
                <TableCell><Badge variant={statusVariant(order.status)}>{order.status}</Badge></TableCell>
                <TableCell className="text-right">{formatNumber(order._count.items)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => statusMutation.mutate({ id: order.id, status: 'PACKED' })}>
                      <PackageCheck className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => openLabel(order.id)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => cancelMutation.mutate(order.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
