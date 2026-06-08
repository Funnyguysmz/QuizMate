import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizGenerator } from '../components/quiz/QuizGenerator';
import { QuizHistory } from '../components/quiz/QuizHistory';
import { AgentWorkbench } from '../components/agent/AgentWorkbench';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import type { AgentRunWithSteps, QuizSession, QuizSessionWithQuestions } from '../../shared/types';

export function QuizPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState('');
  const [generatedSession, setGeneratedSession] = useState<QuizSessionWithQuestions | null>(null);
  const [activeAgentRunId, setActiveAgentRunId] = useState<number | null>(null);
  const [agentRefreshKey, setAgentRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await window.electronAPI.getQuizSessions();
      setSessions(data);
    } catch (e) {
      console.error('Failed to load quiz sessions:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(files: string[], questionCount: number, focusText: string) {
    setGenerating(true);
    setError(null);
    setGeneratedSession(null);
    try {
      const session = await window.electronAPI.generateQuiz({
        files,
        questionCount,
        mode: 'smart_agent',
        focus: focusText || undefined,
        enableThinking: true,
      });
      setGeneratedSession(session);
      if ((session as any).agent_run_id) {
        setActiveAgentRunId((session as any).agent_run_id);
      }
      setAgentRefreshKey((value) => value + 1);
      await loadSessions();
    } catch (e: any) {
      setError(e.message || '生成测验失败');
      await selectLatestAgentRun();
    } finally {
      setGenerating(false);
    }
  }

  async function selectLatestAgentRun() {
    try {
      const runs = await window.electronAPI.listAgentRuns('quiz_generation');
      setActiveAgentRunId(runs[0]?.id ?? null);
      setAgentRefreshKey((value) => value + 1);
    } catch {
      setAgentRefreshKey((value) => value + 1);
    }
  }

  function handleRetryRun(run: AgentRunWithSteps) {
    const input = run.input_summary || '';
    const countMatch = input.match(/题目数量:\s*(\d+)/);
    const focusMatch = input.match(/重点:\s*([^\n]+)/);
    const nextCount = countMatch ? Number(countMatch[1]) : 5;
    const nextFocus = focusMatch && focusMatch[1] !== '无' ? focusMatch[1].trim() : focus;
    if (nextFocus) setFocus(nextFocus);
    handleGenerate([], Number.isFinite(nextCount) ? nextCount : 5, nextFocus);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">智能生成测验</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          基于历史错题与面试弱点，Agent 自动筛选资料并生成针对性试题
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <QuizGenerator onGenerate={handleGenerate} generating={generating} focus={focus} onFocusChange={setFocus} />

      <AgentWorkbench
        type="quiz_generation"
        selectedRunId={activeAgentRunId}
        refreshKey={agentRefreshKey}
        compact
        onRetryRun={handleRetryRun}
      />

      {generatedSession && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">测验已生成</h3>
          </div>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <p>{generatedSession.title}</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              共 {generatedSession.total_questions} 题
            </p>
          </div>
          <Button onClick={() => navigate(`/quiz/${generatedSession.id}`)}>
            进入测验
          </Button>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">测验历史</h2>
        {loading ? (
          <LoadingSpinner message="加载历史..." />
        ) : (
          <QuizHistory sessions={sessions} onSelect={(s) => navigate(`/quiz/${s.id}`)} />
        )}
      </div>
    </div>
  );
}
