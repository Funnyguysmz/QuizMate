import React from 'react';
import { Badge } from '../shared/Badge';
import { EmptyState } from '../shared/EmptyState';
import type { QuizSession } from '../../../shared/types';

interface QuizHistoryProps {
  sessions: QuizSession[];
  onSelect: (session: QuizSession) => void;
}

export function QuizHistory({ sessions, onSelect }: QuizHistoryProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<QuizEmptyIcon />}
        title="还没有测验记录"
        description="生成你的第一份 AI 测验，开始检验学习成果"
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session)}
          className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{session.title}</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(session.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {session.status === 'completed' ? (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {session.correct_count}/{session.total_questions}
                </span>
              ) : (
                <Badge color="yellow">进行中</Badge>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function QuizEmptyIcon() {
  return (
    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
