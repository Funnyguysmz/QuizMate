import React, { useEffect, useState } from 'react';
import { StudyPlanList } from '../components/plan/StudyPlanList';
import { StudyPlanForm } from '../components/plan/StudyPlanForm';
import { StudyPlanFilters } from '../components/plan/StudyPlanFilters';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/shared/Button';
import type { StudyPlan, CreatePlanInput, UpdatePlanInput, PlanFilters } from '../../shared/types';

export function StudyPlanPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
  const [filters, setFilters] = useState<PlanFilters>({});

  useEffect(() => {
    loadPlans();
  }, [filters]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setEditingPlan(null);
        setShowForm(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await window.electronAPI.getPlans(filters);
      setPlans(data);
    } catch (e) {
      console.error('Failed to load plans:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(input: CreatePlanInput) {
    await window.electronAPI.createPlan(input);
    setShowForm(false);
    loadPlans();
  }

  async function handleUpdate(id: number, input: UpdatePlanInput) {
    await window.electronAPI.updatePlan(id, input);
    setShowForm(false);
    setEditingPlan(null);
    loadPlans();
  }

  async function handleDelete(id: number) {
    await window.electronAPI.deletePlan(id);
    loadPlans();
  }

  async function handleStatusChange(id: number, status: string) {
    await window.electronAPI.updatePlan(id, { status: status as StudyPlan['status'] });
    loadPlans();
  }

  function handleEdit(plan: StudyPlan) {
    setEditingPlan(plan);
    setShowForm(true);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">学习计划</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {plans.filter(p => p.status === 'done').length}/{plans.length} 已完成
          </p>
        </div>
        <Button onClick={() => { setEditingPlan(null); setShowForm(true); }}>
          新建计划
        </Button>
      </div>

      <StudyPlanFilters filters={filters} onChange={setFilters} />

      {loading ? (
        <LoadingSpinner message="加载计划..." />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<PlanIcon />}
          title="还没有学习计划"
          description="点击「新建计划」开始记录需要学习的知识点"
        />
      ) : (
        <StudyPlanList
          plans={plans}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {showForm && (
        <StudyPlanForm
          plan={editingPlan}
          onSubmit={(input) => editingPlan ? handleUpdate(editingPlan.id, input as UpdatePlanInput) : handleCreate(input as CreatePlanInput)}
          onClose={() => { setShowForm(false); setEditingPlan(null); }}
        />
      )}
    </div>
  );
}

function PlanIcon() {
  return (
    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
