'use client';

import { Bot } from 'lucide-react';

import { cn } from '../lib/utils';

interface ProviderIconProps {
  provider: string;
  modelId?: string;
  className?: string;
  size?: number;
}

function AnthropicIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.304 3.54l-5.19 14.04h3.304l1.076-2.88h5.062l1.076 2.88H26L20.81 3.54h-3.506zm.266 8.63l1.646-4.632 1.646 4.632h-3.292zM11.686 3.54H8.18L3 17.58h3.368l1.076-2.88h5.062l1.076 2.88h3.368L11.686 3.54zm-3.24 8.63l1.646-4.632 1.646 4.632H8.446z" />
    </svg>
  );
}

function OpenAIIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function GoogleIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

function DeepSeekIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
    </svg>
  );
}

function MetaIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.02.76-.77 1.57-1.79 2.4-3.07l.468-.72.118-.185.062-.1c.593-.952 1.16-1.862 1.782-2.657.454-.57.893-1.04 1.324-1.39a4.31 4.31 0 0 1 1.1-.64c.387-.152.71-.218.996-.218 1.092 0 1.973.585 2.581 1.47.61.884.923 2.072.923 3.358 0 1.287-.313 2.474-.923 3.358-.608.886-1.49 1.471-2.581 1.471-.287 0-.61-.066-.996-.218a4.31 4.31 0 0 1-1.1-.64c-.432-.35-.87-.82-1.324-1.39-.622-.795-1.19-1.705-1.782-2.657l-.062-.1-.118-.185-.469-.72c-.829-1.28-1.64-2.3-2.4-3.07-1.331-1.349-2.467-2.02-3.964-2.02-1.775 0-2.897.768-3.593 1.927a5.297 5.297 0 0 0-.371.761 6.624 6.624 0 0 0-.265.86 8.382 8.382 0 0 0-.21 1.973c0 2.566.704 5.241 2.044 7.306 1.188 1.833 2.903 3.113 4.871 3.113 1.775 0 2.897-.768 3.593-1.927a5.297 5.297 0 0 0 .371-.761 6.624 6.624 0 0 0 .265-.86c.14-.604.21-1.267.21-1.973 0-2.566-.704-5.241-2.044-7.306C9.598 5.31 7.883 4.03 6.915 4.03z" />
    </svg>
  );
}

function XAIIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M2.5 3L9.5 12L2.5 21H5.5L12 13.5L18.5 21H21.5L14.5 12L21.5 3H18.5L12 10.5L5.5 3H2.5Z" />
    </svg>
  );
}

function MistralIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3 3h4v4H3V3zm7 0h4v4h-4V3zm7 0h4v4h-4V3zM3 10h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4zM3 17h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4z" />
    </svg>
  );
}

function getProviderFromModelId(modelId: string): string {
  const prefix = modelId.split('/')[0]?.toLowerCase() ?? '';
  const providerMap: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    deepseek: 'DeepSeek',
    meta: 'Meta',
    'meta-llama': 'Meta',
    'x-ai': 'xAI',
    xai: 'xAI',
    mistral: 'Mistral',
    mistralai: 'Mistral',
  };
  return providerMap[prefix] ?? prefix;
}

export function ProviderIcon({ provider, modelId, className, size = 16 }: ProviderIconProps) {
  const normalizedProvider = modelId
    ? getProviderFromModelId(modelId).toLowerCase()
    : provider.toLowerCase();

  const iconProps = { className: cn('shrink-0', className), size };

  switch (normalizedProvider) {
    case 'anthropic':
      return <AnthropicIcon {...iconProps} />;
    case 'openai':
      return <OpenAIIcon {...iconProps} />;
    case 'google':
      return <GoogleIcon {...iconProps} />;
    case 'deepseek':
      return <DeepSeekIcon {...iconProps} />;
    case 'meta':
    case 'meta-llama':
      return <MetaIcon {...iconProps} />;
    case 'xai':
    case 'x-ai':
      return <XAIIcon {...iconProps} />;
    case 'mistral':
    case 'mistralai':
      return <MistralIcon {...iconProps} />;
    default:
      return <Bot className={cn('shrink-0', className)} size={size} />;
  }
}
