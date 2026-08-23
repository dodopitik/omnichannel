'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Shield, Lock, Loader2 } from 'lucide-react';
import { rolesService } from '@/services/users.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  type: string;
  permissions: Array<{ permission: { id: string; name: string; displayName: string; module: string } }>;
  _count?: { users: number };
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  module: string;
}

const roleSchema = z.object({
  displayName: z.string().min(2),
  name: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Hanya huruf kecil, angka, underscore'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});
type RoleForm = z.infer<typeof roleSchema>;

const MODULE_COLORS: Record<string, string> = {
  users: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  roles: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  marketplace: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  products: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  inventory: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  orders: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  reports: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  dashboard: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
};

export default function RolesPage() {
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getAll,
  });

  const { data: permsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesService.getPermissions,
    enabled: modalOpen,
  });

  const form = useForm<RoleForm>({ resolver: zodResolver(roleSchema) });

  const createMutation = useMutation({
    mutationFn: (data: RoleForm) =>
      rolesService.create({ ...data, permissionIds: selectedPermissions }),
    onSuccess: () => {
      toast.success('Role berhasil dibuat');
      qc.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'Gagal membuat role'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<RoleForm>) =>
      rolesService.update(editRole!.id, { ...data, permissionIds: selectedPermissions }),
    onSuccess: () => {
      toast.success('Role berhasil diperbarui');
      qc.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: () => toast.error('Gagal memperbarui role'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesService.remove(id),
    onSuccess: () => {
      toast.success('Role berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setDeleteConfirm(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'Gagal menghapus role'),
  });

  const openCreate = () => {
    setEditRole(null);
    setSelectedPermissions([]);
    form.reset({ name: '', displayName: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setSelectedPermissions(role.permissions.map((p) => p.permission.id));
    form.reset({ displayName: role.displayName, name: role.name, description: role.description || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditRole(null);
    setSelectedPermissions([]);
    form.reset();
  };

  const onSubmit = (data: RoleForm) => {
    if (editRole) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const roles: Role[] = rolesData?.data || [];
  const permissions: Permission[] = permsData?.data || [];
  const permsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermissions.includes(id));
    setSelectedPermissions((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Role & Permission</h1>
          <p className="text-sm text-muted-foreground">Kelola hak akses pengguna dalam sistem</p>
        </div>
        {hasPermission('roles:create') && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Tambah Role
          </Button>
        )}
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{role.displayName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{role.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {role.isSystem && (
                      <span title="System Role">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                    )}
                    {hasPermission('roles:update') && (
                      <button onClick={() => openEdit(role)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {hasPermission('roles:delete') && !role.isSystem && (
                      <button onClick={() => setDeleteConfirm(role)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{role.permissions.length} permission</span>
                  <span className="text-muted-foreground">{role._count?.users ?? 0} pengguna</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(role.permissions.map((p) => p.permission.module))].map((mod) => (
                    <span
                      key={mod}
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${MODULE_COLORS[mod] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRole ? `Edit Role: ${editRole.displayName}` : 'Buat Role Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Role (slug) *</label>
                <input
                  {...form.register('name')}
                  disabled={!!editRole}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  placeholder="manager_ops"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Tampilan *</label>
                <input
                  {...form.register('displayName')}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Manager Operasional"
                />
                {form.formState.errors.displayName && (
                  <p className="text-xs text-red-500">{form.formState.errors.displayName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
              <textarea
                {...form.register('description')}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Deskripsi role..."
              />
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permission ({selectedPermissions.length} dipilih)</label>
                <button
                  type="button"
                  onClick={() => setSelectedPermissions(permissions.map((p) => p.id))}
                  className="text-xs text-primary hover:underline"
                >
                  Pilih Semua
                </button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {Object.entries(permsByModule).map(([module, perms]) => {
                  const allSelected = perms.every((p) => selectedPermissions.includes(p.id));
                  const someSelected = perms.some((p) => selectedPermissions.includes(p.id));
                  return (
                    <div key={module} className="border-b border-border last:border-0">
                      <button
                        type="button"
                        onClick={() => toggleModule(perms)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-muted/50 transition ${MODULE_COLORS[module] || ''}`}
                      >
                        <span>{module}</span>
                        <span className={allSelected ? 'text-emerald-600' : someSelected ? 'text-yellow-600' : 'text-muted-foreground'}>
                          {allSelected ? 'Semua' : someSelected ? 'Sebagian' : 'Tidak ada'}
                        </span>
                      </button>
                      <div className="grid grid-cols-2 gap-1 p-2 bg-background">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="w-3.5 h-3.5 rounded"
                            />
                            <span className="text-xs">{perm.displayName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editRole ? 'Simpan Perubahan' : 'Buat Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-500">Hapus Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Hapus role <strong>{deleteConfirm?.displayName}</strong>? Pastikan tidak ada pengguna yang menggunakan role ini.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
