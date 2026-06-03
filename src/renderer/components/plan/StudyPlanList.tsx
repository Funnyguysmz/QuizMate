import React from 'react';
import { StudyPlanItem } from './StudyPlanItem';
import type { StudyPlan } from '../../../shared/types';

interface StudyPlanListProps {
  plans: StudyPlan[];
  onEdit: (plan: StudyPlan) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onStudy: (plan: StudyPlan) => void;
  onGenerateMaterial: (plan: StudyPlan) => void;
}

export function StudyPlanList({ plans, onEdit, onDelete, onStatusChange, onStudy, onGenerateMaterial }: StudyPlanListProps) {
  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <StudyPlanItem
          key={plan.id}
          plan={plan}
          onEdit={() => onEdit(plan)}
          onDelete={() => onDelete(plan.id)}
          onStatusChange={(status) => onStatusChange(plan.id, status)}
          onStudy={() => onStudy(plan)}
          onGenerateMaterial={() => onGenerateMaterial(plan)}
        />
      ))}
    </div>
  );
}
