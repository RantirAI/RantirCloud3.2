import React, { Suspense } from 'react';

// Lazy load ReactMarkdown to avoid initialization issues
const ReactMarkdown = React.lazy(() => import('react-markdown'));

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  // Fallback for loading state
  const fallback = (
    <div className={`whitespace-pre-wrap break-words text-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 ${className}`}>
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
    </Suspense>
  );
}
