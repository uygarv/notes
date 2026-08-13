'use client';

import * as React from 'react';
import { PanelLeft } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type SidebarContextValue = { open: boolean; setOpen: (open: boolean) => void; toggleSidebar: () => void; isMobile: boolean };
const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

function SidebarProvider({ className, style, children, ...props }: React.ComponentProps<'div'>) {
  const [open, setOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => { const media = window.matchMedia('(max-width: 767px)'); const change = () => setIsMobile(media.matches); change(); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  return <SidebarContext.Provider value={{ open, setOpen, toggleSidebar: () => setOpen((current) => !current), isMobile }}><div data-slot="sidebar-wrapper" style={{ '--sidebar-width': '18rem', ...style } as React.CSSProperties} className={cn('group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar', className)} {...props}>{children}</div></SidebarContext.Provider>;
}

function Sidebar({ className, children, ...props }: React.ComponentProps<'aside'>) {
  const { open, isMobile } = useSidebar();
  return <aside data-slot="sidebar" data-state={open ? 'expanded' : 'collapsed'} className={cn('fixed inset-y-0 left-0 z-30 hidden h-svh w-(--sidebar-width) flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out md:flex', !open && '-translate-x-full', className)} {...props}>{children}{isMobile && null}</aside>;
}
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) { const { open } = useSidebar(); return <main data-slot="sidebar-inset" className={cn('relative flex w-full flex-1 flex-col bg-background transition-[margin] duration-200 ease-out', open ? 'md:ml-(--sidebar-width)' : 'md:ml-0', className)} {...props} />; }
function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) { const { toggleSidebar } = useSidebar(); return <Button data-slot="sidebar-trigger" variant="ghost" size="icon" className={cn('-ml-1', className)} onClick={(event) => { onClick?.(event); toggleSidebar(); }} {...props}><PanelLeft /></Button>; }
function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-2', className)} {...props} />; }
function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)} {...props} />; }
function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-2', className)} {...props} />; }
function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />; }
function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-group-label" className={cn('text-sidebar-foreground/60 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium', className)} {...props} />; }
function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sidebar-group-content" className={cn('w-full text-sm', className)} {...props} />; }
function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) { return <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />; }
function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) { return <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />; }
function SidebarMenuButton({ className, isActive = false, children, asChild = false, ...props }: React.ComponentProps<'button'> & { isActive?: boolean; asChild?: boolean }) { const Comp = asChild ? Slot : 'button'; return <Comp data-slot="sidebar-menu-button" data-active={isActive} className={cn('text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm outline-hidden transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0', className)} {...props}>{children}</Comp>; }
function SidebarInput({ className, ...props }: React.ComponentProps<'input'>) { return <input data-slot="sidebar-input" className={cn('bg-background h-8 w-full rounded-md border border-sidebar-border px-2 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring', className)} {...props} />; }
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar };
