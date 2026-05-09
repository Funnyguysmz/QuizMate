import React from 'react';
import { WrongAnswerCard } from './WrongAnswerCard';
import type { WrongAnswer } from '../../../shared/types';

interface WrongAnswerListProps {
  answers: WrongAnswer[];
  onReanswer: (id: number, answer: string) => void;
  onResolve: (id: number) => void;
}

export function WrongAnswerList({ answers, onReanswer, onResolve }: WrongAnswerListProps) {
  return (
    <div className="space-y-4">
      {answers.map((wa) => (
        <WrongAnswerCard
          key={wa.id}
          wrongAnswer={wa}
          onReanswer={(answer) => onReanswer(wa.id, answer)}
          onResolve={() => onResolve(wa.id)}
        />
      ))}
    </div>
  );
}
