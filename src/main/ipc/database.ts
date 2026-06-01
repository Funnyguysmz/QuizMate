import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { getDatabase } from '../services/database';
import { generateStudyMaterials, generateStudyTodos } from '../services/deepseek-client';
import type { CreatePlanInput, UpdatePlanInput, PlanFilters } from '../../shared/types';

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
}
