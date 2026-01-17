'use client';

import { useQuery } from 'convex/react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { cn } from '@chatgbeant/ui/cn';

export function TokenUsage() {
  const usage = useQuery(api.ratelimit.getTokenUsage);

  if (!usage) return null;

  const basicPercentage = Math.min(
    100,
    (usage.basicTokensUsed / usage.basicTokensLimit) * 100,
  );
  const premiumPercentage =
    usage.premiumTokensLimit > 0
      ? Math.min(
          100,
          (usage.premiumTokensUsed / usage.premiumTokensLimit) * 100,
        )
      : 0;

  return (
    <div className="border-t p-4">
      <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        Token Usage
      </h3>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>Basic</span>
            <span>
              {usage.basicTokensUsed} / {usage.basicTokensLimit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                basicPercentage > 90 ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ width: `${basicPercentage}%` }}
            />
          </div>
        </div>
        {usage.tier === 'pro' && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Premium</span>
              <span>
                {usage.premiumTokensUsed} / {usage.premiumTokensLimit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  premiumPercentage > 90 ? 'bg-destructive' : 'bg-primary',
                )}
                style={{ width: `${premiumPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
