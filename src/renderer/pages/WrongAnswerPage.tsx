import React, { useEffect, useState } from 'react';
import { WrongAnswerList } from '../components/wrong-answer/WrongAnswerList';
import { WrongAnswerStats } from '../components/wrong-answer/WrongAnswerStats';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import type { WrongAnswer, WrongAnswerFilters, WrongAnswerStats as WAStats } from '../../shared/types';

export function WrongAnswerPage() {
  const [answers, setAnswers] = useState<WrongAnswer[]>([]);
  const [stats, setStats] = useState<WAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<WrongAnswerFilters>({});

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const [ans, st] = await Promise.all([
        window.electronAPI.getWrongAnswers(filters),
        window.electronAPI.getWrongAnswerStats(),
      ]);
      setAnswers(ans);
      setStats(st);
    } catch (e) {
      console.error('Failed to load wrong answers:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReanswer(id: number, answer: string) {
    await window.electronAPI.reanswerQuestion(id, answer);
    loadData();
  }

  async function handleResolve(id: number) {
    await window.electronAPI.resolveWrongAnswer(id);
    loadData();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">错题回顾</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          回顾和重新练习答错的题目
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="加载错题..." />
      ) : answers.length === 0 ? (
        <EmptyState
          icon={<CorrectIcon />}
          title="暂无错题"
          description="完成一些测验后，答错的题目会出现在这里"
        />
      ) : (
        <>
          {stats && <WrongAnswerStats stats={stats} />}
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({})}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                !filters.status ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilters({ status: 'unresolved' })}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filters.status === 'unresolved' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              未解决
            </button>
            <button
              onClick={() => setFilters({ status: 'resolved' })}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filters.status === 'resolved' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              已解决
            </button>
          </div>
          <WrongAnswerList
            answers={answers}
            onReanswer={handleReanswer}
            onResolve={handleResolve}
          />
        </>
      )}
    </div>
  );
}

function CorrectIcon() {
  return (
    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
