import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MarkdownViewer } from '../components/browser/MarkdownViewer';
import { MarkdownToc } from '../components/browser/MarkdownToc';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/shared/Button';
import type { StudyPlan } from '../../shared/types';

export function StudyMaterialPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterial();
  }, [planId]);

  async function loadMaterial() {
    setLoading(true);
    setPlan(null);
    setContent(null);
    setError(null);
    try {
      const loadedPlan = await window.electronAPI.getPlan(Number(planId));
      if (!loadedPlan) {
        setError('未找到该学习计划');
        setLoading(false);
        return;
      }
      setPlan(loadedPlan);

      // Prefer material_file content, fallback to generated_material
      if (loadedPlan.material_file) {
        try {
          const fileContent = await window.electronAPI.readMarkdownFile(loadedPlan.material_file);
          setContent(fileContent);
        } catch {
          setContent(loadedPlan.generated_material || null);
        }
      } else if (loadedPlan.generated_material) {
        setContent(loadedPlan.generated_material);
      }
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="加载学习资料..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <button onClick={() => navigate('/plan')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          ← 返回学习计划
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!plan) return null;

  if (content) {
    return (
      <div className="flex flex-col h-full -m-4">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="min-w-0">
            <button onClick={() => navigate('/plan')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ← 返回学习计划
            </button>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mt-0.5 truncate">{plan.title}</h2>
            {plan.category && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{plan.category}</span>
            )}
            {plan.material_file && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-lg">{plan.material_file}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {plan.material_file && (
              <Button variant="secondary" size="sm" onClick={() => window.electronAPI.openExternalFile(plan.material_file!)}>
                在外部打开
              </Button>
            )}
          </div>
        </div>

        {/* Body: TOC sidebar + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left TOC sidebar */}
          <aside className="w-56 lg:w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            <div className="px-3 pt-3 pb-1">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">目录</h3>
            </div>
            <MarkdownToc
              content={content}
              onItemClick={(id) => {
                const el = document.getElementById(id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            />
          </aside>

          {/* Right content */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-6 lg:px-10 py-6 max-w-3xl">
              <MarkdownViewer content={content} filePath={plan.material_file || plan.title} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // No content: show empty state
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button onClick={() => navigate('/plan')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        ← 返回学习计划
      </button>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <EmptyState
          icon={<MaterialEmptyIcon />}
          title="还没有学习资料"
          description="这条计划还没有生成学习资料。返回工作台，选中该计划后点击「生成资料」。"
        />
        <div className="flex justify-center mt-4">
          <Button variant="secondary" onClick={() => navigate('/plan')}>
            ← 返回学习计划工作台
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message;
}

function MaterialEmptyIcon() {
  return (
    <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
    </svg>
  );
}
