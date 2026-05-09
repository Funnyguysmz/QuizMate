import React from 'react';

export function IOSPage() {
  return (
    <div className="max-w-2xl mx-auto mt-20">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">iOS App</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            Interview Study 的 iOS 移动版本，让你在手机上随时随地浏览学习资料、
            刷题练习、查看学习计划。支持 iCloud 同步，与桌面端无缝衔接。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 bg-blue-400 rounded-full" />
          开发计划中
        </div>
        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 mt-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">计划特性</h3>
          <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left max-w-sm mx-auto">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              SwiftUI 原生界面，流畅的 iOS 体验
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              iCloud 自动同步学习资料和进度
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              支持 iPad 分屏和 Slide Over
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              Widget 桌面小组件显示学习进度
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              离线模式，随时随地学习
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
