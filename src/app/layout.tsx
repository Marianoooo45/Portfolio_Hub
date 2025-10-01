// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Portfolio Hub',
  description: 'Dashboard PEA / Crypto avec scénarios what-if',
  themeColor: '#0b0e13',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-neutral-950">
      <body className={`${inter.className} text-neutral-200`}>
        <div className="af-scene" aria-hidden="true" />
        <div className="af-grid" aria-hidden="true" />
        <div className="af-shell min-h-screen">{children}</div>
      </body>
    </html>
  );
}
