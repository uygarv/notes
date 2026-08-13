'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronsUpDown, FileText, GalleryVerticalEnd, LogOut, Menu, Plus, Search, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { api, unwrap } from '@/lib/api';
import { useCurrentUser } from '@/lib/queries';
import { useUiStore } from '@/lib/store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const nav = [
  { href: '/', label: 'Notes', icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { isSidebarOpen, setSidebarOpen, startDraft, commandOpen, setCommandOpen } = useUiStore();
  const pageTitle = pathname === '/settings' ? 'Settings' : 'Notes';

  async function logout() {
    try { await unwrap(await api.auth.logout()); } finally { queryClient.clear(); router.replace('/login'); }
  }

  const actions = { newNote: () => { startDraft(); router.push('/'); setSidebarOpen(false); }, logout };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandOpen]);

  return <SidebarProvider style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
    <DesktopSidebar pathname={pathname} user={user.data} onNewNote={actions.newNote} onLogout={actions.logout} />
    <MobileSidebar open={isSidebarOpen} onOpenChange={setSidebarOpen} pathname={pathname} user={user.data} onNewNote={actions.newNote} onLogout={actions.logout} />
    <SidebarInset>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/65 sm:px-4">
        <div className="hidden md:block"><SidebarTrigger /></div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu /></Button>
        <Separator orientation="vertical" className="mr-1 hidden h-4 md:block" />
        <div className="flex min-w-0 flex-1 items-center gap-2"><span className="hidden text-sm text-muted-foreground sm:inline">Workspace</span><span className="hidden text-muted-foreground sm:inline">/</span><h1 className="truncate text-sm font-medium">{pageTitle}</h1></div>
        <ThemeToggle />
        <Button size="sm" className="hidden sm:inline-flex" onClick={actions.newNote}><Plus /> New note</Button>
      </header>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} key={pathname} className="flex min-h-[calc(100svh-3.5rem)] flex-1">{children}</motion.div>
    </SidebarInset>
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}><CommandInput placeholder="Type a command or search…" /><CommandList><CommandEmpty>No matching command.</CommandEmpty><CommandGroup heading="Actions"><CommandItem onSelect={() => { actions.newNote(); setCommandOpen(false); }}><Plus />Create a note</CommandItem><CommandItem onSelect={() => { router.push('/settings'); setCommandOpen(false); }}><Settings />Open settings</CommandItem><CommandItem onSelect={() => { router.push('/'); setCommandOpen(false); }}><Search />Browse notes</CommandItem></CommandGroup></CommandList></CommandDialog>
  </SidebarProvider>;
}

function Brand({ onNavigate }: { onNavigate?: () => void }) { return <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1 text-sm font-semibold"><span className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><GalleryVerticalEnd className="size-4" /></span><span>Notes</span></Link>; }

function Navigation({ pathname, onNewNote, onNavigate }: { pathname: string; onNewNote: () => void; onNavigate?: () => void }) {
  return <><Button className="mx-2 mt-2 justify-start" onClick={onNewNote}><Plus /> New note <kbd className="ml-auto hidden rounded border border-primary-foreground/20 px-1.5 py-0.5 font-mono text-[10px] font-normal opacity-70 lg:inline">⌘N</kbd></Button><SidebarGroup><SidebarGroupLabel>Workspace</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{nav.map(({ href, label, icon: Icon }) => <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={pathname === href}><Link href={href} onClick={onNavigate}><Icon /><span>{label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></>;
}

function UserMenu({ user, onLogout, onOpenSettings }: { user: { email: string; username: string | null } | undefined; onLogout: () => void; onOpenSettings?: () => void }) {
  const initials = (user?.username || user?.email || 'N').slice(0, 2).toUpperCase();
  return <DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm outline-none transition hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg">{initials}</AvatarFallback></Avatar><span className="grid min-w-0 flex-1 leading-tight"><span className="truncate font-medium">{user?.username || 'Your workspace'}</span><span className="truncate text-xs text-muted-foreground">{user?.email}</span></span><ChevronsUpDown className="size-4 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent className="w-60" side="top" align="end"><DropdownMenuLabel className="font-normal"><div className="flex items-center gap-2"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg">{initials}</AvatarFallback></Avatar><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{user?.username || 'Your workspace'}</span><span className="truncate text-xs text-muted-foreground">{user?.email}</span></div></div></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem asChild onSelect={onOpenSettings}><Link href="/settings"><Settings />Account settings</Link></DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={onLogout}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function DesktopSidebar({ pathname, user, onNewNote, onLogout }: { pathname: string; user: { email: string; username: string | null } | undefined; onNewNote: () => void; onLogout: () => void }) {
  return <Sidebar><SidebarHeader><Brand /></SidebarHeader><SidebarContent><Navigation pathname={pathname} onNewNote={onNewNote} /></SidebarContent><SidebarFooter><UserMenu user={user} onLogout={onLogout} /></SidebarFooter></Sidebar>;
}

function MobileSidebar({ open, onOpenChange, pathname, user, onNewNote, onLogout }: { open: boolean; onOpenChange: (open: boolean) => void; pathname: string; user: { email: string; username: string | null } | undefined; onNewNote: () => void; onLogout: () => void }) {
  const close = () => onOpenChange(false);
  return <AnimatePresence>{open && <><motion.button aria-label="Close navigation" className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} /><motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground shadow-2xl md:hidden"><div className="flex items-center justify-between p-2"><Brand onNavigate={close} /><Button variant="ghost" size="icon" onClick={close} aria-label="Close navigation"><X /></Button></div><div className="flex flex-1 flex-col overflow-auto"><Navigation pathname={pathname} onNewNote={onNewNote} onNavigate={close} /></div><div className="p-2"><UserMenu user={user} onLogout={onLogout} onOpenSettings={close} /></div></motion.aside></>}</AnimatePresence>;
}
