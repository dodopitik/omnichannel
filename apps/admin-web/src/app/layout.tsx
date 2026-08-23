import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    default: 'Omnichannel Marketplace',
    template: '%s | Omnichannel Marketplace',
  },
  description: 'Enterprise Omnichannel Marketplace Management System',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
