'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { SearchUsers } from '~/components/admin/search-users';
import { UserTable } from '~/components/admin/user-table';

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const usersData = useQuery(api.admin.listUsers, { search: search || undefined });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="text-muted-foreground">
                    Manage users, tiers, and token allocations
                </p>
            </div>

            <SearchUsers value={search} onChange={setSearch} />

            {usersData === undefined ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <UserTable users={usersData.users} />
            )}
        </div>
    );
}
