'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ArrowLeft, Bot } from 'lucide-react';

import { Button } from '@chatgbeant/ui/button';
import { cn } from '@chatgbeant/ui/cn';
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from '@chatgbeant/ui/sidebar';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/admin/models',
    label: 'Models',
    icon: Bot,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <ShadcnSidebar>
      <SidebarHeader>
        <span className="text-lg font-semibold px-2">Admin</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                  pathname === item.href && 'bg-accent',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/c/new">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Link>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
