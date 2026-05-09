import React from 'react';
import { Badge } from '../shared/Badge';
import type { StudyPlan } from '../../../shared/types';

interface StudyPlanItemProps {
  plan: StudyPlan;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}

const statusConfig = {
  pending: { label: '待开始', color: 'gray' as const },
  in_progress: { label: '进行中', color: 'yellow' as const },
  done: { label: '已完成', color: 'green' as const },
};

const priorityConfig = {
  0: { label: '', color: 'gray' as const },
  1: { label: '中', color: 'blue' as const },
  2: { label: '高', color: 'red' as const },
};

export function StudyPlanItem({ plan, onEdit, onDelete, onStatusChange }: StudyPlanItemProps) {
  const status = statusConfig[plan.status];
  const priority = priorityConfig[plan.priority as keyof typeof priorityConfig] || priorityConfig[0];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(plan.status === 'done' ? 'pending' : plan.status === 'pending' ? 'in_progress' : 'done')}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            plan.status === 'done'
              ? 'bg-green-500 border-green-500 text-white'
              : plan.status === 'in_progress'
              ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {plan.status === 'done' && (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-sm font-medium ${plan.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
              {plan.title}
            </h4>
            <Badge color={status.color}>{status.label}</Badge>
            {plan.priority > 0 && <Badge color={priority.color}>{priority.label}优先</Badge>}
            {plan.category && <Badge color="purple">{plan.category}</Badge>}
          </div>
          {plan.notes && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{plan.notes}</p>
          )}
          {plan.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {plan.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
