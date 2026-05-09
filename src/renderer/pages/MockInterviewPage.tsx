import React from 'react';

export function MockInterviewPage() {
  return (
    <div className="max-w-2xl mx-auto mt-20">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
          <svg className="w-10 h-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">模拟面试</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            AI 驱动的模拟面试功能，将根据你的学习资料自动生成面试问题，
            并通过语音或文字进行实时问答练习，帮助你更好地准备技术面试。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 bg-yellow-400 rounded-full" />
          即将推出
        </div>
        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 mt-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">计划功能</h3>
          <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left max-w-sm mx-auto">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              基于学习资料自动生成面试问题
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              语音识别与文字输入双模式
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              AI 实时评估回答质量并给出反馈
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              模拟真实面试的时间压力和追问机制
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              面试表现分析与改进建议报告
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
