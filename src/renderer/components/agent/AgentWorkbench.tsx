import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { EmptyState } from '../shared/EmptyState';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { AgentRun, AgentRunType, AgentRunWithSteps, AgentStep } from '../../../shared/types';

interface AgentWorkbenchProps {
  type?: AgentRunType;
  selectedRunId?: number | null;
  refreshKey?: number;
  compact?: boolean;
  onRetryRun?: (run: AgentRunWithSteps) => void;
}

interface ParsedBlueprint {
  focusTopics: string[];
  selectedFiles: Array<{ path: string; title?: string; score?: number; reason?: string }>;
  weaknessSummary?: string;
  questionCount?: number;
}

const typeLabels: Record<AgentRunType, string> = {
  quiz_generation: '智能出题',
  material_generation: '资料生成',
  wrong_answer_review: '错题复盘',
  interview_import: '面试导入',
};

const statusLabels = {
  pending: '待开始',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
};

const statusColors = {
  pending: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
} as const;

export function AgentWorkbench({ type, selectedRunId, refreshKey = 0, compact = false, onRetryRun }: AgentWorkbenchProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(selectedRunId ?? null);
  const [selectedRun, setSelectedRun] = useState<AgentRunWithSteps | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns(selectedRunId ?? null);
  }, [type, refreshKey, selectedRunId]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRun(null);
      return;
    }
    loadRun(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || selectedRun?.status !== 'running') return;
    const timer = window.setInterval(() => loadRun(selectedId), 1800);
    return () => window.clearInterval(timer);
  }, [selectedId, selectedRun?.status]);

  async function loadRuns(preferredId?: number | null) {
    setLoadingRuns(true);
    setError(null);
    try {
      const data = await window.electronAPI.listAgentRuns(type);
      setRuns(data);
      const candidateId = preferredId ?? selectedId ?? data[0]?.id ?? null;
      const nextId = candidateId && data.some((run) => run.id === candidateId) ? candidateId : data[0]?.id ?? null;
      setSelectedId(nextId);
      if (!nextId) setSelectedRun(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoadingRuns(false);
    }
  }

  async function loadRun(id: number) {
    setLoadingRun(true);
    setError(null);
    try {
      const run = await window.electronAPI.getAgentRun(id);
      setSelectedRun(run);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoadingRun(false);
    }
  }

  const selectedBlueprint = useMemo(() => parseBlueprint(selectedRun), [selectedRun]);

  if (loadingRuns) {
    return <LoadingSpinner message="加载 Agent 工作台..." />;
  }

  return (
    <section className={`overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${compact ? '' : 'min-h-[640px]'}`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-950 dark:text-white">Agent 工作台</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            追踪搜集、筛选、生成、校验与失败修复过程
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => loadRuns(selectedRunId ?? selectedId)}>
          刷新
        </Button>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {runs.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<AgentIcon />}
            title="还没有 Agent 运行记录"
            description="启动一次智能生成后，这里会展示每一步的输入、输出、错误和资料来源。"
          />
        </div>
      ) : (
        <div className={compact ? 'grid min-h-[420px] lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)]' : 'grid min-h-[580px] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]'}>
          <aside className="border-b border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-950/40 lg:border-b-0 lg:border-r">
            <div className="max-h-72 overflow-y-auto p-2 lg:max-h-[580px]">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedId(run.id)}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedId === run.id
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">{run.title}</span>
                    <Badge color={statusColors[run.status]}>{statusLabels[run.status]}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{typeLabels[run.type]}</span>
                    <span>{formatDate(run.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0">
            {loadingRun && !selectedRun ? (
              <LoadingSpinner message="加载运行详情..." />
            ) : selectedRun ? (
              <RunDetail
                run={selectedRun}
                blueprint={selectedBlueprint}
                compact={compact}
                onRetryRun={onRetryRun}
              />
            ) : (
              <div className="p-8">
                <EmptyState icon={<AgentIcon />} title="选择一次 Agent 运行" description="查看步骤详情、模型策略和资料来源。" />
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  );
}

function RunDetail({ run, blueprint, compact, onRetryRun }: {
  run: AgentRunWithSteps;
  blueprint: ParsedBlueprint | null;
  compact: boolean;
  onRetryRun?: (run: AgentRunWithSteps) => void;
}) {
  const completedSteps = run.steps.filter((step) => step.status === 'completed').length;
  const progress = run.steps.length > 0 ? Math.round((completedSteps / run.steps.length) * 100) : 0;
  const modelStrategy = run.steps.find((step) => step.name.includes('生成中文试题') && step.input)?.input
    || (run.type === 'quiz_generation' ? 'DeepSeek v4 pro · thinking enabled · high reasoning effort · 180s timeout' : 'DeepSeek · structured generation');

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-950 dark:text-white">{run.title}</h3>
            <Badge color={statusColors[run.status]}>{statusLabels[run.status]}</Badge>
            <Badge color="purple">{typeLabels[run.type]}</Badge>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            创建 {formatDate(run.created_at)} · 更新 {formatDate(run.updated_at)}
          </p>
        </div>
        {run.type === 'quiz_generation' && onRetryRun && (
          <Button size="sm" variant={run.status === 'failed' ? 'primary' : 'secondary'} onClick={() => onRetryRun(run)}>
            按本次设置重试
          </Button>
        )}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full ${run.status === 'failed' ? 'bg-red-500' : 'bg-primary-500'}`} style={{ width: `${progress}%` }} />
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-3'}`}>
        <SummaryPanel title="输入摘要" value={run.input_summary} />
        <SummaryPanel title="输出摘要" value={run.output_summary} />
        <SummaryPanel title="模型策略" value={modelStrategy} />
      </div>

      {blueprint && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">资料与出题蓝图</h4>
            {typeof blueprint.questionCount === 'number' && <Badge color="blue">{blueprint.questionCount} 题</Badge>}
            {blueprint.focusTopics.length > 0 && <Badge color="purple">{blueprint.focusTopics.length} 个焦点</Badge>}
            <Badge color="green">{blueprint.selectedFiles.length} 个资料</Badge>
          </div>
          {blueprint.weaknessSummary && (
            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{blueprint.weaknessSummary}</p>
          )}
          {blueprint.focusTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {blueprint.focusTopics.map((topic) => <Badge key={topic} color="purple">{topic}</Badge>)}
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {blueprint.selectedFiles.slice(0, 8).map((file) => (
              <div key={file.path} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-200">{file.title || basename(file.path)}</span>
                  {typeof file.score === 'number' && <span className="shrink-0 text-gray-400">score {file.score}</span>}
                </div>
                <p className="mt-0.5 truncate text-gray-400">{file.path}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {run.steps.map((step) => <StepDetail key={step.id} step={step} />)}
      </div>
    </div>
  );
}

function StepDetail({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(step.status === 'failed' || step.status === 'running');
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${stepDotClass(step.status)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{step.order_index}. {step.name}</span>
            <span className="text-xs text-gray-400">{statusLabels[step.status]}</span>
          </div>
          {step.output && !open && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{step.output}</p>}
          {step.error && !open && <p className="mt-1 truncate text-xs text-red-500">{step.error}</p>}
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <DetailBlock label="输入" value={step.input} />
          <DetailBlock label="输出" value={step.output} />
          <DetailBlock label="错误" value={step.error} tone="error" />
        </div>
      )}
    </div>
  );
}

function SummaryPanel({ title, value }: { title: string; value: string | null }) {
  const pretty = value ? prettify(value) : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-400">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-gray-700 dark:text-gray-300">{pretty || '暂无'}</p>
    </div>
  );
}

function DetailBlock({ label, value, tone }: { label: string; value: string | null; tone?: 'error' }) {
  if (!value) return null;
  const pretty = prettify(value);
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${tone === 'error' ? 'text-red-500' : 'text-gray-400'}`}>{label}</p>
      <pre className={`max-h-64 overflow-auto whitespace-pre-wrap rounded-md border px-3 py-2 text-xs leading-5 ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
      }`}>
        {pretty}
      </pre>
    </div>
  );
}

function parseBlueprint(run: AgentRunWithSteps | null): ParsedBlueprint | null {
  if (!run) return null;
  const blueprintStep = run.steps.find((step) => step.name.includes('蓝图') && step.output);
  if (!blueprintStep?.output) return null;
  try {
    const parsed = JSON.parse(blueprintStep.output);
    return {
      focusTopics: Array.isArray(parsed.focusTopics) ? parsed.focusTopics : [],
      selectedFiles: Array.isArray(parsed.selectedFiles) ? parsed.selectedFiles : [],
      weaknessSummary: parsed.weaknessSummary,
      questionCount: parsed.questionCount,
    };
  } catch {
    return null;
  }
}

function prettify(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }
  return value;
}

function stepDotClass(status: AgentStep['status']): string {
  if (status === 'completed') return 'bg-green-500';
  if (status === 'failed') return 'bg-red-500';
  if (status === 'running') return 'animate-pulse bg-yellow-500';
  return 'bg-gray-300 dark:bg-gray-700';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function basename(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function AgentIcon() {
  return (
    <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104a3 3 0 015.5 0M9.75 3.104L12 7.5l2.25-4.396M14.25 3.104v5.714c0 .597.237 1.17.659 1.591L19 14.5M5 14.5h14M5 14.5l-1.5 4.5h17L19 14.5" />
    </svg>
  );
}
