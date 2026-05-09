import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DocumentBrowserPage } from './pages/DocumentBrowserPage';
import { StudyPlanPage } from './pages/StudyPlanPage';
import { QuizPage } from './pages/QuizPage';
import { QuizSessionPage } from './pages/QuizSessionPage';
import { WrongAnswerPage } from './pages/WrongAnswerPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { IOSPage } from './pages/IOSPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/browser" replace />} />
          <Route path="/browser" element={<DocumentBrowserPage />} />
          <Route path="/plan" element={<StudyPlanPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/quiz/:sessionId" element={<QuizSessionPage />} />
          <Route path="/wrong-answers" element={<WrongAnswerPage />} />
          <Route path="/mock-interview" element={<MockInterviewPage />} />
          <Route path="/ios" element={<IOSPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
}
