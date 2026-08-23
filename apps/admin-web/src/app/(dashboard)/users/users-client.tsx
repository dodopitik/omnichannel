'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Shield, XCircle, Loader2 } from 'lucide-react';
import { usersService, rolesService, type User, type CreateUserPayload } from '@/services/users.service';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getInitials } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  PENDING_VERIFICATION: 'warning',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  SUSPENDED: 'Disuspend',
  PENDING_VERIFICATION: 'Belum Verifikasi',
};

const createSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function UsersClient() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: () => usersService.getAll({ page, limit: 20, search: search || undefined }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getAll,
    enabled: modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      toast.success('Pengguna berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      form.reset();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Gagal membuat pengguna');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Gagal menghapus pengguna');
    },
  });

  const form = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const users: User[] = data?.data?.data || [];
  const meta = data?.data?.meta;
  const roles = rolesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Manajemen Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola pengguna dan hak akses sistem</p>
        </div>
        {hasPermission('users:create') && (
          <Button onClick={() => { setEditUser(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Tambah Pengguna
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari pengguna..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pengguna</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Login Terakhir</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {search ? 'Tidak ada pengguna yang ditemukan' : 'Belum ada pengguna'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                          {getInitials(`${user.firstName} ${user.lastName}`)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">@{user.username}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((ur) => (
                          <span key={ur.role.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded">
                            <Shield className="w-2.5 h-2.5" />
                            {ur.role.displayName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[user.status] as 'success' | 'destructive' | 'warning' | 'secondary'}>
                        {statusLabels[user.status] || user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt, 'DD/MM/YYYY HH:mm') : 'Belum pernah'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {hasPermission('users:update') && (
                          <button
                            onClick={() => { setEditUser(user); setModalOpen(true); }}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('users:delete') && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-950/30 transition text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Menampilkan {((page - 1) * 20) + 1}–{Math.min(page * 20, meta.total)} dari {meta.total} pengguna
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) { setEditUser(null); form.reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data as CreateUserPayload))}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              {(['firstName', 'lastName'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {f === 'firstName' ? 'Nama Depan' : 'Nama Belakang'} *
                  </label>
                  <input
                    {...form.register(f)}
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {form.formState.errors[f] && (
                    <p className="text-red-500 text-xs mt-0.5">{form.formState.errors[f]?.message}</p>
                  )}
                </div>
              ))}
            </div>
            {[
              { f: 'email' as const, label: 'Email *', type: 'email' },
              { f: 'username' as const, label: 'Username *', type: 'text' },
              { f: 'password' as const, label: 'Password *', type: 'password' },
              { f: 'phone' as const, label: 'Nomor HP', type: 'tel' },
            ].map(({ f, label, type }) => (
              <div key={f}>
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  {...form.register(f)}
                  type={type}
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {form.formState.errors[f] && (
                  <p className="text-red-500 text-xs mt-0.5">{form.formState.errors[f]?.message}</p>
                )}
              </div>
            ))}
            {roles.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <div className="mt-1 space-y-1.5 max-h-32 overflow-y-auto border border-border rounded-md p-2">
                  {roles.map((role: { id: string; displayName: string; isSystem: boolean }) => (
                    <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={role.id}
                        {...form.register('roleIds')}
                        className="w-3.5 h-3.5 rounded"
                      />
                      <span className="text-sm">{role.displayName}</span>
                      {role.isSystem && <span className="text-xs text-muted-foreground">(System)</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Hapus Pengguna
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Apakah Anda yakin ingin menghapus pengguna{' '}
            <strong>{deleteConfirm?.firstName} {deleteConfirm?.lastName}</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
            >
              {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
