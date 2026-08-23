'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cable, Plus, RefreshCw, Store, Unplug, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MetricCard } from '@/components/common/metric-card';
import { formatDate, formatNumber } from '@/lib/utils';
import { Marketplace, marketplaceService } from '@/services/marketplace.service';

const statusVariant = (status: string) => {
  if (status === 'CONNECTED') return 'success';
  if (status === 'TOKEN_EXPIRED') return 'warning';
  if (status === 'ERROR') return 'destructive';
  return 'secondary';
};

export function MarketplaceClient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Shopee Store');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: marketplaceService.getAll,
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: marketplaceService.create,
    onSuccess: async (created) => {
      toast.success('Marketplace dibuat');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['marketplaces'] });
      const auth = await marketplaceService.getShopeeAuthUrl(created.data.id);
      window.location.href = auth.data.url;
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Gagal membuat marketplace');
    },
  });

  const syncMutation = useMutation({
    mutationFn: marketplaceService.sync,
    onSuccess: () => {
      toast.success('Sync masuk antrean');
      qc.invalidateQueries({ queryKey: ['marketplaces'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Gagal menjalankan sync');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: marketplaceService.disconnect,
    onSuccess: () => {
      toast.success('Marketplace disconnected');
      qc.invalidateQueries({ queryKey: ['marketplaces'] });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'connected') toast.success('Shopee berhasil terhubung');
    if (params.get('status') === 'failed') toast.error('Shopee gagal terhubung');
  }, []);

  const marketplaces: Marketplace[] = data?.data || [];
  const connected = marketplaces.filter((item) => item.status === 'CONNECTED').length;
  const syncing = marketplaces.filter((item) => item.syncStatus === 'SYNCING').length;
  const tokenExpired = marketplaces.filter((item) => item.status === 'TOKEN_EXPIRED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Kelola koneksi marketplace, OAuth, webhook, dan sinkronisasi.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Tambah Marketplace
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Total Channel" value={formatNumber(marketplaces.length)} icon={Store} tone="blue" />
        <MetricCard title="Connected" value={formatNumber(connected)} icon={Wifi} tone="emerald" />
        <MetricCard title="Syncing" value={formatNumber(syncing)} icon={RefreshCw} tone="orange" />
        <MetricCard title="Token Expired" value={formatNumber(tokenExpired)} icon={Cable} tone="red" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Webhook</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Memuat marketplace...</TableCell></TableRow>
            ) : marketplaces.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada marketplace terhubung.</TableCell></TableRow>
            ) : marketplaces.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </TableCell>
                <TableCell>
                  <p>{item.shopName || '-'}</p>
                  <p className="text-xs text-muted-foreground">{item.shopId || 'Belum connect'}</p>
                </TableCell>
                <TableCell><Badge variant={statusVariant(item.status)}>{item.status}</Badge></TableCell>
                <TableCell><Badge variant={item.syncStatus === 'FAILED' ? 'destructive' : 'outline'}>{item.syncStatus}</Badge></TableCell>
                <TableCell><Badge variant={item.webhookStatus ? 'success' : 'secondary'}>{item.webhookStatus ? 'Aktif' : 'Belum aktif'}</Badge></TableCell>
                <TableCell>{item.lastSyncAt ? formatDate(item.lastSyncAt, 'DD/MM/YYYY HH:mm') : '-'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {item.status === 'DISCONNECTED' || item.status === 'TOKEN_EXPIRED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const auth = await marketplaceService.getShopeeAuthUrl(item.id);
                          window.location.href = auth.data.url;
                        }}
                      >
                        <Cable className="h-4 w-4" /> Connect
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => syncMutation.mutate(item.id)}>
                        <RefreshCw className="h-4 w-4" /> Sync
                      </Button>
                    )}
                    {item.status === 'CONNECTED' && (
                      <Button size="icon" variant="outline" onClick={() => disconnectMutation.mutate(item.id)}>
                        <Unplug className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Marketplace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama toko</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Shopee</p>
              <p className="text-xs text-muted-foreground">OAuth, produk, stok, order, dan webhook.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ name, type: 'SHOPEE' })}
            >
              Connect Shopee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
