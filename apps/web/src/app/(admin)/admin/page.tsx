'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { Users, Bot } from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Card, CardHeader, CardTitle, CardDescription } from '@chatgbeant/ui/card';

import { StatsCards } from '~/components/admin/stats-cards';

export default function AdminDashboard() {
    const [userSynced, setUserSynced] = useState(false);
    const getOrCreateUser = useMutation(api.users.getOrCreate);

    // Sync user role from Clerk to Convex on mount
    useEffect(() => {
        void getOrCreateUser().then(() => setUserSynced(true));
    }, [getOrCreateUser]);

    // Only run admin query after user is synced
    const stats = useQuery(api.admin.getStats, userSynced ? {} : 'skip');

    if (!userSynced || stats === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of ChatGBeanT statistics
                </p>
            </div>

            <StatsCards stats={stats} />

            <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/admin/users">
                    <Card className="transition-colors hover:bg-accent">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-lg">User Management</CardTitle>
                            </div>
                            <CardDescription>
                                Search users, manage tiers and roles
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/admin/models">
                    <Card className="transition-colors hover:bg-accent">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Model Management</CardTitle>
                            </div>
                            <CardDescription>
                                Configure featured models and availability
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
