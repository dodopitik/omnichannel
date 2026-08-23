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
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      toast.success('Login berhasil! Selamat datang kembali.');
      router.push('/dashboard');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Login gagal. Silakan coba lagi.';
      toast.error(message);
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
          <Store className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Omnichannel</h1>
        <p className="text-slate-400 text-sm mt-1">Marketplace Management System</p>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-200">Email</label>
          <input
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {form.formState.errors.email && (
            <p className="text-red-400 text-xs">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-200">Password</label>
          <div className="relative">
            <input
              {...form.register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Masukkan password"
              className="w-full px-3 py-2.5 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-red-400 text-xs">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...form.register('rememberMe')}
              type="checkbox"
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">Ingat saya</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            Lupa password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Masuk...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-400 mt-6">
        Belum punya akun?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 transition">
          Daftar sekarang
        </Link>
      </p>

      {/* Demo Credentials */}
      <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-xs text-slate-400 text-center mb-2 font-medium">Demo Credentials</p>
        <p className="text-xs text-slate-300 text-center">
          admin@omnichannel.com / Admin@123456
        </p>
      </div>
    </div>
  );
}
