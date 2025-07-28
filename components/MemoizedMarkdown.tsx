'use client';

import { marked } from 'marked';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  code: ({ className, children, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="bg-blue-100 px-1 py-0.5 rounded text-sm font-mono break-words"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre
        className="bg-blue-100 p-3 rounded border border-blue-200 overflow-x-auto max-w-full whitespace-pre-wrap break-words"
        {...props}
      >
        <code className="text-sm font-mono">{children}</code>
      </pre>
    );
  },
  pre: ({ children, ...props }: any) => (
    <pre
      className="bg-blue-100 p-3 rounded border border-blue-200 overflow-x-auto max-w-full whitespace-pre-wrap"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto max-w-full my-4">
      <table className="min-w-full border-collapse border border-gray-200" {...props}>
        {children}
      </table>
    </div>
  ),
  p: ({ children, ...props }: any) => (
    <p className="break-words text-black" {...props}>
      {children}
    </p>
  ),
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <div className="max-w-full overflow-hidden break-words">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content;
  }
);
MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const MemoizedMarkdown = memo(({ content, id }: { content: string; id: string }) => {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);
  return blocks.map((block, index) => (
    <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
  ));
});
MemoizedMarkdown.displayName = 'MemoizedMarkdown';