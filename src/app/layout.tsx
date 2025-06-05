
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'MockREST',
  description: 'Manage and mock your REST API endpoints effortlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background">
        <AppHeader />
        {/* The main container is now full-width to allow page.tsx to control its internal layout (sidebar + content) */}
        <main className="flex-grow w-full px-4 py-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
