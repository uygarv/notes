'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  function toggleTheme() { setTheme(dark ? 'light' : 'dark'); }

  return <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}><Sun className="size-4 dark:hidden" /><Moon className="hidden size-4 dark:block" /></Button>;
}
