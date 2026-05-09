import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { StudyPlan, CreatePlanInput, UpdatePlanInput } from '../../../shared/types';

interface StudyPlanFormProps {
  plan: StudyPlan | null;
  onSubmit: (input: CreatePlanInput | UpdatePlanInput) => void;
  onClose: () => void;
}

export function StudyPlanForm({ plan, onSubmit, onClose }: StudyPlanFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'done'>('pending');
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setCategory(plan.category || '');
      setTagsInput(plan.tags.join(', '));
      setStatus(plan.status);
      setPriority(plan.priority);
      setNotes(plan.notes || '');
    }
  }, [plan]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({ title: title.trim(), category: category.trim() || undefined, tags, status, priority, notes: notes.trim() || undefined });
  }

  return (
    <Modal open onClose={onClose} title={plan ? '编辑计划' : '新建计划'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：Android Binder IPC 机制"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：Android"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="pending">待开始</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            优先级
          </label>
          <div className="flex gap-2">
            {[
              { value: 0, label: '低' },
              { value: 1, label: '中' },
              { value: 2, label: '高' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                  priority === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            标签
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="用逗号分隔，例如：Binder, IPC, Android"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            备注
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="支持 Markdown 格式..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button buttonType="submit" disabled={!title.trim()}>
            {plan ? '保存修改' : '创建计划'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
