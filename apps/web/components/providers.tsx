'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  }));

  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange><QueryClientProvider client={queryClient}>{children}<Toaster richColors position="bottom-right" /></QueryClientProvider></ThemeProvider>;
}
