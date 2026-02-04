'use client';

import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, LogOut, FileText, Shield } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@chatgbeant/ui/card';
import { cn } from '@chatgbeant/ui/cn';

const themes = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme: currentTheme, setTheme } = useTheme();
  const currentUser = useQuery(api.users.getCurrent);
  const settings = useQuery(api.settings.getSettings);
  const updateTheme = useMutation(api.settings.updateTheme);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme);
    await updateTheme({ theme });
  };

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
                  {currentUser?.tier === 'pro' ? 'Pro' : 'Basic'} Plan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
