import React, { useEffect, useState } from 'react';
import { FileTree } from '../components/browser/FileTree';
import { MarkdownViewer } from '../components/browser/MarkdownViewer';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import type { FileNode } from '../../shared/types';

export function DocumentBrowserPage() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    loadFileTree();
  }, []);

  async function loadFileTree() {
    try {
      const settings = await window.electronAPI.getSettings();
      const tree = await window.electronAPI.getFileTree(settings.study_materials_path);
      setFileTree(tree);
    } catch (e) {
      console.error('Failed to load file tree:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFile(filePath: string) {
    setSelectedFile(filePath);
    setContentLoading(true);
    try {
      const text = await window.electronAPI.readMarkdownFile(filePath);
      setContent(text);
    } catch (e) {
      console.error('Failed to read file:', e);
      setContent('Failed to load file content.');
    } finally {
      setContentLoading(false);
    }
  }

  async function handleOpenExternal(filePath: string) {
    await window.electronAPI.openExternalFile(filePath);
  }

  if (loading) {
    return <LoadingSpinner message="加载文档列表..." />;
  }

  return (
    <div className="flex gap-4 h-full -m-6">
      <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">文件列表</h2>
          <button
            onClick={loadFileTree}
            className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
          >
            刷新
          </button>
        </div>
        {fileTree.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4 text-center">文件夹为空</p>
        ) : (
          <FileTree
            nodes={fileTree}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onOpenExternal={handleOpenExternal}
          />
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {contentLoading ? (
          <LoadingSpinner message="加载文档..." />
        ) : selectedFile && content ? (
          <MarkdownViewer content={content} filePath={selectedFile} />
        ) : (
          <EmptyState
            icon={<DocumentIcon />}
            title="选择一份文档"
            description="从左侧文件列表中选择一份 Markdown 文件开始阅读"
          />
        )}
      </div>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
