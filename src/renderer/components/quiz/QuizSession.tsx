import React from 'react';
import { QuizCard } from './QuizCard';
import { Button } from '../shared/Button';
import type { QuizSessionWithQuestions } from '../../../shared/types';

interface QuizSessionProps {
  session: QuizSessionWithQuestions;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onAnswer: (questionId: number, answer: string) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function QuizSession({ session, currentIndex, onNavigate, onAnswer, onComplete, onBack }: QuizSessionProps) {
  const question = session.questions[currentIndex];
  const answeredCount = session.questions.filter((q) => q.user_answer).length;
  const progress = (answeredCount / session.questions.length) * 100;
  const allAnswered = answeredCount === session.questions.length;

  const qualityTags: string[] = [];
  if ((session as any).quality_summary) {
    try {
      const qs = JSON.parse((session as any).quality_summary);
      if (qs.chineseChecked) qualityTags.push('已通过中文校验');
      if (qs.optionPrefixChecked) qualityTags.push('已通过选项格式校验');
      if (qs.repairNeeded === false) qualityTags.push('一次生成通过');
      if ((session as any).agent_run_id) qualityTags.push('DeepSeek thinking');
    } catch {}
  }

  if (!question) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          ← 返回
        </button>
        <span className="text-sm text-gray-400">
          第 {currentIndex + 1} / {session.questions.length} 题
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {qualityTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {qualityTags.map((tag) => (
            <span key={tag} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      <QuizCard
        question={question}
        onAnswer={(answer) => onAnswer(question.id, answer)}
      />

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="secondary"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>

        <div className="flex gap-2">
          {session.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-primary-500 text-white'
                  : session.questions[i].user_answer
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentIndex < session.questions.length - 1 ? (
          <Button
            variant="secondary"
            onClick={() => onNavigate(currentIndex + 1)}
          >
            下一题
          </Button>
        ) : (
          <Button onClick={onComplete} disabled={!allAnswered}>
            {allAnswered ? '提交测验' : `还有 ${session.questions.length - answeredCount} 题未作答`}
          </Button>
        )}
      </div>
    </div>
  );
}
