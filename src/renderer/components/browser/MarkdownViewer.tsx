import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownViewerProps {
  content: string;
  filePath: string;
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const fileName = useMemo(() => filePath.split('/').pop() || filePath, [filePath]);

  const fontSizeClass = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg',
  }[fontSize];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{fileName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filePath}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['sm', 'base', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  fontSize === size
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {size === 'sm' ? '小' : size === 'base' ? '中' : '大'}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            title="复制内容"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`p-1.5 rounded transition-colors ${
              showRaw ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="切换原始/渲染视图"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
          {content}
        </pre>
      ) : (
        <article className={`prose dark:prose-invert ${fontSizeClass} max-w-none`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
