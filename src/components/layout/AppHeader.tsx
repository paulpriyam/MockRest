import { Layers3 } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          <Layers3 className="h-7 w-7" />
          <span className="font-headline">MockREST</span>
        </Link>
      </div>
    </header>
  );
}
