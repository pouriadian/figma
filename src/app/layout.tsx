import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Vazirmatn } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/constants';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-vazirmatn',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: SITE_TITLE, template: '%s | فرامید' },
  description: SITE_DESCRIPTION,
  keywords: ['فرامید', 'Faromid', 'MDF', 'ام دی اف', 'آنتی فینگر', 'طراحی داخلی', 'ملامینه'],
  openGraph: { title: SITE_TITLE, description: SITE_DESCRIPTION, type: 'website', locale: 'fa_IR' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({children}: Readonly<{children:ReactNode}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${inter.variable}`}>
      <body className={vazirmatn.className}>{children}</body>
    </html>
  );
}
