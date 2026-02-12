'use client';

import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, LogOut, FileText, Shield, Key, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@chatgbeant/ui/card';
import { cn } from '@chatgbeant/ui/cn';

const themes = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

function ApiKeyInput({
  label,
  provider,
  currentKeyLast4,
  hasKey,
}: {
  label: string;
  provider: 'openrouter' | 'fal';
  currentKeyLast4: string | null;
  hasKey: boolean;
}) {
  const [keyValue, setKeyValue] = useState('');
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const saveApiKey = useMutation(api.apiKeys.saveApiKey);
  const removeApiKey = useMutation(api.apiKeys.removeApiKey);
  const validateOpenRouterKey = useAction(api.apiKeys.validateOpenRouterKey);
  const validateFalKey = useAction(api.apiKeys.validateFalKey);

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    setValidating(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const result = provider === 'openrouter'
        ? await validateOpenRouterKey({ apiKey: keyValue.trim() })
        : await validateFalKey({ apiKey: keyValue.trim() });

      if (result.valid) {
        await saveApiKey({ provider, apiKey: keyValue.trim() });
        setStatus('valid');
        setKeyValue('');
        toast.success(`${label} key saved successfully`);
      } else {
        setStatus('invalid');
        setErrorMsg(result.error ?? 'Invalid key');
      }
    } catch {
      setStatus('invalid');
      setErrorMsg('Failed to validate key');
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = async () => {
    await removeApiKey({ provider });
    setStatus('idle');
    toast.success(`${label} key removed`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hasKey && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            Active ({currentKeyLast4})
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          placeholder={hasKey ? 'Replace existing key...' : 'Paste your API key...'}
          value={keyValue}
          onChange={(e) => {
            setKeyValue(e.target.value);
            setStatus('idle');
            setErrorMsg('');
          }}
          className={cn(
            'flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring',
            status === 'invalid' && 'border-destructive focus:ring-destructive',
            status === 'valid' && 'border-green-500 focus:ring-green-500',
          )}
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!keyValue.trim() || validating}
        >
          {validating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Save'
          )}
        </Button>
        {hasKey && (
          <Button size="sm" variant="outline" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {status === 'invalid' && errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme: currentTheme, setTheme } = useTheme();
  const currentUser = useQuery(api.users.getCurrent);
  const settings = useQuery(api.settings.getSettings);
  const apiKeys = useQuery(api.apiKeys.getUserApiKeys);
  const updateTheme = useMutation(api.settings.updateTheme);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme);
    await updateTheme({ theme });
  };

  const isPro = currentUser?.tier === 'pro';
  const hasByok = apiKeys?.hasByok ?? false;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose your preferred theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent',
                    (currentTheme === value || (settings && 'theme' in settings && settings.theme === value))
                      ? 'border-primary bg-accent'
                      : 'border-transparent',
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">
                  {user?.fullName ?? 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses[0]?.emailAddress ?? 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">
                  {isPro ? 'Pro' : hasByok ? 'Basic + BYOK' : 'Basic'} Plan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys (BYOK) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys (Bring Your Own Key)
            </CardTitle>
            <CardDescription>
              Add your own API keys to access all models including pro-tier models, image generation, and video generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApiKeyInput
              label="OpenRouter API Key"
              provider="openrouter"
              currentKeyLast4={apiKeys?.openRouterKeyLast4 ?? null}
              hasKey={apiKeys?.hasOpenRouterKey ?? false}
            />
            <ApiKeyInput
              label="fal.ai API Key"
              provider="fal"
              currentKeyLast4={apiKeys?.falKeyLast4 ?? null}
              hasKey={apiKeys?.hasFalKey ?? false}
            />
            <p className="text-xs text-muted-foreground">
              Your keys are stored securely and only used for API calls on your behalf. They are never shared.
            </p>
          </CardContent>
        </Card>

        {/* Upgrade Info — shown for non-pro, non-BYOK users */}
        {!isPro && !hasByok && (
          <Card>
            <CardHeader>
              <CardTitle>Unlock Pro Models</CardTitle>
              <CardDescription>
                Get access to all models, image generation, and video generation by adding your own API keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create a free account, generate an API key, and paste it in the API Keys section above.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    OpenRouter
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://fal.ai/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    fal.ai
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Your token usage for the current period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Basic Tokens Used</span>
              <span className="text-sm font-medium">
                {currentUser?.basicTokensUsed ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Premium Tokens Used</span>
              <span className="text-sm font-medium">
                {currentUser?.premiumTokensUsed ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
            <CardDescription>
              Review our policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/terms-of-service">
                <FileText className="mr-2 h-4 w-4" />
                Terms of Service
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/privacy-policy">
                <Shield className="mr-2 h-4 w-4" />
                Privacy Policy
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
