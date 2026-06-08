import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentWorkbench } from '../components/agent/AgentWorkbench';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import type {
  AgentRunType,
  AgentRun,
  AppSettings,
  CandidateProfile,
  FileNode,
  InterviewRecord,
  SearchResult,
  StudyPlan,
  WrongAnswer,
  WrongAnswerStats,
} from '../../shared/types';

type AssistantMode = 'debrief' | 'goal' | 'weakness';

interface AgentSnapshot {
  settings: AppSettings | null;
  profile: CandidateProfile | null;
  plans: StudyPlan[];
  wrongAnswers: WrongAnswer[];
  wrongStats: WrongAnswerStats | null;
  interviews: InterviewRecord[];
  fileTree: FileNode[];
  recentRuns: AgentRun[];
}

interface LocalInsight {
  title: string;
  body: string;
  tone: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
}

const filters: Array<{ label: string; value: AgentRunType | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '智能出题', value: 'quiz_generation' },
  { label: '资料生成', value: 'material_generation' },
  { label: '错题复盘', value: 'wrong_answer_review' },
  { label: '面试导入', value: 'interview_import' },
];

const modeLabels: Record<AssistantMode, string> = {
  debrief: '录入面试复盘',
  goal: '规划下一步',
  weakness: '追踪薄弱点',
};

export function AgentWorkbenchPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AgentRunType | 'all'>('all');
  const [snapshot, setSnapshot] = useState<AgentSnapshot>({
    settings: null,
    profile: null,
    plans: [],
    wrongAnswers: [],
    wrongStats: null,
    interviews: [],
    fileTree: [],
    recentRuns: [],
  });
  const [loading, setLoading] = useState(true);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('debrief');
  const [agentInput, setAgentInput] = useState('');
  const [focusQuery, setFocusQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workbenchRefreshKey, setWorkbenchRefreshKey] = useState(0);

  useEffect(() => {
    loadSnapshot();
  }, []);

  async function loadSnapshot() {
    setLoading(true);
    setError(null);
    try {
      const settings = await window.electronAPI.getSettings();
      const [profile, plans, wrongAnswers, wrongStats, interviews, recentRuns, fileTree] = await Promise.all([
        window.electronAPI.getCandidateProfile().catch(() => null),
        window.electronAPI.getPlans({}).catch(() => []),
        window.electronAPI.getWrongAnswers({ status: 'unresolved' }).catch(() => []),
        window.electronAPI.getWrongAnswerStats().catch(() => null),
        window.electronAPI.listInterviews({}).catch(() => []),
        window.electronAPI.listAgentRuns().catch(() => []),
        window.electronAPI.getFileTree(settings.study_materials_path).catch(() => []),
      ]);
      setSnapshot({ settings, profile, plans, wrongAnswers, wrongStats, interviews, recentRuns, fileTree });
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  const docStats = useMemo(() => countFileTree(snapshot.fileTree), [snapshot.fileTree]);
  const insights = useMemo(() => buildInsights(snapshot, docStats), [snapshot, docStats]);
  const nextActions = useMemo(() => buildNextActions(snapshot, agentInput || focusQuery), [snapshot, agentInput, focusQuery]);
  const currentFocus = focusQuery.trim() || extractFocusTerms(agentInput).join(' ');

  async function handleLocalSearch() {
    const query = currentFocus.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    setError(null);
    try {
      const results = await window.electronAPI.searchDocuments(query);
      setSearchResults(results.slice(0, 8));
    } catch (e) {
      setError(`本地检索失败：${formatError(e)}`);
    }
  }

  async function handleRunAssistant() {
    const content = agentInput.trim();
    if (!content) {
      setError('请先输入一次面试复盘、目标或薄弱点描述。');
      return;
    }

    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const terms = extractFocusTerms(content);
      const query = focusQuery.trim() || terms.slice(0, 4).join(' ') || content.slice(0, 40);
      const results = query ? (await window.electronAPI.searchDocuments(query)).slice(0, 8) : [];
      setSearchResults(results);

      const run = await window.electronAPI.createAgentRun({
        type: 'interview_import',
        title: `个人面试助手：${modeLabels[assistantMode]}`,
        input_summary: `${modeLabels[assistantMode]}\n焦点: ${query || '自动识别'}\n输入长度: ${content.length}`,
      });

      const interview = await maybeCreateInterview(content, query);
      const step1 = await window.electronAPI.createAgentStep({
        run_id: run.id,
        name: '接收新复盘与求职上下文',
        order_index: 1,
        input: content,
      });
      await window.electronAPI.updateAgentStep(step1.id, {
        status: 'completed',
        output: interview ? `已沉淀为面试记录 #${interview.id}` : '已作为目标/薄弱点输入进入分析',
      });

      const step2 = await window.electronAPI.createAgentStep({
        run_id: run.id,
        name: '检索本地面试资产',
        order_index: 2,
        input: `query: ${query}`,
      });
      await window.electronAPI.updateAgentStep(step2.id, {
        status: 'completed',
        output: results.length
          ? results.map((item, index) => `${index + 1}. ${item.fileName}:${item.lineNumber} ${item.excerpt}`).join('\n')
          : '没有找到直接命中的本地文档，建议补充复盘或扩大关键词。',
      });

      const step3 = await window.electronAPI.createAgentStep({
        run_id: run.id,
        name: '生成下一步行动编排',
        order_index: 3,
        input: JSON.stringify({ terms, unresolvedWrongAnswers: snapshot.wrongAnswers.length, pendingPlans: snapshot.plans.filter((p) => p.status !== 'done').length }, null, 2),
      });
      await window.electronAPI.updateAgentStep(step3.id, {
        status: 'completed',
        output: nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
      });

      await window.electronAPI.updateAgentRun(run.id, {
        status: 'completed',
        output_summary: `已检索 ${results.length} 条本地资料线索，生成 ${nextActions.length} 个下一步行动。`,
      });

      setNotice('Agent 已接收这次输入，并把复盘、检索结果和下一步行动沉淀到运行记录。');
      setAgentInput('');
      await loadSnapshot();
      setWorkbenchRefreshKey((value) => value + 1);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setRunning(false);
    }
  }

  async function maybeCreateInterview(content: string, query: string) {
    if (assistantMode !== 'debrief') return null;
    const company = inferCompany(content) || '未命名面试复盘';
    return window.electronAPI.createInterview({
      company,
      result: inferResult(content),
      interviewer_focus: query || null,
      observations: buildObservation(content),
      raw_notes: content,
    });
  }

  if (loading) {
    return <LoadingSpinner message="加载个人面试助手..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white">QuizMate 2.0 个人面试助手</h2>
              <Badge color="purple">Agent 中枢</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              这里会聚合你的本地文档、面试复盘、错题、学习计划和候选人背景。你输入新的复盘或目标后，Agent 会先检索本地资产，再沉淀为可追踪的行动编排。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/browser')}>文档浏览</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/plan')}>学习计划</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/wrong-answers')}>错题回顾</Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
            {notice}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="本地资料资产" value={`${docStats.files}`} detail={`${docStats.directories} 个目录 · ${snapshot.settings?.study_materials_path || '未设置路径'}`} />
          <MetricCard label="面试复盘" value={`${snapshot.interviews.length}`} detail={summarizeInterviewResults(snapshot.interviews)} />
          <MetricCard label="未解决错题" value={`${snapshot.wrongAnswers.length}`} detail={snapshot.wrongStats ? `总错题 ${snapshot.wrongStats.total} · 已解决 ${snapshot.wrongStats.resolved}` : '等待错题数据'} />
          <MetricCard label="学习计划" value={`${snapshot.plans.filter((p) => p.status !== 'done').length}`} detail={`${snapshot.plans.filter((p) => p.status === 'done').length} 个已完成`} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-950 dark:text-white">和个人助手对齐下一步</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">输入新面试复盘、近期目标或某个答不好的主题。</p>
            </div>
            <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
              {(Object.keys(modeLabels) as AssistantMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAssistantMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    assistantMode === mode
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={agentInput}
            onChange={(event) => setAgentInput(event.target.value)}
            rows={9}
            className="mt-4 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-primary-700 dark:focus:ring-primary-950"
            placeholder="例如：今天字节 Android 一面，Coroutine 状态机和 RecyclerView 缓存追问答得不稳，项目指标也讲得不够具体。希望下周前补齐这几个点，并生成一套模拟面试。"
          />

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={focusQuery}
              onChange={(event) => setFocusQuery(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-primary-700 dark:focus:ring-primary-950"
              placeholder="可选：手动指定检索关键词，如 Binder StateFlow 项目指标"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleLocalSearch}>只检索</Button>
              <Button loading={running} onClick={handleRunAssistant}>沉淀到 Agent</Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {nextActions.map((action, index) => (
              <div key={action} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                <p className="text-xs font-medium text-gray-400">行动 {index + 1}</p>
                <p className="mt-1 text-sm leading-6 text-gray-800 dark:text-gray-200">{action}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-950 dark:text-white">当前画像</h3>
            <div className="mt-3 space-y-2">
              {insights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-950 dark:text-white">本地检索结果</h3>
              <Badge color="blue">{searchResults.length} 条</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">输入复盘后点击“只检索”或“沉淀到 Agent”，这里会显示本地资料命中结果。</p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={`${result.filePath}:${result.lineNumber}`}
                    onClick={() => window.electronAPI.openExternalFile(result.filePath)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-primary-300 dark:border-gray-800 dark:bg-gray-950/40 dark:hover:border-primary-800"
                  >
                    <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{result.fileName}:{result.lineNumber}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{result.excerpt}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-950 dark:text-white">1.0 执行日志</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">保留原有 Agent run 追踪，用来复盘每次生成、导入、失败修复的细节。</p>
          </div>
          <div className="flex flex-wrap rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
            {filters.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <AgentWorkbench type={filter === 'all' ? undefined : filter} refreshKey={workbenchRefreshKey} />
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: LocalInsight }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="flex items-center gap-2">
        <Badge color={insight.tone}>{insight.title}</Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300">{insight.body}</p>
    </div>
  );
}

function buildInsights(snapshot: AgentSnapshot, docStats: ReturnType<typeof countFileTree>): LocalInsight[] {
  const failedInterviews = snapshot.interviews.filter((item) => item.result === 'failed').length;
  const pendingPlans = snapshot.plans.filter((plan) => plan.status !== 'done').length;
  const failedRuns = snapshot.recentRuns.filter((run) => run.status === 'failed').length;
  const hasProfile = Boolean(snapshot.profile?.resume_text || snapshot.profile?.job_context);

  return [
    {
      title: failedInterviews > 0 ? '失败样本可分析' : '复盘样本不足',
      body: failedInterviews > 0
        ? `已有 ${failedInterviews} 次失败/未通过记录，适合继续抽取高频弱点和追问失败点。`
        : '建议先录入最近一次真实面试复盘，让 Agent 有可追踪的失败样本。',
      tone: failedInterviews > 0 ? 'yellow' : 'blue',
    },
    {
      title: snapshot.wrongAnswers.length > 0 ? '错题待闭环' : '错题压力低',
      body: snapshot.wrongAnswers.length > 0
        ? `当前有 ${snapshot.wrongAnswers.length} 道未解决错题，下一轮学习资料应优先引用这些题。`
        : '当前没有未解决错题，可以把重心放在面试复盘和项目表达。',
      tone: snapshot.wrongAnswers.length > 0 ? 'red' : 'green',
    },
    {
      title: pendingPlans > 0 ? '计划待执行' : '计划需要刷新',
      body: pendingPlans > 0
        ? `还有 ${pendingPlans} 个学习计划未完成，Agent 应按面试 ROI 重新排序。`
        : '学习计划基本清空，可以基于新的复盘生成下一轮计划。',
      tone: pendingPlans > 0 ? 'purple' : 'blue',
    },
    {
      title: hasProfile ? '画像已接入' : '缺少候选人画像',
      body: hasProfile
        ? '简历或求职背景已保存，后续计划和资料可以按你的真实目标定制。'
        : '建议在设置页导入简历并填写求职背景，否则 Agent 只能基于文档和错题推断。',
      tone: hasProfile ? 'green' : 'yellow',
    },
    {
      title: docStats.files > 0 ? '资料库可检索' : '资料库为空',
      body: docStats.files > 0
        ? `当前资料库包含 ${docStats.files} 个文件，适合支撑本地优先的 RAG 检索。`
        : '请先在设置或文档浏览页选择 iCloud 资料目录。',
      tone: docStats.files > 0 ? 'green' : 'red',
    },
    {
      title: failedRuns > 0 ? '生成失败需复盘' : '执行状态稳定',
      body: failedRuns > 0
        ? `最近有 ${failedRuns} 次 Agent run 失败，建议从下方执行日志定位模型输出或资料筛选问题。`
        : '最近运行记录没有明显失败堆积。',
      tone: failedRuns > 0 ? 'yellow' : 'green',
    },
  ];
}

function buildNextActions(snapshot: AgentSnapshot, rawFocus: string): string[] {
  const terms = extractFocusTerms(rawFocus);
  const firstTerm = terms[0] || '最近面试薄弱点';
  const unresolved = snapshot.wrongAnswers.length;
  const pendingPlans = snapshot.plans.filter((plan) => plan.status !== 'done').length;

  return [
    unresolved > 0
      ? `先把 ${unresolved} 道未解决错题按主题归并，优先生成 ${firstTerm} 的错题复盘资料。`
      : `先从本地复盘里检索 ${firstTerm}，补齐可验证的面试材料。`,
    pendingPlans > 0
      ? `重排 ${pendingPlans} 个未完成计划，把高频失败主题提前到本周。`
      : '基于这次输入生成新一轮 5-8 个 TODO 学习计划。',
    snapshot.interviews.length > 0
      ? '把最近面试记录里的追问失败点转成 mock interview 问题。'
      : '先沉淀第一条结构化面试记录，建立可持续追踪的样本库。',
  ];
}

function countFileTree(nodes: FileNode[]) {
  let files = 0;
  let directories = 0;

  function walk(items: FileNode[]) {
    for (const item of items) {
      if (item.type === 'directory') {
        directories += 1;
        walk(item.children || []);
      } else {
        files += 1;
      }
    }
  }

  walk(nodes);
  return { files, directories };
}

function extractFocusTerms(text: string): string[] {
  const knownTerms = [
    'Binder', 'Handler', 'RecyclerView', 'Coroutine', '协程', 'StateFlow', 'SharedFlow', 'ViewModel',
    'Compose', 'Kotlin', 'Java', 'AMS', 'WMS', 'Framework', '性能', '稳定性', '项目', '算法', '网络',
    '字节', '腾讯', '小红书', '懂车帝', '滴滴',
  ];
  const hits = knownTerms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  if (hits.length > 0) return Array.from(new Set(hits)).slice(0, 6);
  return text.split(/[\s,，。/、；;：:]+/).filter((part) => part.length >= 2).slice(0, 6);
}

function inferCompany(text: string): string | null {
  const companies = ['字节', '腾讯', '小红书', '懂车帝', '滴滴', '美团', '阿里', '快手', 'B站', '影石'];
  return companies.find((company) => text.includes(company)) || null;
}

function inferResult(text: string) {
  if (/挂|失败|拒|没过|答崩|不通过/.test(text)) return 'failed' as const;
  if (/offer|通过|过了|进入下一轮|二面|终面/.test(text)) return 'passed' as const;
  return 'unknown' as const;
}

function buildObservation(text: string): string {
  const terms = extractFocusTerms(text);
  return terms.length > 0
    ? `Agent 初步识别焦点：${terms.join('、')}`
    : 'Agent 已接收复盘，等待进一步结构化分析。';
}

function summarizeInterviewResults(interviews: InterviewRecord[]): string {
  if (interviews.length === 0) return '等待录入复盘';
  const failed = interviews.filter((item) => item.result === 'failed').length;
  const passed = interviews.filter((item) => item.result === 'passed').length;
  return `${failed} 次未通过 · ${passed} 次通过`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
