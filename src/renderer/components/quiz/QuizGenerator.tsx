import React, { useEffect, useState } from 'react';
import { FileTree } from '../browser/FileTree';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { FileNode } from '../../../shared/types';

interface QuizGeneratorProps {
  onGenerate: (files: string[], questionCount: number) => void;
  generating: boolean;
}

export function QuizGenerator({ onGenerate, generating }: QuizGeneratorProps) {
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
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          选择学习资料（{selectedFiles.length} 个文件已选）
        </h3>
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

      <Button
        onClick={() => onGenerate(selectedFiles, questionCount)}
        disabled={selectedFiles.length === 0 || generating || apiKeyMissing}
        loading={generating}
        className="w-full"
      >
        {apiKeyMissing
          ? '请先在设置中配置 DeepSeek API Key'
          : selectedFiles.length === 0
          ? '请先选择学习资料'
          : generating
          ? 'AI 正在生成试题...'
          : '生成测验'}
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
