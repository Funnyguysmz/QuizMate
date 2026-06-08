import React, { useState } from 'react';
import { AgentWorkbench } from '../components/agent/AgentWorkbench';
import type { AgentRunType } from '../../shared/types';

const filters: Array<{ label: string; value: AgentRunType | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '智能出题', value: 'quiz_generation' },
  { label: '资料生成', value: 'material_generation' },
  { label: '错题复盘', value: 'wrong_answer_review' },
  { label: '面试导入', value: 'interview_import' },
];

export function AgentWorkbenchPage() {
  const [filter, setFilter] = useState<AgentRunType | 'all'>('all');

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">智能 Agent 工作台</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            用运行记录管理 QuizMate 的自动化流程：每次搜集、筛选、生成、校验都会沉淀为可追踪的步骤，方便复盘失败原因和定位资料来源。
          </p>
        </div>
        <div className="flex flex-wrap rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === item.value
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <AgentWorkbench type={filter === 'all' ? undefined : filter} />
    </div>
  );
}
