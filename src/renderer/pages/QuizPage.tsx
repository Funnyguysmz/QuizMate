import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizGenerator } from '../components/quiz/QuizGenerator';
import { QuizHistory } from '../components/quiz/QuizHistory';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import type { QuizSession, QuizSessionWithQuestions } from '../../shared/types';

export function QuizPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleGenerate(files: string[], questionCount: number) {
    setGenerating(true);
    setError(null);
    try {
      const session = await window.electronAPI.generateQuiz({ files, questionCount });
      navigate(`/quiz/${session.id}`);
    } catch (e: any) {
      setError(e.message || '生成测验失败');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">生成新测验</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          选择学习资料，让 AI 为你生成选择题
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <QuizGenerator onGenerate={handleGenerate} generating={generating} />

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
