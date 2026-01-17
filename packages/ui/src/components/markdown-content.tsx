'use client';

import type { Components } from 'react-markdown';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '../lib/utils';

interface MarkdownContentProps {
    content: string;
    className?: string;
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
        const isInline = !className?.includes('language-');
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
        return (
            <code
                className={cn(
                    'block overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm',
                    className,
                )}
                {...props}
            >
                {children}
            </code>
        );
    },
    pre: ({ children, ...props }) => (
        <pre className="mb-4 overflow-x-auto rounded-lg bg-muted p-4" {...props}>
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
