'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Layers, Package, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataToolbar } from '@/components/common/data-toolbar';
import { MetricCard } from '@/components/common/metric-card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { productsService } from '@/services/commerce.service';

interface Product {
  id: string;
  name: string;
  sku: string;
  status: string;
  sellingPrice: number;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  stockSummary: { availableStock: number; reservedStock: number };
  marketplaceProducts: Array<{ marketplace: { name: string } }>;
  _count: { variants: number };
}

const statusVariant = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'DRAFT') return 'secondary';
  if (status === 'OUT_OF_STOCK') return 'warning';
  return 'outline';
};

export function ProductsClient() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [mappingProduct, setMappingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ sku: '', name: '', sellingPrice: '0', stock: '0' });
  const [mappingForm, setMappingForm] = useState({ marketplaceId: '', marketplaceItemId: '', marketplaceModelId: '', marketplaceSku: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsService.getAll({ search, limit: 20 }),
  });
  const { data: statsData } = useQuery({
    queryKey: ['products', 'stats'],
    queryFn: productsService.getStats,
  });

  const products: Product[] = data?.data?.items || [];
  const stats = statsData?.data;

  const createMutation = useMutation({
    mutationFn: () => productsService.create({
      sku: productForm.sku,
      name: productForm.name,
      sellingPrice: Number(productForm.sellingPrice || 0),
      stock: Number(productForm.stock || 0),
      status: 'ACTIVE',
    }),
    onSuccess: () => {
      toast.success('Produk dibuat');
      setCreateOpen(false);
      setProductForm({ sku: '', name: '', sellingPrice: '0', stock: '0' });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => productsService.update(id, payload),
    onSuccess: () => {
      toast.success('Produk diperbarui');
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const mappingMutation = useMutation({
    mutationFn: () => productsService.mapMarketplace(mappingProduct!.id, {
      marketplaceId: mappingForm.marketplaceId,
      marketplaceItemId: mappingForm.marketplaceItemId,
      marketplaceModelId: mappingForm.marketplaceModelId || undefined,
      marketplaceSku: mappingForm.marketplaceSku || undefined,
    }),
    onSuccess: () => {
      toast.success('Mapping marketplace disimpan');
      setMappingProduct(null);
      setMappingForm({ marketplaceId: '', marketplaceItemId: '', marketplaceModelId: '', marketplaceSku: '' });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Produk</h1>
          <p className="text-sm text-muted-foreground">Katalog master, SKU, stok, dan mapping marketplace.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <DataToolbar value={search} onChange={setSearch} placeholder="Cari nama, SKU, barcode..." />
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Produk</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Total Produk" value={formatNumber(stats?.total || 0)} icon={Package} tone="blue" />
        <MetricCard title="Produk Aktif" value={formatNumber(stats?.active || 0)} icon={Layers} tone="emerald" />
        <MetricCard title="Stok Rendah" value={formatNumber(stats?.lowStock || 0)} icon={Boxes} tone="orange" />
        <MetricCard title="Mapping Marketplace" value={formatNumber(stats?.mapped || 0)} icon={Store} tone="slate" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Channel</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Memuat produk...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada produk.</TableCell></TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku} · {product._count.variants} varian</p>
                </TableCell>
                <TableCell>
                  <p>{product.category?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{product.brand?.name || 'Tanpa brand'}</p>
                </TableCell>
                <TableCell><Badge variant={statusVariant(product.status)}>{product.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <p className="font-medium">{formatNumber(product.stockSummary.availableStock)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(product.stockSummary.reservedStock)} reserved</p>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(product.sellingPrice)}</TableCell>
                <TableCell className="text-right">{formatNumber(product.marketplaceProducts.length)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: product.id, payload: { status: product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' } })}>
                      {product.status === 'ACTIVE' ? 'Draft' : 'Aktifkan'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMappingProduct(product)}>Mapping</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Produk</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>SKU</Label><Input value={productForm.sku} onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Nama</Label><Input value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Harga</Label><Input type="number" value={productForm.sellingPrice} onChange={(e) => setProductForm((f) => ({ ...f, sellingPrice: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Stok Awal</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button disabled={createMutation.isPending || !productForm.sku || !productForm.name} onClick={() => createMutation.mutate()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mappingProduct} onOpenChange={(open) => !open && setMappingProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mapping Marketplace</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>Marketplace ID</Label><Input value={mappingForm.marketplaceId} onChange={(e) => setMappingForm((f) => ({ ...f, marketplaceId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Item ID</Label><Input value={mappingForm.marketplaceItemId} onChange={(e) => setMappingForm((f) => ({ ...f, marketplaceItemId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Model ID</Label><Input value={mappingForm.marketplaceModelId} onChange={(e) => setMappingForm((f) => ({ ...f, marketplaceModelId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>SKU Marketplace</Label><Input value={mappingForm.marketplaceSku} onChange={(e) => setMappingForm((f) => ({ ...f, marketplaceSku: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingProduct(null)}>Batal</Button>
            <Button disabled={mappingMutation.isPending || !mappingForm.marketplaceId || !mappingForm.marketplaceItemId} onClick={() => mappingMutation.mutate()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
