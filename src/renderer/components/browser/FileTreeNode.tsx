import React, { useState } from 'react';
import type { FileNode } from '../../../shared/types';

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onOpenExternal: (path: string) => void;
  selectableFiles?: string[];
  selectedFiles?: string[];
  onToggleSelect?: (path: string) => void;
  multiSelect?: boolean;
}

const fileIcons: Record<string, React.ReactNode> = {
  '.md': <MarkdownIcon />,
  '.pdf': <PdfIcon />,
  '.txt': <TextIcon />,
  '.m4a': <AudioIcon />,
  '.tex': <TexIcon />,
};

export function FileTreeNode({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onOpenExternal,
  selectableFiles,
  selectedFiles,
  onToggleSelect,
  multiSelect,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === 'directory') {
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div>
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <FolderIcon />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && hasChildren && (
          <div>
            {node.children!.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onOpenExternal={onOpenExternal}
                selectableFiles={selectableFiles}
                selectedFiles={selectedFiles}
                onToggleSelect={onToggleSelect}
                multiSelect={multiSelect}
              />
            ))}
          </div>
        )}
        {expanded && !hasChildren && (
          <p className="text-xs text-gray-400 pl-8 py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
            空文件夹
          </p>
        )}
      </div>
    );
  }

  const isMd = node.extension === '.md' || node.extension === '.txt';
  const isSelected = selectedFile === node.path;
  const isChecked = selectedFiles?.includes(node.path);
  const isSelectable = !selectableFiles || selectableFiles.includes(node.path);

  return (
    <div
      className="flex items-center gap-1.5 w-full group"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {multiSelect && isMd && (
        <input
          type="checkbox"
          checked={isChecked || false}
          disabled={!isSelectable}
          onChange={() => onToggleSelect?.(node.path)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      )}
      <button
        onClick={() => isMd ? onSelectFile(node.path) : onOpenExternal(node.path)}
        className={`flex items-center gap-1.5 flex-1 px-2 py-1 text-left text-sm rounded transition-colors ${
          isSelected
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="shrink-0">
          {fileIcons[node.extension || ''] || <FileIcon />}
        </span>
        <span className="truncate">{node.name}</span>
        {!isMd && (
          <span
            onClick={(e) => { e.stopPropagation(); onOpenExternal(node.path); }}
            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="在默认应用中打开"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}

// Inline SVG icons
function FolderIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}

function MarkdownIcon() {
  return <span className="text-xs shrink-0 w-3.5 h-3.5 flex items-center justify-center font-bold text-blue-500">M</span>;
}

function PdfIcon() {
  return <span className="text-xs shrink-0 w-3.5 h-3.5 flex items-center justify-center font-bold text-red-500">P</span>;
}

function TextIcon() {
  return <span className="text-xs shrink-0 w-3.5 h-3.5 flex items-center justify-center font-bold text-gray-500">T</span>;
}

function AudioIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function TexIcon() {
  return <span className="text-xs shrink-0 w-3.5 h-3.5 flex items-center justify-center font-bold text-green-600">Tx</span>;
}

function FileIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
