import React from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/browser': '文档浏览',
  '/plan': '学习计划',
  '/quiz': '测验练习',
  '/wrong-answers': '错题回顾',
  '/mock-interview': '模拟面试',
  '/ios': 'iOS App',
  '/settings': '设置',
};

export function TopBar() {
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const title = pageTitles[basePath] || 'Interview Study';

  return (
    <header className="h-12 drag-region flex items-center px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <h1 className="text-sm font-medium text-gray-700 dark:text-gray-300 no-drag">{title}</h1>
    </header>
  );
}
