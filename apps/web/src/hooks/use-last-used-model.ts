'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'chatgbeant:lastUsedModel';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

// Check if we're in a browser environment
const isBrowser = typeof globalThis !== 'undefined' && !!globalThis.window;

// Subscribers for the external store
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getSnapshot(): string {
  if (!isBrowser) {
    return DEFAULT_MODEL;
  }
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MODEL;
}

function getServerSnapshot(): string {
  return DEFAULT_MODEL;
}

function notifySubscribers() {
  for (const callback of subscribers) {
    callback();
  }
}

/**
 * Hook to get and set the last used model from localStorage.
 * Uses useSyncExternalStore for proper React 18 concurrent mode support.
 * 
 * This is synchronous and immediately available - no server roundtrip needed.
 */
export function useLastUsedModel() {
  const lastUsedModel = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setLastUsedModel = useCallback((model: string) => {
    if (!isBrowser) return;
    localStorage.setItem(STORAGE_KEY, model);
    notifySubscribers();
  }, []);

  return [lastUsedModel, setLastUsedModel] as const;
}

/**
 * Get the last used model directly (non-hook version for initial values).
 * Safe to call during SSR - returns default model.
 */
export function getLastUsedModel(): string {
  if (!isBrowser) {
    return DEFAULT_MODEL;
  }
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MODEL;
}

/**
 * Set the last used model directly (non-hook version).
 */
export function setLastUsedModel(model: string): void {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, model);
  notifySubscribers();
}
