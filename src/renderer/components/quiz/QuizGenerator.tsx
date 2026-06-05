import React, { useEffect, useState } from 'react';
import { FileTree } from '../browser/FileTree';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { FileNode } from '../../../shared/types';

interface QuizGeneratorProps {
  onGenerate: (files: string[], questionCount: number, focus: string) => void;
  generating: boolean;
  focus: string;
  onFocusChange: (value: string) => void;
}

export function QuizGenerator({ onGenerate, generating, focus, onFocusChange }: QuizGeneratorProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [loadingTree, setLoadingTree] = useState(true);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const settings = await window.electronAPI.getSettings();
        const tree = await window.electronAPI.getFileTree(settings.study_materials_path);
        setFileTree(tree);
        const key = await window.electronAPI.getApiKey();
        setApiKeyMissing(!key);
      } catch (e) {
        console.error('Failed to load file tree:', e);
      } finally {
        setLoadingTree(false);
      }
    }
    load();
  }, []);

  function toggleFile(path: string) {
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  const mdFiles = fileTree.flatMap(getMdFiles);

  if (loadingTree) return <LoadingSpinner message="加载文件列表..." />;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          优先参考资料（{selectedFiles.length} 个文件已选）
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          非必选。不选时 Agent 将根据历史错题和面试弱点自动筛选高价值资料。
        </p>
        <div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          {fileTree.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">文件夹为空</p>
          ) : (
            <FileTree
              nodes={fileTree}
              selectedFile={null}
              onSelectFile={() => {}}
              onOpenExternal={() => {}}
              selectableFiles={mdFiles.map((f) => f.path)}
              selectedFiles={selectedFiles}
              onToggleSelect={toggleFile}
              multiSelect
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          出题焦点
        </label>
        <input
          type="text"
          value={focus}
          onChange={(e) => onFocusChange(e.target.value)}
          placeholder="例：Android 中高级面试 / Binder / Coroutine / RecyclerView"
          className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          题目数量: {questionCount}
        </label>
        <input
          type="range"
          min="3"
          max="20"
          value={questionCount}
          onChange={(e) => setQuestionCount(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg px-3 py-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        DeepSeek thinking 高质量模式已开启
      </div>

      {generating && (
        <div className="space-y-1.5 py-2">
          {[
            '搜集历史弱点',
            '筛选高价值资料',
            '总结出题蓝图',
            'DeepSeek thinking 生成',
            '质量校验入库',
          ].map((stepName, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">{i + 1}</span>
              <span>{stepName}</span>
              <span className="ml-auto text-gray-300">...</span>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => onGenerate(selectedFiles, questionCount, focus)}
        disabled={generating || apiKeyMissing}
        loading={generating}
        className="w-full"
      >
        {apiKeyMissing
          ? '请先在设置中配置 DeepSeek API Key'
          : generating
          ? 'Agent 正在搜集资料并生成试题...'
          : '启动智能测验 Agent'}
      </Button>
    </div>
  );
}

function getMdFiles(node: FileNode): FileNode[] {
  if (node.type === 'file' && (node.extension === '.md' || node.extension === '.txt')) {
    return [node];
  }
  if (node.type === 'directory' && node.children) {
    return node.children.flatMap(getMdFiles);
  }
  return [];
}
