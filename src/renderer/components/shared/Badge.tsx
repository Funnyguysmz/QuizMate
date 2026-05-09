import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

export function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  const colors = {
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
