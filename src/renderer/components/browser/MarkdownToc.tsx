import React, { useMemo } from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface MarkdownTocProps {
  content: string;
  onItemClick?: (id: string) => void;
  activeId?: string;
}

export function MarkdownToc({ content, onItemClick, activeId }: MarkdownTocProps) {
  const items = useMemo(() => extractHeadings(content), [content]);

  if (items.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4 px-3">
        暂无目录
      </div>
    );
  }

  return (
    <nav className="space-y-0.5 py-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item.id)}
          className={`block w-full text-left text-xs leading-relaxed py-1 px-3 rounded-r transition-colors truncate ${
            activeId === item.id
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium border-l-2 border-primary-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border-l-2 border-transparent'
          }`}
          style={{ paddingLeft: `${12 + (item.level - 1) * 12}px` }}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}

/**
 * Extract headings from markdown content, ignoring code blocks.
 * Generates unique anchor IDs for duplicate heading names.
 */
export function extractHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const idCounts = new Map<string, number>();
  let inCodeBlock = false;

  const lines = markdown.split('\n');
  for (const line of lines) {
    // Track code block boundaries
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Match h1-h3 headings
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim()
      // Remove markdown links
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Remove inline code
      .replace(/`([^`]*)`/g, '$1')
      // Remove bold/italic markers
      .replace(/[*_]{1,3}/g, '')
      .trim();

    if (!text) continue;

    // Generate anchor ID from text
    const baseId = text
      .toLowerCase()
      .replace(/[^\w一-鿿]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Handle duplicate heading names
    const count = idCounts.get(baseId) || 0;
    idCounts.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    items.push({ id, text, level });
  }

  return items;
}
