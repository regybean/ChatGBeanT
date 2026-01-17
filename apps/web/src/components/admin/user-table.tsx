'use client';

import { useMutation } from 'convex/react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import type { Doc } from '@chatgbeant/backend/convex/_generated/dataModel';
import { Button } from '@chatgbeant/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@chatgbeant/ui/select';

interface UserTableProps {
    users: Doc<'users'>[];
}

export function UserTable({ users }: UserTableProps) {
    const updateTier = useMutation(api.users.updateTier);
    const updateRole = useMutation(api.admin.updateRole);
    const resetTokens = useMutation(api.users.resetTokens);

    const handleTierChange = async (
        userId: Doc<'users'>['_id'],
        tier: 'basic' | 'pro',
    ) => {
        try {
            await updateTier({ userId, tier });
            toast.success('User tier updated');
        } catch {
            toast.error('Failed to update tier');
        }
    };

    const handleRoleChange = async (
        userId: Doc<'users'>['_id'],
        role: 'user' | 'admin',
    ) => {
        try {
            await updateRole({ userId, role });
            toast.success('User role updated');
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleResetTokens = async (userId: Doc<'users'>['_id']) => {
        try {
            await resetTokens({ userId });
            toast.success('Tokens reset successfully');
        } catch {
            toast.error('Failed to reset tokens');
        }
    };

    if (users.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground">
                No users found
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
                <thead className="bg-muted">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                            Token Usage
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {users.map((user) => (
                        <tr key={user._id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                                <div>
                                    <p className="font-medium">{user.name ?? 'Unknown'}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <Select
                                    value={user.tier}
                                    onValueChange={(value) =>
                                        handleTierChange(user._id, value as 'basic' | 'pro')
                                    }
                                >
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                            <td className="px-4 py-3">
                                <Select
                                    value={user.role}
                                    onValueChange={(value) =>
                                        handleRoleChange(user._id, value as 'user' | 'admin')
                                    }
                                >
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                            <td className="px-4 py-3 text-sm">
                                <p>Basic: {user.basicTokensUsed}</p>
                                <p>Premium: {user.premiumTokensUsed}</p>
                            </td>
                            <td className="px-4 py-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResetTokens(user._id)}
                                >
                                    Reset Tokens
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
