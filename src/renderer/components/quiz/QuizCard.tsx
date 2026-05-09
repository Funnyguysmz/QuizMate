import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { QuizQuestion } from '../../../shared/types';

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (answer: string) => void;
  showResult?: boolean;
}

export function QuizCard({ question, onAnswer, showResult }: QuizCardProps) {
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {question.question_text}
        </ReactMarkdown>
      </div>

      <div className="space-y-3">
        {question.options.map((option, i) => {
          const label = labels[i];
          const isSelected = question.user_answer === label;
          let bgClass = 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10';

          if (showResult) {
            if (label === question.correct_answer) {
              bgClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
            } else if (isSelected && label !== question.correct_answer) {
              bgClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
            }
          } else if (isSelected) {
            bgClass = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
          }

          return (
            <button
              key={label}
              onClick={() => !showResult && onAnswer(label)}
              disabled={showResult}
              className={`w-full text-left px-4 py-3 border rounded-lg transition-colors ${bgClass}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  showResult && label === question.correct_answer
                    ? 'bg-green-500 text-white'
                    : showResult && isSelected && label !== question.correct_answer
                    ? 'bg-red-500 text-white'
                    : isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {label}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.replace(/^[A-D]\)\s*/, '')}</span>
                {showResult && label === question.correct_answer && (
                  <svg className="w-5 h-5 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {showResult && isSelected && label !== question.correct_answer && (
                  <svg className="w-5 h-5 text-red-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResult && question.explanation && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">解析</h4>
          <div className="prose prose-sm dark:prose-invert max-w-none text-blue-700 dark:text-blue-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {question.explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
