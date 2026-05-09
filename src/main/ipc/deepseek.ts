import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { getDatabase } from '../services/database';
import type { QuizGenerateInput, WrongAnswerFilters } from '../../shared/types';

export function registerDeepSeekHandlers() {
  ipcMain.handle(IPC_CHANNELS.QUIZ_GENERATE, async (_event, input: QuizGenerateInput) => {
    const { generateQuiz } = await import('../services/deepseek-client');
    return generateQuiz(input);
  });

  ipcMain.handle(IPC_CHANNELS.QUIZ_GET_SESSION, (_event, id: number) => {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(id) as any;
    if (!session) return null;
    const questions = db.prepare('SELECT * FROM quiz_questions WHERE session_id = ? ORDER BY question_number').all(id) as any[];
    return {
      ...session,
      source_files: JSON.parse(session.source_files),
      questions: questions.map(q => ({ ...q, options: JSON.parse(q.options) })),
    };
  });

  ipcMain.handle(IPC_CHANNELS.QUIZ_SUBMIT_ANSWER, (_event, questionId: number, answer: string) => {
    const db = getDatabase();
    const question = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(questionId) as any;
    if (!question) return;

    const isCorrect = answer === question.correct_answer ? 1 : 0;

    db.prepare(
      `UPDATE quiz_questions SET user_answer = ?, is_correct = ?, answered_at = datetime('now') WHERE id = ?`
    ).run(answer, isCorrect, questionId);

    if (isCorrect) {
      db.prepare(
        `UPDATE quiz_sessions SET correct_count = correct_count + 1 WHERE id = ?`
      ).run(question.session_id);
    } else {
      const options = JSON.parse(question.options);
      db.prepare(
        `INSERT INTO wrong_answers (question_id, session_id, question_text, options, correct_answer, explanation, user_answer, source_file, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        questionId, question.session_id, question.question_text,
        question.options, question.correct_answer, question.explanation,
        answer, question.source_file, null
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUIZ_COMPLETE, (_event, sessionId: number) => {
    const db = getDatabase();
    db.prepare(
      `UPDATE quiz_sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?`
    ).run(sessionId);
    return db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.QUIZ_LIST_SESSIONS, () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM quiz_sessions ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({ ...row, source_files: JSON.parse(row.source_files) }));
  });

  // Wrong Answers
  ipcMain.handle(IPC_CHANNELS.WRONG_ANSWERS_LIST, (_event, filters?: WrongAnswerFilters) => {
    const db = getDatabase();
    let query = 'SELECT * FROM wrong_answers WHERE 1=1';
    const params: Record<string, any> = {};

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }
    if (filters?.category) {
      query += ' AND category = @category';
      params.category = filters.category;
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(params) as any[];
    return rows.map(row => ({ ...row, options: JSON.parse(row.options) }));
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_ANSWERS_REANSWER, (_event, id: number, answer: string) => {
    const db = getDatabase();
    const wa = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(id) as any;
    if (!wa) return null;

    const isCorrect = answer === wa.correct_answer ? 1 : 0;
    const newStatus = isCorrect ? 'resolved' : 'unresolved';

    db.prepare(
      `UPDATE wrong_answers SET review_count = review_count + 1, last_correct = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(isCorrect, newStatus, id);

    const row = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(id) as any;
    return { ...row, options: JSON.parse(row.options) };
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_ANSWERS_RESOLVE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare(
      `UPDATE wrong_answers SET status = 'resolved', updated_at = datetime('now') WHERE id = ?`
    ).run(id);
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_ANSWERS_STATS, () => {
    const db = getDatabase();
    const total = (db.prepare('SELECT COUNT(*) as count FROM wrong_answers').get() as any).count;
    const unresolved = (db.prepare("SELECT COUNT(*) as count FROM wrong_answers WHERE status = 'unresolved'").get() as any).count;
    const resolved = (db.prepare("SELECT COUNT(*) as count FROM wrong_answers WHERE status = 'resolved'").get() as any).count;
    const byCategory = db.prepare(
      "SELECT category, COUNT(*) as count FROM wrong_answers WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    ).all() as any[];

    return { total, unresolved, resolved, byCategory };
  });
}
