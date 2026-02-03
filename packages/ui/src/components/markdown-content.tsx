'use client';

import { useState, useCallback } from 'react';
import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

import { cn } from '../lib/utils';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

function CodeCopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard may not be available
        }
    }, [code]);

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={copied ? 'Copied' : 'Copy code'}
        >
            {copied ? (
                <>
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Copied</span>
                </>
            ) : (
                <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                </>
            )}
        </button>
    );
}

const components: Partial<Components> = {
    h1: ({ children, ...props }) => (
        <h1
            className="mb-4 mt-6 text-2xl font-bold first:mt-0"
            {...props}
        >
            {children}
        </h1>
    ),
    h2: ({ children, ...props }) => (
        <h2
            className="mb-3 mt-5 text-xl font-semibold first:mt-0"
            {...props}
        >
            {children}
        </h2>
    ),
    h3: ({ children, ...props }) => (
        <h3
            className="mb-2 mt-4 text-lg font-semibold first:mt-0"
            {...props}
        >
            {children}
        </h3>
    ),
    p: ({ children, ...props }) => (
        <p className="mb-4 leading-7 last:mb-0" {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }) => (
        <ul className="mb-4 ml-6 list-disc" {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }) => (
        <ol className="mb-4 ml-6 list-decimal" {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }) => (
        <li className="mb-1" {...props}>
            {children}
        </li>
    ),
    a: ({ children, href, ...props }) => (
        <a
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        >
            {children}
        </a>
    ),
    blockquote: ({ children, ...props }) => (
        <blockquote
            className="mt-4 border-l-4 border-muted pl-4 italic"
            {...props}
        >
            {children}
        </blockquote>
    ),
    code: ({ children, className, ...props }) => {
        const match = /language-(\w+)/.exec(className ?? '');
        const isInline = !match;
        const codeString = typeof children === 'string'
            ? children.replace(/\n$/, '')
            : '';

        if (isInline) {
            return (
                <code
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                    {...props}
                >
                    {children}
                </code>
            );
        }

        const language = match[1] ?? 'text';

        return (
            <div className="group relative mb-4">
                <div className="flex items-center justify-between rounded-t-lg bg-muted/80 px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        {language}
                    </span>
                    <CodeCopyButton code={codeString} />
                </div>
                <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        borderBottomLeftRadius: '0.5rem',
                        borderBottomRightRadius: '0.5rem',
                    }}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        );
    },
    pre: ({ children, ...props }) => (
        <pre className="overflow-x-auto [&>div]:!mb-0" {...props}>
            {children}
        </pre>
    ),
    table: ({ children, ...props }) => (
        <div className="mb-4 w-full overflow-x-auto">
            <table className="w-full border-collapse" {...props}>
                {children}
            </table>
        </div>
    ),
    th: ({ children, ...props }) => (
        <th
            className="border border-border bg-muted px-4 py-2 text-left font-semibold"
            {...props}
        >
            {children}
        </th>
    ),
    td: ({ children, ...props }) => (
        <td className="border border-border px-4 py-2" {...props}>
            {children}
        </td>
    ),
    hr: (props) => <hr className="my-6 border-border" {...props} />,
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
    return (
        <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </Markdown>
        </div>
    );
}
