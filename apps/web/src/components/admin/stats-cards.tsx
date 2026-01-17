'use client';

import { Users, MessageSquare, Coins, Crown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@chatgbeant/ui/card';

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    proUsers: number;
    basicUsers: number;
    totalChats: number;
    totalMessages: number;
    totalBasicTokensUsed: number;
    totalPremiumTokensUsed: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: `${stats.proUsers} Pro, ${stats.basicUsers} Basic`,
    },
    {
      title: 'Total Chats',
      value: stats.totalChats,
      icon: MessageSquare,
      description: 'All conversations',
    },
    {
      title: 'Total Messages',
      value: stats.totalMessages,
      icon: MessageSquare,
      description: 'Across all chats',
    },
    {
      title: 'Basic Tokens Used',
      value: stats.totalBasicTokensUsed.toLocaleString(),
      icon: Coins,
      description: 'This month',
    },
    {
      title: 'Premium Tokens Used',
      value: stats.totalPremiumTokensUsed.toLocaleString(),
      icon: Crown,
      description: 'This month',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
