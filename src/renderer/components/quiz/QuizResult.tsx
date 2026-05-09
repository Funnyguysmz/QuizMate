import React, { useState } from 'react';
import { QuizCard } from './QuizCard';
import type { QuizSessionWithQuestions } from '../../../shared/types';

interface QuizResultProps {
  session: QuizSessionWithQuestions;
}

export function QuizResult({ session }: QuizResultProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const totalQuestions = session.questions.length;
  const correctCount = session.questions.filter(q => q.is_correct === 1).length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const incorrectQuestions = session.questions.filter(q => q.is_correct === 0);

  const strokeDasharray = 2 * Math.PI * 54;
  const strokeDashoffset = strokeDasharray * (1 - percentage / 100);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="54" fill="none" stroke="currentColor"
              className={`${percentage >= 60 ? 'text-green-500' : percentage >= 40 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
            <span className="text-xs text-gray-500">{correctCount}/{totalQuestions} 正确</span>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {percentage >= 80 ? '优秀！' : percentage >= 60 ? '不错！' : '继续加油！'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {session.title}
        </p>
      </div>

      {incorrectQuestions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            错题回顾 ({incorrectQuestions.length} 题)
          </h3>
          <div className="space-y-4">
            {incorrectQuestions.map((q) => (
              <div key={q.id}>
                <button
                  onClick={() => setExpandedIndex(expandedIndex === q.id ? null : q.id)}
                  className="w-full text-left p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg hover:border-red-200 dark:hover:border-red-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-red-500 font-medium shrink-0">第{q.question_number}题</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {q.question_text.replace(/[#*`\n]/g, '').substring(0, 80)}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandedIndex === q.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedIndex === q.id && (
                  <div className="mt-3 ml-4">
                    <QuizCard question={q} onAnswer={() => {}} showResult />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          全部题目
        </h3>
        <div className="space-y-4">
          {session.questions.map((q) => (
            <div key={q.id}>
              <button
                onClick={() => setExpandedIndex(expandedIndex === q.id ? null : q.id)}
                className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-medium shrink-0 ${q.is_correct === 1 ? 'text-green-500' : q.is_correct === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      第{q.question_number}题
                    </span>
                    <span className={`text-xs shrink-0 ${q.is_correct === 1 ? 'text-green-500' : q.is_correct === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {q.is_correct === 1 ? '✓' : q.is_correct === 0 ? '✗' : '○'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {q.question_text.replace(/[#*`\n]/g, '').substring(0, 80)}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandedIndex === q.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedIndex === q.id && (
                <div className="mt-3 ml-4">
                  <QuizCard question={q} onAnswer={() => {}} showResult />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
