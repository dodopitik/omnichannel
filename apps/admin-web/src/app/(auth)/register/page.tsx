'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Store } from 'lucide-react';
import { authService } from '@/services/auth.service';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Minimal 2 karakter'),
    lastName: z.string().min(2, 'Minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    username: z
      .string()
      .min(3, 'Minimal 3 karakter')
      .regex(/^[a-z0-9_]+$/, 'Hanya huruf kecil, angka, dan underscore'),
    password: z
      .string()
      .min(8, 'Minimal 8 karakter')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Harus mengandung huruf besar, kecil, angka, dan karakter spesial',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Password tidak sama',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const mutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      toast.success('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
      router.push('/login');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Pendaftaran gagal');
    },
  });

  const onSubmit = ({ confirmPassword: _, ...data }: RegisterFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
          <Store className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Daftar Akun</h1>
        <p className="text-slate-400 text-sm mt-1">Omnichannel Marketplace</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {(['firstName', 'lastName'] as const).map((field) => (
            <div key={field}>
              <label className="text-xs font-medium text-slate-300">
                {field === 'firstName' ? 'Nama Depan' : 'Nama Belakang'}
              </label>
              <input
                {...form.register(field)}
                className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={field === 'firstName' ? 'John' : 'Doe'}
              />
              {form.formState.errors[field] && (
                <p className="text-red-400 text-xs mt-0.5">{form.formState.errors[field]?.message}</p>
              )}
            </div>
          ))}
        </div>

        {[
          { field: 'email' as const, label: 'Email', type: 'email', placeholder: 'john@example.com' },
          { field: 'username' as const, label: 'Username', type: 'text', placeholder: 'johndoe' },
        ].map(({ field, label, type, placeholder }) => (
          <div key={field}>
            <label className="text-xs font-medium text-slate-300">{label}</label>
            <input
              {...form.register(field)}
              type={type}
              placeholder={placeholder}
              className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors[field] && (
              <p className="text-red-400 text-xs mt-0.5">{form.formState.errors[field]?.message}</p>
            )}
          </div>
        ))}

        {[
          { field: 'password' as const, label: 'Password' },
          { field: 'confirmPassword' as const, label: 'Konfirmasi Password' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="text-xs font-medium text-slate-300">{label}</label>
            <div className="relative mt-1">
              <input
                {...form.register(field)}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-9 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {field === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            {form.formState.errors[field] && (
              <p className="text-red-400 text-xs mt-0.5">{form.formState.errors[field]?.message}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Mendaftar...</>
          ) : 'Daftar'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-4">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">Masuk di sini</Link>
      </p>
    </div>
  );
}
