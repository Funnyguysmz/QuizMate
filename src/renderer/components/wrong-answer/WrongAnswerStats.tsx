import React from 'react';
import type { WrongAnswerStats as WAStats } from '../../../shared/types';

interface WrongAnswerStatsProps {
  stats: WAStats;
}

export function WrongAnswerStats({ stats }: WrongAnswerStatsProps) {
  const maxCategoryCount = Math.max(...stats.byCategory.map(c => c.count), 1);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">总错题数</p>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <p className="text-2xl font-bold text-red-500">{stats.unresolved}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">待解决</p>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">已解决</p>
      </div>

      {stats.byCategory.length > 0 && (
        <div className="col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">按分类统计</h4>
          <div className="space-y-3">
            {stats.byCategory.map(({ category, count }) => (
              <div key={category} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate">{category || '未分类'}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                  <div
                    className="bg-primary-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
