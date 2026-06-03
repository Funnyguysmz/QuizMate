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
  const [goal, setGoal] = useState('系统复习技术面试高频考点');
  const [focus, setFocus] = useState('软件开发工程师，偏中高级面试');
  const [todoCount, setTodoCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
  const [filters, setFilters] = useState<PlanFilters>({});
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<{
    hasResume: boolean;
    hasJobContext: boolean;
    resumePreview: string;
    jobContextPreview: string;
  }>({
    hasResume: false,
    hasJobContext: false,
    resumePreview: '',
    jobContextPreview: '',
  });

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

  const hasMaterials = useMemo(() => {
    return plans.some((p) => p.generated_material || p.material_file);
  }, [plans]);

  const [materialStepIndex, setMaterialStepIndex] = useState(0);

  useEffect(() => {
    if (busyAction !== 'materials') {
      setMaterialStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMaterialStepIndex(prev => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(interval);
  }, [busyAction]);

  async function loadBootData() {
    setLoading(true);
    try {
      const [loadedSettings, loadedApiKey] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getApiKey(),
      ]);
      setSettings(loadedSettings);
      setApiKey(loadedApiKey);
      // 加载简历/求职背景信息，用于通知用户
      try {
        const p = await window.electronAPI.getCandidateProfile();
        setProfileStatus({
          hasResume: !!p.resume_text,
          hasJobContext: !!p.job_context,
          resumePreview: p.resume_text ? p.resume_text.slice(0, 80) : '',
          jobContextPreview: p.job_context ? p.job_context.slice(0, 60) : '',
        });
        if (!p.resume_text && !p.job_context) {
          setNotice('建议先在设置中导入简历并填写求职背景，生成结果会更准确。');
        }
      } catch {
        // profile 加载失败不影响主流程
      }
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

  async function handleGenerateSingleMaterial(plan: StudyPlan) {
    setError(null);
    setNotice(null);
    setBusyAction('materials');
    try {
      const result = await window.electronAPI.generateStudyMaterials({
        planIds: [plan.id],
        audience: focus,
      });
      setNotice(`已为「${plan.title}」生成学习资料`);
      await loadPlans();
      setActivePlan(result.plans[0] || null);
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
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* API Key Banner */}
        {!apiKey && (
          <div className="flex flex-col gap-3 rounded-t-lg border-b border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 md:flex-row md:items-center">
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

        {/* Header with title and metrics */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-white">学习计划工作台</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              先用 DeepSeek 结合本地文档生成 TODO，调整计划后再生成可阅读的学习资料；文稿会持久化到本地资料目录，放在 iCloud 路径下时会跟随 iCloud 同步。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center shrink-0">
            <Metric label="计划" value={progress.total} />
            <Metric label="资料" value={progress.materials} />
            <Metric label="完成" value={`${progress.done}/${progress.total}`} />
          </div>
        </div>

        {/* 3-Step Workflow */}
        <div className="p-5 space-y-0">
          {/* Step 1: Candidate Profile */}
          <div className="flex items-start gap-3 py-4">
            <StepNumber number={1} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">候选人画像</h3>
              <div className="space-y-1.5">
                {profileStatus.hasResume ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate">已导入简历：{profileStatus.resumePreview}...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>未导入简历</span>
                  </div>
                )}
                {profileStatus.hasJobContext ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate">已填写求职背景：{profileStatus.jobContextPreview}...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>未填写求职背景</span>
                  </div>
                )}
                {!profileStatus.hasResume && !profileStatus.hasJobContext && (
                  <p className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>建议在「设置」中导入简历并填写求职背景，生成结果会更准确</p>
                )}
              </div>
            </div>
          </div>

          <StepDivider />

          {/* Step 2: Plan Generation */}
          <div className="flex items-start gap-3 py-4">
            <StepNumber number={2} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">计划生成</h3>
                {plans.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已生成 {plans.length} 个学习计划</span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px]">
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="学习目标"
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <input
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  placeholder="求职方向"
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={todoCount}
                  onChange={(event) => setTodoCount(Number(event.target.value))}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={handleGenerateTodos} loading={busyAction === 'todos'} disabled={!apiKey || !goal.trim()}>
                  一键生成 TODO
                </Button>
                <Button variant="secondary" onClick={() => { setEditingPlan(null); setShowForm(true); }}>
                  手动添加条目
                </Button>
              </div>
            </div>
          </div>

          <StepDivider />

          {/* Step 3: Material Generation */}
          <div className="flex items-start gap-3 py-4">
            <StepNumber number={3} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">资料生成</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleGenerateMaterials}
                  loading={busyAction === 'materials'}
                  disabled={!apiKey || plans.length === 0}
                >
                  下一步：搜集资料并生成学习资料
                </Button>
              </div>
              {/* Static step hints */}
              {busyAction !== 'materials' && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  将依次执行：① 分析计划 → ② 搜集本地资料 → ③ 生成学习资料 → ④ 保存到本地资料目录
                </p>
              )}
              {/* Animated step hints when generating */}
              {busyAction === 'materials' && (
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <StepHint active={materialStepIndex === 0} text="① 分析计划" />
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <StepHint active={materialStepIndex === 1} text="② 搜集本地资料" />
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <StepHint active={materialStepIndex === 2} text="③ 生成学习资料" />
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <StepHint active={materialStepIndex === 3} text="④ 保存到本地资料目录" />
                </div>
              )}
              {settings && (
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  资料目录：{settings.study_materials_path}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error / Notice */}
        {(error || notice) && (
          <div className={`mx-5 mb-5 rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'}`}>
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
              onGenerateMaterial={handleGenerateSingleMaterial}
            />
          )}
        </section>

        <section className="min-h-[520px] min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {activePlan?.generated_material ? (
            <div className="h-full overflow-auto p-6">
              <MarkdownViewer content={activePlan.generated_material} filePath={activePlan.material_file || activePlan.title} />
            </div>
          ) : plans.length > 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <EmptyState
                icon={<StudyIcon />}
                title="准备开始学习"
                description={hasMaterials
                  ? '点击左侧计划卡片上的「进入学习」按钮查看已生成的学习资料'
                  : '还没有生成学习资料。请先在左侧选择计划，然后点击「下一步」生成资料'
                }
              />
              {!hasMaterials && plans.length > 0 && (
                <div className="flex justify-center pb-4">
                  <Button onClick={handleGenerateMaterials} loading={busyAction === 'materials'} size="sm">
                    为所有计划生成资料
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={<StudyIcon />}
                title="还没有学习计划"
                description="请先在左侧生成或手动创建学习计划"
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

function StepNumber({ number }: { number: number }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
      {number}
    </div>
  );
}

function StepDivider() {
  return (
    <div className="ml-[14px] border-l border-gray-200 dark:border-gray-700 h-4" />
  );
}

function StepHint({ active, text }: { active: boolean; text: string }) {
  return (
    <span className={active ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400 dark:text-gray-500'}>
      {text}
    </span>
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
