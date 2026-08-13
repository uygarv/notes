'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) { return <CommandPrimitive data-slot="command" className={cn('bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md', className)} {...props} />; }
function CommandDialog({ title = 'Command palette', children, ...props }: React.ComponentProps<typeof Dialog> & { title?: string }) { return <Dialog {...props}><DialogContent className="overflow-hidden p-0"><DialogTitle className="sr-only">{title}</DialogTitle><Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium">{children}</Command></DialogContent></Dialog>; }
function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) { return <div data-slot="command-input-wrapper" className="flex h-10 items-center gap-2 border-b px-3"><Search className="size-4 shrink-0 opacity-50" /><CommandPrimitive.Input data-slot="command-input" className={cn('placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} /></div>; }
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) { return <CommandPrimitive.List data-slot="command-list" className={cn('max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto', className)} {...props} />; }
function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) { return <CommandPrimitive.Empty data-slot="command-empty" className={cn('py-6 text-center text-sm', className)} {...props} />; }
function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) { return <CommandPrimitive.Group data-slot="command-group" className={cn('text-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5', className)} {...props} />; }
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) { return <CommandPrimitive.Item data-slot="command-item" className={cn('data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', className)} {...props} />; }
function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) { return <CommandPrimitive.Separator data-slot="command-separator" className={cn('bg-border -mx-1 h-px', className)} {...props} />; }
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator };
