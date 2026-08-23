'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Store, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';

const schema = z.object({ email: z.string().email('Email tidak valid') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: ({ email }: FormData) => authService.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: () => toast.error('Terjadi kesalahan. Silakan coba lagi.'),
  });

  if (sent) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Email Terkirim</h2>
        <p className="text-slate-400 text-sm mt-2">
          Kami telah mengirim link reset password ke email Anda. Silakan cek inbox Anda.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 mt-6 text-blue-400 hover:text-blue-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke halaman login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
          <Store className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Lupa Password</h1>
        <p className="text-slate-400 text-sm mt-1">Masukkan email untuk reset password</p>
      </div>

      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-200">Email</label>
          <input
            {...form.register('email')}
            type="email"
            placeholder="admin@example.com"
            className="w-full mt-1 px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {form.formState.errors.email && (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : 'Kirim Link Reset'}
        </button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 mt-4 text-slate-400 hover:text-slate-300 text-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke login
      </Link>
    </div>
  );
}
