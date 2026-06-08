import React from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/browser': '文档浏览',
  '/plan': '学习计划',
  '/quiz': '测验练习',
  '/wrong-answers': '错题回顾',
  '/agents': 'Agent 工作台',
  '/mock-interview': '模拟面试',
  '/ios': 'iOS App',
  '/settings': '设置',
};

export function TopBar() {
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const title = pageTitles[basePath] || 'Interview Study';

  return (
    <header className="h-14 drag-region flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 shrink-0">
      <div className="no-drag">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">QuizMate 本地学习知识库</p>
      </div>
    </header>
  );
}
