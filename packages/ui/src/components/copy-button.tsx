'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '../lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  iconClassName?: string;
  onCopy?: () => void;
}

export function CopyButton({ text, className, iconClassName, onCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  }, [text, onCopy]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50',
        className,
      )}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className={cn('h-4 w-4 text-green-500', iconClassName)} />
      ) : (
        <Copy className={cn('h-4 w-4', iconClassName)} />
      )}
    </button>
  );
}
