'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, PackageCheck, SlidersHorizontal, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataToolbar } from '@/components/common/data-toolbar';
import { MetricCard } from '@/components/common/metric-card';
import { formatNumber } from '@/lib/utils';
import { inventoryService } from '@/services/commerce.service';

interface StockItem {
  id: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  incomingStock: number;
  minimumStock: number;
  updatedAt: string;
  product: { name: string; sku: string; status: string };
  variant?: { name: string; sku: string } | null;
  warehouse: { name: string; code: string };
}

export function InventoryClient() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('0');
  const [mode, setMode] = useState<'adjust' | 'opname'>('adjust');
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'stock', search],
    queryFn: () => inventoryService.getStock({ search, limit: 20 }),
  });
  const { data: statsData } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: inventoryService.getStats,
  });

  const items: StockItem[] = data?.data?.items || [];
  const stats = statsData?.data;

  const stockMutation = useMutation({
    mutationFn: () => {
      const payload = { quantity: Number(quantity || 0), notes: mode === 'adjust' ? 'Manual adjustment' : 'Stock opname' };
      return mode === 'adjust'
        ? inventoryService.adjustStock(selected!.id, payload)
        : inventoryService.opnameStock(selected!.id, payload);
    },
    onSuccess: () => {
      toast.success('Stok diperbarui');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Pantau stok gudang, reserved stock, dan item hampir habis.</p>
        </div>
        <DataToolbar value={search} onChange={setSearch} placeholder="Cari produk atau SKU..." />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Gudang Aktif" value={formatNumber(stats?.warehouses || 0)} icon={Warehouse} tone="blue" />
        <MetricCard title="Available Stock" value={formatNumber(stats?.availableStock || 0)} icon={PackageCheck} tone="emerald" />
        <MetricCard title="Reserved" value={formatNumber(stats?.reservedStock || 0)} icon={Boxes} tone="slate" />
        <MetricCard title="Stok Kritis" value={formatNumber((stats?.lowStock || 0) + (stats?.outOfStock || 0))} icon={AlertTriangle} tone="orange" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Gudang</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Memuat stok...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada data stok.</TableCell></TableRow>
            ) : items.map((item) => {
              const critical = item.availableStock <= item.minimumStock;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant?.sku || item.product.sku}</p>
                  </TableCell>
                  <TableCell>
                    <p>{item.warehouse.name}</p>
                    <p className="text-xs text-muted-foreground">{item.warehouse.code}</p>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(item.totalStock)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.reservedStock)}</TableCell>
                  <TableCell className="text-right font-medium">{formatNumber(item.availableStock)}</TableCell>
                  <TableCell>
                    <Badge variant={critical ? 'warning' : 'success'}>{critical ? 'Perlu Restock' : 'Aman'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="outline" onClick={() => { setSelected(item); setQuantity('0'); setMode('adjust'); }}>
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Stok</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selected?.product.name}</p>
              <p className="text-sm text-muted-foreground">Available sekarang: {formatNumber(selected?.availableStock || 0)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === 'adjust' ? 'default' : 'outline'} onClick={() => setMode('adjust')}>Adjustment</Button>
              <Button variant={mode === 'opname' ? 'default' : 'outline'} onClick={() => setMode('opname')}>Opname</Button>
            </div>
            <div className="space-y-2">
              <Label>{mode === 'adjust' ? 'Delta stok' : 'Jumlah hasil hitung'}</Label>
              <Input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button disabled={stockMutation.isPending} onClick={() => stockMutation.mutate()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
