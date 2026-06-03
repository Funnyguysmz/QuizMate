import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { getDatabase } from '../services/database';
import { generateStudyMaterials, generateStudyTodos } from '../services/deepseek-client';
import type { CreatePlanInput, UpdatePlanInput, PlanFilters, CreateAgentRunInput, UpdateAgentRunInput, CreateAgentStepInput, UpdateAgentStepInput, CreateInterviewInput, UpdateInterviewInput, InterviewFilters, CreateInterviewQuestionInput, UpdateInterviewQuestionInput, ImportInterviewInput } from '../../shared/types';

function mapPlanRow(row: any) {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    source_files: JSON.parse(row.source_files || '[]'),
  };
}

export function registerDatabaseHandlers() {
  // Plans CRUD
  ipcMain.handle(IPC_CHANNELS.PLANS_CREATE, (_event, input: CreatePlanInput) => {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO study_plans (title, category, tags, status, priority, notes, source_file, source_files, generated_material, material_file, ai_generated)
       VALUES (@title, @category, @tags, @status, @priority, @notes, @source_file, @source_files, @generated_material, @material_file, @ai_generated)`
    );
    const result = stmt.run({
      title: input.title,
      category: input.category || null,
      tags: JSON.stringify(input.tags || []),
      status: input.status || 'pending',
      priority: input.priority || 0,
      notes: input.notes || null,
      source_file: input.source_file || null,
      source_files: JSON.stringify(input.source_files || (input.source_file ? [input.source_file] : [])),
      generated_material: input.generated_material || null,
      material_file: input.material_file || null,
      ai_generated: input.ai_generated || 0,
    });
    const row = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(result.lastInsertRowid) as any;
    return mapPlanRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_UPDATE, (_event, id: number, input: UpdatePlanInput) => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Record<string, any> = { id };

    if (input.title !== undefined) { fields.push('title = @title'); values.title = input.title; }
    if (input.category !== undefined) { fields.push('category = @category'); values.category = input.category; }
    if (input.tags !== undefined) { fields.push('tags = @tags'); values.tags = JSON.stringify(input.tags); }
    if (input.status !== undefined) { fields.push('status = @status'); values.status = input.status; }
    if (input.priority !== undefined) { fields.push('priority = @priority'); values.priority = input.priority; }
    if (input.notes !== undefined) { fields.push('notes = @notes'); values.notes = input.notes; }
    if (input.source_file !== undefined) { fields.push('source_file = @source_file'); values.source_file = input.source_file || null; }
    if (input.source_files !== undefined) { fields.push('source_files = @source_files'); values.source_files = JSON.stringify(input.source_files); }
    if (input.generated_material !== undefined) { fields.push('generated_material = @generated_material'); values.generated_material = input.generated_material || null; }
    if (input.material_file !== undefined) { fields.push('material_file = @material_file'); values.material_file = input.material_file || null; }
    if (input.ai_generated !== undefined) { fields.push('ai_generated = @ai_generated'); values.ai_generated = input.ai_generated; }

    if (fields.length === 0) {
      const row = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id) as any;
      return mapPlanRow(row);
    }

    fields.push("updated_at = datetime('now')");
    db.prepare(`UPDATE study_plans SET ${fields.join(', ')} WHERE id = @id`).run(values);

    const row = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id) as any;
    return mapPlanRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM study_plans WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_LIST, (_event, filters?: PlanFilters) => {
    const db = getDatabase();
    let query = 'SELECT * FROM study_plans WHERE 1=1';
    const params: Record<string, any> = {};

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }
    if (filters?.category) {
      query += ' AND category = @category';
      params.category = filters.category;
    }
    if (filters?.search) {
      query += ' AND (title LIKE @search OR notes LIKE @search2)';
      params.search = `%${filters.search}%`;
      params.search2 = `%${filters.search}%`;
    }

    query += ' ORDER BY priority DESC, created_at DESC';
    const rows = db.prepare(query).all(params) as any[];
    return rows.map(mapPlanRow);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_GET, (_event, id: number) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapPlanRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_GENERATE_TODOS, (_event, input) => {
    return generateStudyTodos(input);
  });

  ipcMain.handle(IPC_CHANNELS.PLANS_GENERATE_MATERIALS, (_event, input) => {
    return generateStudyMaterials(input);
  });

  // Agent Runs CRUD
  ipcMain.handle(IPC_CHANNELS.AGENT_RUNS_CREATE, (_event, input: CreateAgentRunInput) => {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO agent_runs (type, title, input_summary)
       VALUES (@type, @title, @input_summary)`
    );
    const result = stmt.run({
      type: input.type,
      title: input.title,
      input_summary: input.input_summary || null,
    });
    return db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(result.lastInsertRowid) as any;
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_RUNS_UPDATE, (_event, id: number, input: UpdateAgentRunInput) => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Record<string, any> = { id };

    if (input.status !== undefined) { fields.push('status = @status'); values.status = input.status; }
    if (input.output_summary !== undefined) { fields.push('output_summary = @output_summary'); values.output_summary = input.output_summary; }
    if (input.title !== undefined) { fields.push('title = @title'); values.title = input.title; }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE agent_runs SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    return db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as any;
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_RUNS_GET, (_event, id: number) => {
    const db = getDatabase();
    const run = db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as any;
    if (!run) return null;
    const steps = db.prepare('SELECT * FROM agent_steps WHERE run_id = ? ORDER BY order_index ASC').all(id) as any[];
    return { ...run, steps };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_RUNS_LIST, (_event, type?: string) => {
    const db = getDatabase();
    if (type) {
      return db.prepare('SELECT * FROM agent_runs WHERE type = ? ORDER BY created_at DESC').all(type) as any[];
    }
    return db.prepare('SELECT * FROM agent_runs ORDER BY created_at DESC').all() as any[];
  });

  // Agent Steps CRUD
  ipcMain.handle(IPC_CHANNELS.AGENT_STEPS_CREATE, (_event, input: CreateAgentStepInput) => {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO agent_steps (run_id, name, order_index, input)
       VALUES (@run_id, @name, @order_index, @input)`
    );
    const result = stmt.run({
      run_id: input.run_id,
      name: input.name,
      order_index: input.order_index,
      input: input.input || null,
    });
    return db.prepare('SELECT * FROM agent_steps WHERE id = ?').get(result.lastInsertRowid) as any;
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_STEPS_UPDATE, (_event, id: number, input: UpdateAgentStepInput) => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Record<string, any> = { id };

    if (input.status !== undefined) { fields.push('status = @status'); values.status = input.status; }
    if (input.output !== undefined) { fields.push('output = @output'); values.output = input.output; }
    if (input.error !== undefined) { fields.push('error = @error'); values.error = input.error; }

    if (input.status === 'completed') {
      fields.push("completed_at = datetime('now')");
    }

    if (fields.length > 0) {
      db.prepare(`UPDATE agent_steps SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    return db.prepare('SELECT * FROM agent_steps WHERE id = ?').get(id) as any;
  });

  // Interview Records CRUD
  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_CREATE, (_event, input: CreateInterviewInput) => {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO interview_records (company, team, round, date, result, source_file, interviewer_focus, observations, raw_notes)
       VALUES (@company, @team, @round, @date, @result, @source_file, @interviewer_focus, @observations, @raw_notes)`
    );
    const result = stmt.run({
      company: input.company,
      team: input.team || null,
      round: input.round || null,
      date: input.date || null,
      result: input.result || 'unknown',
      source_file: input.source_file || null,
      interviewer_focus: input.interviewer_focus || null,
      observations: input.observations || null,
      raw_notes: input.raw_notes || null,
    });
    return db.prepare('SELECT * FROM interview_records WHERE id = ?').get(result.lastInsertRowid) as any;
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_UPDATE, (_event, id: number, input: UpdateInterviewInput) => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Record<string, any> = { id };

    if (input.company !== undefined) { fields.push('company = @company'); values.company = input.company; }
    if (input.team !== undefined) { fields.push('team = @team'); values.team = input.team; }
    if (input.round !== undefined) { fields.push('round = @round'); values.round = input.round; }
    if (input.date !== undefined) { fields.push('date = @date'); values.date = input.date; }
    if (input.result !== undefined) { fields.push('result = @result'); values.result = input.result; }
    if (input.source_file !== undefined) { fields.push('source_file = @source_file'); values.source_file = input.source_file; }
    if (input.interviewer_focus !== undefined) { fields.push('interviewer_focus = @interviewer_focus'); values.interviewer_focus = input.interviewer_focus; }
    if (input.observations !== undefined) { fields.push('observations = @observations'); values.observations = input.observations; }
    if (input.raw_notes !== undefined) { fields.push('raw_notes = @raw_notes'); values.raw_notes = input.raw_notes; }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE interview_records SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    return db.prepare('SELECT * FROM interview_records WHERE id = ?').get(id) as any;
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_GET, (_event, id: number) => {
    const db = getDatabase();
    const interview = db.prepare('SELECT * FROM interview_records WHERE id = ?').get(id) as any;
    if (!interview) return null;
    const questions = db.prepare('SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY created_at ASC').all(id) as any[];
    return {
      ...interview,
      questions: questions.map((q: any) => ({
        ...q,
        weakness_tags: JSON.parse(q.weakness_tags || '[]'),
      })),
    };
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_LIST, (_event, filters?: InterviewFilters) => {
    const db = getDatabase();
    let query = 'SELECT * FROM interview_records WHERE 1=1';
    const params: Record<string, any> = {};

    if (filters?.company) {
      query += ' AND company = @company';
      params.company = filters.company;
    }
    if (filters?.result) {
      query += ' AND result = @result';
      params.result = filters.result;
    }
    if (filters?.search) {
      query += ' AND (company LIKE @search OR team LIKE @search2 OR round LIKE @search3 OR observations LIKE @search4)';
      params.search = `%${filters.search}%`;
      params.search2 = `%${filters.search}%`;
      params.search3 = `%${filters.search}%`;
      params.search4 = `%${filters.search}%`;
    }

    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(params) as any[];
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM interview_records WHERE id = ?').run(id);
  });

  // Interview Questions CRUD
  ipcMain.handle(IPC_CHANNELS.INTERVIEW_QUESTIONS_CREATE, (_event, input: CreateInterviewQuestionInput) => {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO interview_questions (interview_id, question_text, topic, follow_up_questions, answer_quality, weakness_tags)
       VALUES (@interview_id, @question_text, @topic, @follow_up_questions, @answer_quality, @weakness_tags)`
    );
    const result = stmt.run({
      interview_id: input.interview_id,
      question_text: input.question_text,
      topic: input.topic || null,
      follow_up_questions: input.follow_up_questions || null,
      answer_quality: input.answer_quality || 'unknown',
      weakness_tags: JSON.stringify(input.weakness_tags || []),
    });
    const row = db.prepare('SELECT * FROM interview_questions WHERE id = ?').get(result.lastInsertRowid) as any;
    return {
      ...row,
      weakness_tags: JSON.parse(row.weakness_tags || '[]'),
    };
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEW_QUESTIONS_UPDATE, (_event, id: number, input: UpdateInterviewQuestionInput) => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: Record<string, any> = { id };

    if (input.question_text !== undefined) { fields.push('question_text = @question_text'); values.question_text = input.question_text; }
    if (input.topic !== undefined) { fields.push('topic = @topic'); values.topic = input.topic; }
    if (input.follow_up_questions !== undefined) { fields.push('follow_up_questions = @follow_up_questions'); values.follow_up_questions = input.follow_up_questions; }
    if (input.answer_quality !== undefined) { fields.push('answer_quality = @answer_quality'); values.answer_quality = input.answer_quality; }
    if (input.weakness_tags !== undefined) { fields.push('weakness_tags = @weakness_tags'); values.weakness_tags = JSON.stringify(input.weakness_tags); }

    if (fields.length > 0) {
      db.prepare(`UPDATE interview_questions SET ${fields.join(', ')} WHERE id = @id`).run(values);
    }

    const row = db.prepare('SELECT * FROM interview_questions WHERE id = ?').get(id) as any;
    return {
      ...row,
      weakness_tags: JSON.parse(row.weakness_tags || '[]'),
    };
  });

  ipcMain.handle(IPC_CHANNELS.INTERVIEW_QUESTIONS_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM interview_questions WHERE id = ?').run(id);
  });

  // Interview Import from File
  ipcMain.handle(IPC_CHANNELS.INTERVIEWS_IMPORT_FROM_FILE, async (_event, input: ImportInterviewInput) => {
    const { importInterviewFromFile } = await import('../services/deepseek-client');
    return importInterviewFromFile(input);
  });
}
