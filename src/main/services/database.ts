import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS study_plans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    category        TEXT,
    tags            TEXT NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'pending',
    priority        INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    source_file     TEXT,
    source_files    TEXT NOT NULL DEFAULT '[]',
    generated_material TEXT,
    material_file   TEXT,
    ai_generated    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);
CREATE INDEX IF NOT EXISTS idx_study_plans_category ON study_plans(category);

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    source_files    TEXT NOT NULL DEFAULT '[]',
    total_questions INTEGER NOT NULL,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    options         TEXT NOT NULL DEFAULT '[]',
    correct_answer  TEXT NOT NULL,
    explanation     TEXT,
    source_file     TEXT,
    user_answer     TEXT,
    is_correct      INTEGER,
    answered_at     TEXT,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_session ON quiz_questions(session_id);

CREATE TABLE IF NOT EXISTS wrong_answers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER,
    session_id      INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    options         TEXT NOT NULL DEFAULT '[]',
    correct_answer  TEXT NOT NULL,
    explanation     TEXT,
    user_answer     TEXT NOT NULL,
    source_file     TEXT,
    category        TEXT,
    review_count    INTEGER NOT NULL DEFAULT 0,
    last_correct    INTEGER,
    status          TEXT NOT NULL DEFAULT 'unresolved',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wrong_answers_status ON wrong_answers(status);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_category ON wrong_answers(category);

CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    title           TEXT NOT NULL,
    input_summary   TEXT,
    output_summary  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_type ON agent_runs(type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);

CREATE TABLE IF NOT EXISTS agent_steps (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          INTEGER NOT NULL,
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    order_index     INTEGER NOT NULL DEFAULT 0,
    input           TEXT,
    output          TEXT,
    error           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_steps_run_id ON agent_steps(run_id);

CREATE TABLE IF NOT EXISTS interview_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company         TEXT NOT NULL,
    team            TEXT,
    round           TEXT,
    date            TEXT,
    result          TEXT NOT NULL DEFAULT 'unknown',
    source_file     TEXT,
    interviewer_focus TEXT,
    observations    TEXT,
    raw_notes       TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interview_records_company ON interview_records(company);
CREATE INDEX IF NOT EXISTS idx_interview_records_result ON interview_records(result);

CREATE TABLE IF NOT EXISTS interview_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id    INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    topic           TEXT,
    follow_up_questions TEXT,
    answer_quality  TEXT NOT NULL DEFAULT 'unknown',
    weakness_tags   TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (interview_id) REFERENCES interview_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
`;

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'study-app.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrateDatabase(db);
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function migrateDatabase(database: Database.Database): void {
  const columns = database.prepare('PRAGMA table_info(study_plans)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));
  const migrations = [
    { name: 'source_files', sql: "ALTER TABLE study_plans ADD COLUMN source_files TEXT NOT NULL DEFAULT '[]'" },
    { name: 'generated_material', sql: 'ALTER TABLE study_plans ADD COLUMN generated_material TEXT' },
    { name: 'material_file', sql: 'ALTER TABLE study_plans ADD COLUMN material_file TEXT' },
    { name: 'ai_generated', sql: 'ALTER TABLE study_plans ADD COLUMN ai_generated INTEGER NOT NULL DEFAULT 0' },
  ];

  for (const migration of migrations) {
    if (!columnNames.has(migration.name)) {
      database.exec(migration.sql);
    }
  }
}
