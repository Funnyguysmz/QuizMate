import React from 'react';
import type { PlanFilters } from '../../../shared/types';

interface StudyPlanFiltersProps {
  filters: PlanFilters;
  onChange: (filters: PlanFilters) => void;
}

export function StudyPlanFilters({ filters, onChange }: StudyPlanFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1.5">
        {[
          { value: '', label: '全部' },
          { value: 'pending', label: '待开始' },
          { value: 'in_progress', label: '进行中' },
          { value: 'done', label: '已完成' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...filters, status: value || undefined })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              (filters.status || '') === value
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <input
        type="text"
        value={filters.search || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        placeholder="搜索计划..."
        className="w-48 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}
