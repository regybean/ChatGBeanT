'use client';

import { useQuery } from 'convex/react';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { StatsCards } from '~/components/admin/stats-cards';

export default function AdminDashboard() {
    const stats = useQuery(api.admin.getStats);

    if (stats === undefined) {
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
        </div>
    );
}
