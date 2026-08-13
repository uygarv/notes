import { cn } from '@/lib/utils';

export function Badge({ className, children }: React.ComponentProps<'span'>) {
  return <span className={cn('inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300', className)}>{children}</span>;
}
