import React, { useState } from 'react';
import { Badge } from '../shared/Badge';
import type { WrongAnswer } from '../../../shared/types';

interface WrongAnswerCardProps {
  wrongAnswer: WrongAnswer;
  onReanswer: (answer: string) => void;
  onResolve: () => void;
}

export function WrongAnswerCard({ wrongAnswer, onReanswer, onResolve }: WrongAnswerCardProps) {
  const [showReanswer, setShowReanswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  function handleSelect(answer: string) {
    setSelectedAnswer(answer);
    setResult(answer === wrongAnswer.correct_answer ? 'correct' : 'incorrect');
    onReanswer(answer);
    if (answer === wrongAnswer.correct_answer) {
      setTimeout(() => onResolve(), 1000);
    }
  }

  const isResolved = wrongAnswer.status === 'resolved';

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
      isResolved ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-800'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={isResolved ? 'green' : 'red'}>
              {isResolved ? '已解决' : '未解决'}
            </Badge>
            {wrongAnswer.category && <Badge color="purple">{wrongAnswer.category}</Badge>}
            <span className="text-xs text-gray-400">
              复习 {wrongAnswer.review_count} 次
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(wrongAnswer.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{wrongAnswer.question_text}</p>
        </div>

        <div className="space-y-1.5 text-sm">
          {wrongAnswer.options.map((opt, i) => {
            const label = String.fromCharCode(65 + i);
            const isCorrect = label === wrongAnswer.correct_answer;
            const isWrong = label === wrongAnswer.user_answer;

            return (
              <div
                key={label}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : isWrong
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="font-medium mr-2">{label}.</span>
                {opt.replace(/^[A-D]\)\s*/, '')}
                {isCorrect && <span className="ml-2 text-green-500">✓ 正确答案</span>}
                {isWrong && <span className="ml-2 text-red-500">✗ 你的答案</span>}
              </div>
            );
          })}
        </div>

        {wrongAnswer.explanation && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">解析：</span>
            {wrongAnswer.explanation}
          </div>
        )}
      </div>

      {!isResolved && !showReanswer && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between">
          <button
            onClick={() => setShowReanswer(true)}
            className="text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            重新作答
          </button>
          <button
            onClick={onResolve}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            标记为已解决
          </button>
        </div>
      )}

      {showReanswer && !isResolved && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
          {result ? (
            <div className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
              {result === 'correct' ? '✓ 回答正确！' : '✗ 回答错误，请再试一次'}
              {result === 'incorrect' && (
                <button
                  onClick={() => { setShowReanswer(false); setSelectedAnswer(null); setResult(null); }}
                  className="ml-3 text-primary-500 hover:text-primary-600"
                >
                  关闭重新作答
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-2">选择正确答案：</p>
              <div className="flex gap-2">
                {['A', 'B', 'C', 'D'].map((label) => (
                  <button
                    key={label}
                    onClick={() => handleSelect(label)}
                    className={`w-12 h-12 rounded-lg font-bold text-sm transition-colors ${
                      selectedAnswer === label
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
