'use client';

import { useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { redirect } from 'next/navigation';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { AdminSidebar } from '~/components/admin/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrent);

  if (isLoading || currentUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || currentUser?.role !== 'admin') {
    redirect('/c/new');
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-auto p-6">{children}</main>
    </div>
  );
}
