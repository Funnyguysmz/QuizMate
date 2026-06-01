import React, { useEffect, useMemo, useState } from 'react';
import { StudyPlanList } from '../components/plan/StudyPlanList';
import { StudyPlanForm } from '../components/plan/StudyPlanForm';
import { StudyPlanFilters } from '../components/plan/StudyPlanFilters';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/shared/Button';
import { MarkdownViewer } from '../components/browser/MarkdownViewer';
import type { AppSettings, CreatePlanInput, PlanFilters, StudyPlan, UpdatePlanInput } from '../../shared/types';

type BusyAction = 'todos' | 'materials' | null;

export function StudyPlanPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [goal, setGoal] = useState('Android 面试系统复习：协程、ViewModel、Jetpack、StateFlow、架构与性能');
  const [focus, setFocus] = useState('Android 开发工程师，偏中高级面试');
  const [todoCount, setTodoCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
  const [filters, setFilters] = useState<PlanFilters>({});
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadBootData();
  }, []);

  useEffect(() => {
    loadPlans();
  }, [filters]);

  const progress = useMemo(() => {
    const done = plans.filter((plan) => plan.status === 'done').length;
    const materials = plans.filter((plan) => plan.generated_material || plan.material_file).length;
    return { done, materials, total: plans.length };
  }, [plans]);

  async function loadBootData() {
    setLoading(true);
    try {
      const [loadedSettings, loadedApiKey] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getApiKey(),
      ]);
      setSettings(loadedSettings);
      setApiKey(loadedApiKey);
      await loadPlans();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPlans() {
    try {
      const data = await window.electronAPI.getPlans(filters);
      setPlans(data);
      setActivePlan((current) => current ? data.find((plan) => plan.id === current.id) || current : null);
    } catch (e) {
      setError(formatError(e));
    }
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) return;
    await window.electronAPI.setApiKey(apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setNotice('DeepSeek API Key 已保存，可以生成学习计划了。');
  }

  async function handleGenerateTodos() {
    setError(null);
    setNotice(null);
    setBusyAction('todos');
    try {
      const generated = await window.electronAPI.generateStudyTodos({
        goal,
        focus,
        count: todoCount,
      });
      setNotice(`已结合本地文档生成 ${generated.length} 个学习 TODO。`);
      await loadPlans();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateMaterials() {
    setError(null);
    setNotice(null);
    setBusyAction('materials');
    try {
      const targetPlans = plans.filter((plan) => plan.status !== 'done');
      const result = await window.electronAPI.generateStudyMaterials({
        planIds: targetPlans.map((plan) => plan.id),
        audience: focus,
      });
      setNotice(`已生成 ${result.plans.filter((plan) => plan.material_file).length} 份学习资料，保存在 ${result.outputDirectory}`);
      await loadPlans();
      setActivePlan(result.plans.find((plan) => plan.generated_material) || null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreate(input: CreatePlanInput) {
    await window.electronAPI.createPlan(input);
    setShowForm(false);
    await loadPlans();
  }

  async function handleUpdate(id: number, input: UpdatePlanInput) {
    await window.electronAPI.updatePlan(id, input);
    setShowForm(false);
    setEditingPlan(null);
    await loadPlans();
  }

  async function handleDelete(id: number) {
    await window.electronAPI.deletePlan(id);
    if (activePlan?.id === id) setActivePlan(null);
    await loadPlans();
  }

  async function handleStatusChange(id: number, status: string) {
    await window.electronAPI.updatePlan(id, { status: status as StudyPlan['status'] });
    await loadPlans();
  }

  function handleEdit(plan: StudyPlan) {
    setEditingPlan(plan);
    setShowForm(true);
  }

  function handleStudy(plan: StudyPlan) {
    setActivePlan(plan);
    if (plan.status === 'pending') {
      window.electronAPI.updatePlan(plan.id, { status: 'in_progress' }).then(loadPlans).catch(() => undefined);
    }
  }

  if (loading) {
    return <LoadingSpinner message="加载学习计划..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-gray-950 dark:text-white">学习计划工作台</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              先用 DeepSeek 结合本地文档生成 TODO，调整计划后再生成可阅读的学习资料；文稿会持久化到本地资料目录，放在 iCloud 路径下时会跟随 iCloud 同步。
            </p>
            {settings && (
              <p className="mt-2 truncate text-xs text-gray-400 dark:text-gray-500">
                资料目录：{settings.study_materials_path}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="计划" value={progress.total} />
            <Metric label="资料" value={progress.materials} />
            <Metric label="完成" value={`${progress.done}/${progress.total}`} />
          </div>
        </div>

        {!apiKey && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">需要先填写 DeepSeek API Key</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">Key 只保存在本机应用设置中，用于生成计划和学习资料。</p>
            </div>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="sk-..."
              className="h-9 min-w-0 rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-900 dark:bg-gray-950 dark:text-white"
            />
            <Button size="sm" onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>保存</Button>
          </div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_1fr_120px]">
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
          <input
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
          <input
            type="number"
            min={3}
            max={15}
            value={todoCount}
            onChange={(event) => setTodoCount(Number(event.target.value))}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerateTodos} loading={busyAction === 'todos'} disabled={!apiKey || !goal.trim()}>
            一键生成 TODO
          </Button>
          <Button variant="secondary" onClick={() => { setEditingPlan(null); setShowForm(true); }}>
            手动添加条目
          </Button>
          <Button onClick={handleGenerateMaterials} loading={busyAction === 'materials'} disabled={!apiKey || plans.length === 0}>
            下一步：搜集资料并生成学习资料
          </Button>
        </div>

        {(error || notice) && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'}`}>
            {error || notice}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <StudyPlanFilters filters={filters} onChange={setFilters} />
          </div>

          {plans.length === 0 ? (
            <EmptyState
              icon={<PlanIcon />}
              title="还没有学习计划"
              description="使用 AI 生成 TODO，或者先手动添加一个条目"
            />
          ) : (
            <StudyPlanList
              plans={plans}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onStudy={handleStudy}
            />
          )}
        </section>

        <section className="min-h-[520px] min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {activePlan?.generated_material ? (
            <div className="h-full overflow-auto p-6">
              <MarkdownViewer content={activePlan.generated_material} filePath={activePlan.material_file || activePlan.title} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={<StudyIcon />}
                title="选择一个已生成资料的计划"
                description="点击计划右侧的阅读按钮进入学习；没有资料时先点击下一步生成"
              />
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <StudyPlanForm
          plan={editingPlan}
          onSubmit={(input) => editingPlan ? handleUpdate(editingPlan.id, input as UpdatePlanInput) : handleCreate(input as CreatePlanInput)}
          onClose={() => { setShowForm(false); setEditingPlan(null); }}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[72px] rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-950">
      <div className="text-base font-semibold text-gray-950 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NO_API_KEY')) return '请先填写 DeepSeek API Key。';
  return message;
}

function PlanIcon() {
  return (
    <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function StudyIcon() {
  return (
    <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
    </svg>
  );
}
