import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuizSession } from '../components/quiz/QuizSession';
import { QuizResult } from '../components/quiz/QuizResult';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import type { QuizSessionWithQuestions } from '../../shared/types';

export function QuizSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSessionWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    if (!sessionId) return;
    try {
      const data = await window.electronAPI.getQuizSession(parseInt(sessionId));
      setSession(data);
      if (data.status === 'completed') {
        setShowResult(true);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(questionId: number, answer: string) {
    await window.electronAPI.submitAnswer(questionId, answer);
    if (session) {
      const updated = { ...session };
      const q = updated.questions.find(q => q.id === questionId);
      if (q) {
        q.user_answer = answer;
      }
      setSession(updated);
    }
  }

  async function handleComplete() {
    if (!session) return;
    await window.electronAPI.completeQuiz(session.id);
    await loadSession();
    setShowResult(true);
  }

  if (loading) return <LoadingSpinner message="加载测验..." />;
  if (!session) return <div className="text-center text-gray-500 mt-20">测验未找到</div>;

  if (showResult) {
    return (
      <div className="max-w-3xl mx-auto">
        <QuizResult session={session} />
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/quiz')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            返回测验列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <QuizSession
        session={session}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
        onAnswer={handleAnswer}
        onComplete={handleComplete}
        onBack={() => navigate('/quiz')}
      />
    </div>
  );
}
