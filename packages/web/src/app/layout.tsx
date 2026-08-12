import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'depfund — Dependency Funding Scanner',
  description:
    'Scan your project dependencies and surface funding information for every package. Support the open source software you rely on.',
  keywords: ['funding', 'open source', 'dependencies', 'npm', 'pypi', 'crates'],
  authors: [{ name: 'darcszn', url: 'https://github.com/darcszn' }],
  openGraph: {
    title: 'depfund — Dependency Funding Scanner',
    description:
      'Scan your project dependencies and surface funding information for every package.',
    url: 'https://depfund.vercel.app',
    siteName: 'depfund',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
