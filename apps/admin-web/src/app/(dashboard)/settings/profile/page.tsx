'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, User, Lock, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import api from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Minimal 2 karakter'),
  lastName: z.string().min(2, 'Minimal 2 karakter'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Minimal 8 karakter')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Harus mengandung huruf besar, kecil, angka, karakter spesial'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Password tidak sama',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
    },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/users/' + user?.id, data),
    onSuccess: (response) => {
      const updated = response.data.data;
      setUser({ ...user!, firstName: updated.firstName, lastName: updated.lastName });
      toast.success('Profil berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui profil'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password berhasil diubah');
      passwordForm.reset();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'Gagal mengubah password'),
  });

  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'password' as const, label: 'Password', icon: Lock },
    { id: 'security' as const, label: 'Keamanan', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Pengaturan Profil</h1>
        <p className="text-sm text-muted-foreground">Kelola informasi akun dan keamanan Anda</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {user ? getInitials(`${user.firstName} ${user.lastName}`) : '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-1.5 mt-1.5">
                {user?.roles?.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
            <CardDescription>Perbarui nama dan informasi kontak Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nama Depan</Label>
                  <Input {...profileForm.register('firstName')} />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-xs text-red-500">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Belakang</Label>
                  <Input {...profileForm.register('lastName')} />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-xs text-red-500">{profileForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nomor HP</Label>
                <Input {...profileForm.register('phone')} placeholder="+62812345678" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
            <CardDescription>Pastikan akun Anda menggunakan password yang kuat</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(({ confirmPassword: _, ...data }) =>
                changePasswordMutation.mutate(data)
              )}
              className="space-y-4"
            >
              {[
                { name: 'currentPassword' as const, label: 'Password Saat Ini' },
                { name: 'newPassword' as const, label: 'Password Baru' },
                { name: 'confirmPassword' as const, label: 'Konfirmasi Password Baru' },
              ].map(({ name, label }) => (
                <div key={name} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="password" {...passwordForm.register(name)} />
                  {passwordForm.formState.errors[name] && (
                    <p className="text-xs text-red-500">{passwordForm.formState.errors[name]?.message}</p>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ubah Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Keamanan Akun</CardTitle>
            <CardDescription>Informasi keamanan dan aktivitas login</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Status Akun</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="success">Aktif</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Email Terverifikasi</span>
                  <Badge variant="success">Ya</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">2-Factor Auth</span>
                  <Badge variant="secondary">Nonaktif</Badge>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-1">Sesi Aktif</h3>
              <p className="text-xs text-muted-foreground">
                Untuk keamanan, logout dari semua perangkat jika Anda mencurigai aktivitas tidak sah.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
