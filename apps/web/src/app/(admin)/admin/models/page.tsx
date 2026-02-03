'use client';

import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Search, Star, StarOff, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Badge } from '@chatgbeant/ui/badge';
import { ProviderIcon } from '@chatgbeant/ui/provider-icon';
import { cn } from '@chatgbeant/ui/cn';

export default function AdminModelsPage() {
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [userSynced, setUserSynced] = useState(false);
  const getOrCreateUser = useMutation(api.users.getOrCreate);

  useEffect(() => {
    void getOrCreateUser().then(() => setUserSynced(true));
  }, [getOrCreateUser]);

  const models = useQuery(
    api.openrouter.listAllModelsAdmin,
    userSynced ? {} : 'skip',
  );
  const syncModels = useAction(api.openrouter.syncModels);
  const toggleActive = useMutation(api.openrouter.toggleModelActive);
  const toggleFeatured = useMutation(api.openrouter.toggleModelFeatured);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncModels();
      toast.success(`Synced ${result.syncedCount} models from OpenRouter`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync models',
      );
    } finally {
      setSyncing(false);
    }
  };

  const filteredModels = models?.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(s) ||
      m.provider.toLowerCase().includes(s) ||
      m.openRouterId.toLowerCase().includes(s)
    );
  });

  if (!userSynced || models === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const featuredCount = models.filter((m) => m.isFeatured).length;
  const activeCount = models.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Management</h1>
          <p className="text-muted-foreground">
            {models.length} total models | {activeCount} active | {featuredCount} featured
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Models
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search models by name, provider, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-md border bg-transparent pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Model</span>
          <span>Provider</span>
          <span>Tier</span>
          <span>Featured</span>
          <span>Active</span>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {filteredModels && filteredModels.length > 0 ? (
            filteredModels.map((model) => (
              <div
                key={model._id}
                className={cn(
                  'grid grid-cols-[1fr_120px_80px_80px_80px] items-center gap-4 border-b px-4 py-3 text-sm last:border-b-0',
                  !model.isActive && 'opacity-50',
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <ProviderIcon
                    provider={model.provider}
                    modelId={model.openRouterId}
                    size={16}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{model.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {model.openRouterId}
                    </p>
                  </div>
                </div>
                <span className="text-muted-foreground">{model.provider}</span>
                <Badge
                  variant={model.tier === 'premium' ? 'default' : 'secondary'}
                  className="w-fit text-[10px]"
                >
                  {model.tier === 'premium' ? 'Pro' : 'Basic'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleFeatured({ modelId: model._id })}
                >
                  {model.isFeatured ? (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleActive({ modelId: model._id })}
                >
                  {model.isActive ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {models.length === 0
                ? 'No models synced yet. Click "Sync Models" to fetch from OpenRouter.'
                : 'No models match your search.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
