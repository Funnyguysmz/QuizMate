import { getDatabase } from './database';
import { collectMarkdownFiles, readMarkdownContent } from './file-scanner';
import { loadSettings } from './settings-store';
import type {
  GenerateStudyMaterialsInput,
  GenerateStudyTodosInput,
  GeneratedStudyMaterialsResult,
  QuizGenerateInput,
  QuizSessionWithQuestions,
  StudyPlan,
} from '../../shared/types';
import * as https from 'https';
import * as http from 'http';
import fs from 'fs';
import path from 'path';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

function buildPrompt(files: string[], questionCount: number, topic?: string): { system: string; user: string } {
  const focusInstruction = topic
    ? `Focus the questions on the topic of "${topic}". `
    : 'Cover different topics from the source material. ';

  const system = `You are an expert technical interviewer creating multiple-choice quiz questions for a senior software engineer preparing for interviews. Your questions should test deep understanding, not surface-level memorization.

RULES:
1. Generate exactly ${questionCount} questions based on the provided source material.
2. Each question must have exactly 4 options (A, B, C, D).
3. The correct answer must be unambiguous and verifiable from the source.
4. Options should be plausible -- include common misconceptions as distractors.
5. ${focusInstruction}
6. Include code snippets in questions when the source contains code.
7. Each question must include a detailed explanation of why the answer is correct.
8. Return ONLY valid JSON, no other text.

The "correctAnswer" field must be exactly "A", "B", "C", or "D" -- never the full option text.
The "options" array must contain exactly 4 strings, each starting with the letter followed by ") ".
The "explanation" field should be 2-5 sentences with technical depth.

Return a JSON object:
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ]
}`;

  const sources = files.map(filePath => {
    const name = filePath.split('/').pop() || filePath;
    const content = readMarkdownContent(filePath);
    return `## ${name}\n\n${content.substring(0, 5000)}`;
  }).join('\n\n---\n\n');

  const user = `SOURCE MATERIAL:\n${sources}\n\nGenerate ${questionCount} multiple-choice questions based on the above source material.`;

  return { system, user };
}

function apiRequest(body: any, apiKey: string): Promise<any> {
  const url = new URL(DEEPSEEK_ENDPOINT);
  const payload = JSON.stringify(body);

  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || '';
  const useProxy = !!proxyUrl;

  if (useProxy) {
    return requestViaProxy(proxyUrl, url, payload, apiKey);
  }
  return requestDirect(url, payload, apiKey);
}

function stripJsonFence(content: string): string {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
  }
  return jsonStr;
}

function parsePlanRow(row: any): StudyPlan {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    source_files: JSON.parse(row.source_files || '[]'),
  };
}

function getApiKeyOrThrow(): string {
  const settings = loadSettings();
  if (!settings.apiKey) {
    throw new Error('NO_API_KEY');
  }
  return settings.apiKey;
}

function buildSourceMaterial(files: string[], maxPerFile = 3500): string {
  return files.map((filePath) => {
    const name = filePath.split('/').pop() || filePath;
    const content = readMarkdownContent(filePath);
    return `## ${name}\nPath: ${filePath}\n\n${content.substring(0, maxPerFile)}`;
  }).join('\n\n---\n\n');
}

function requestDirect(url: URL, payload: string, apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk.toString());
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(result.error?.message || `API error: ${res.statusCode}`));
            return;
          }
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`DeepSeek API request failed: ${err.message}`));
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('DeepSeek API request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

function requestViaProxy(proxyUrl: string, targetUrl: URL, payload: string, apiKey: string): Promise<any> {
  let proxy: URL;
  try {
    proxy = new URL(proxyUrl);
  } catch {
    return requestDirect(targetUrl, payload, apiKey);
  }

  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: proxy.hostname,
      port: parseInt(proxy.port) || 7897,
      path: DEEPSEEK_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${apiKey}`,
        'Host': targetUrl.hostname,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk.toString());
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(result.error?.message || `API error: ${res.statusCode}`));
            return;
          }
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`DeepSeek API request failed: ${err.message}`));
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('DeepSeek API request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

function parseQuizResponse(data: any): any[] {
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  const jsonStr = stripJsonFence(content);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Response missing "questions" array');
    }
    return parsed.questions;
  } catch (e: any) {
    throw new Error(`Failed to parse quiz JSON: ${e.message}`);
  }
}

export async function generateQuiz(input: QuizGenerateInput): Promise<QuizSessionWithQuestions> {
  const settings = loadSettings();
  const apiKey = getApiKeyOrThrow();

  const { system, user } = buildPrompt(input.files, input.questionCount, input.topic);

  const requestBody = {
    model: settings.settings.quiz_model || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  };

  const response = await apiRequest(requestBody, apiKey);
  const questions = parseQuizResponse(response);

  const db = getDatabase();
  const sourceFiles = input.files;
  const title = `Quiz - ${new Date().toLocaleDateString('zh-CN')} (${questions.length} questions)`;

  const sessionResult = db.prepare(
    `INSERT INTO quiz_sessions (title, source_files, total_questions, status) VALUES (?, ?, ?, 'in_progress')`
  ).run(title, JSON.stringify(sourceFiles), questions.length);

  const sessionId = sessionResult.lastInsertRowid as number;

  const insertQuestion = db.prepare(
    `INSERT INTO quiz_questions (session_id, question_number, question_text, options, correct_answer, explanation, source_file)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    insertQuestion.run(
      sessionId, i + 1, q.question, JSON.stringify(q.options),
      q.correctAnswer, q.explanation || null, sourceFiles[0] || null
    );
  }

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(sessionId) as any;
  const dbQuestions = db.prepare('SELECT * FROM quiz_questions WHERE session_id = ? ORDER BY question_number').all(sessionId) as any[];

  return {
    ...session,
    source_files: JSON.parse(session.source_files),
    questions: dbQuestions.map(q => ({ ...q, options: JSON.parse(q.options) })),
  };
}

export async function generateStudyTodos(input: GenerateStudyTodosInput): Promise<StudyPlan[]> {
  const settings = loadSettings();
  const apiKey = getApiKeyOrThrow();
  const { loadCandidateProfile } = await import('./settings-store');
  const profile = loadCandidateProfile();
  const sourceFiles = input.files?.length
    ? input.files
    : collectMarkdownFiles(settings.settings.study_materials_path, 18);
  const sourceMaterial = buildSourceMaterial(sourceFiles, 2800);
  const count = input.count || 8;

  const system = `You are a senior technical interview coach. Create a personalized TODO study plan based on the candidate's resume, job background, and local source materials. Adapt your recommendations to the candidate's actual tech stack and target roles — do not assume a specific platform or language unless the profile clearly indicates it.

Return ONLY valid JSON:
{
  "todos": [
    {
      "title": "short actionable learning item",
      "category": "relevant tech category based on profile",
      "tags": ["tag1", "tag2"],
      "priority": 0,
      "notes": "why this matters, how it relates to the candidate's background, and what to verify as learning outcome",
      "sourceFiles": ["absolute source file path if used"]
    }
  ]
}

Rules:
1. Generate exactly ${count} todos.
2. Each todo must be actionable for interview preparation.
3. priority: 0 (critical/must-know), 1 (important), 2 (nice-to-have). Assign higher priority to topics that appear in the resume but may need strengthening, or topics frequently asked for the target role.
4. Use absolute source paths only from the provided material paths.
5. If the profile reveals specific technologies (e.g., Android, Kotlin, Jetpack, React, Python, etc.), naturally focus on those. If no specific stack is detected, generate a balanced plan covering fundamentals and the stated goal/focus.
6. Each notes field should explain: why this topic matters for THIS candidate, how it connects to their resume or job context, and what the learning checkpoint should be.`;

  let profileSection = '';
  if (profile.resume_text) {
    const resumeExcerpt = profile.resume_text.slice(0, 2000);
    profileSection += `\n\nCANDIDATE RESUME:\n${resumeExcerpt}`;
  }
  if (profile.job_context) {
    profileSection += `\n\nJOB SEARCH CONTEXT:\n${profile.job_context}`;
  }

  const user = `GOAL:\n${input.goal}\n\nFOCUS:\n${input.focus || 'Technical interview preparation'}\n${profileSection}\n\nLOCAL SOURCE MATERIAL:\n${sourceMaterial || 'No local documents were found. Generate a sensible study plan based on the candidate profile and mark sourceFiles as [].'}`;

  const response = await apiRequest({
    model: settings.settings.quiz_model || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  }, apiKey);

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  const parsed = JSON.parse(stripJsonFence(content));
  if (!Array.isArray(parsed.todos)) {
    throw new Error('Response missing "todos" array');
  }

  const db = getDatabase();
  const insert = db.prepare(
    `INSERT INTO study_plans (title, category, tags, status, priority, notes, source_file, source_files, ai_generated)
     VALUES (@title, @category, @tags, 'pending', @priority, @notes, @source_file, @source_files, 1)`
  );

  const ids: number[] = [];
  const transaction = db.transaction(() => {
    for (const todo of parsed.todos) {
      const todoSourceFiles = Array.isArray(todo.sourceFiles) ? todo.sourceFiles : [];
      const result = insert.run({
        title: String(todo.title || '').trim() || '未命名学习项目',
        category: todo.category || 'General',
        tags: JSON.stringify(Array.isArray(todo.tags) ? todo.tags : []),
        priority: Number.isInteger(todo.priority) ? todo.priority : 1,
        notes: todo.notes || null,
        source_file: todoSourceFiles[0] || null,
        source_files: JSON.stringify(todoSourceFiles),
      });
      ids.push(result.lastInsertRowid as number);
    }
  });
  transaction();

  return db.prepare(`SELECT * FROM study_plans WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY priority DESC, id ASC`)
    .all(...ids)
    .map(parsePlanRow);
}

export async function generateStudyMaterials(input: GenerateStudyMaterialsInput): Promise<GeneratedStudyMaterialsResult> {
  const settings = loadSettings();
  const apiKey = getApiKeyOrThrow();
  const { loadCandidateProfile } = await import('./settings-store');
  const profile = loadCandidateProfile();
  const db = getDatabase();

  if (input.planIds.length === 0) {
    throw new Error('No plans selected');
  }

  const plans = db.prepare(`SELECT * FROM study_plans WHERE id IN (${input.planIds.map(() => '?').join(',')}) ORDER BY priority DESC, id ASC`)
    .all(...input.planIds)
    .map(parsePlanRow);

  if (plans.length === 0) {
    throw new Error('No plans selected');
  }

  const files = Array.from(new Set(plans.flatMap((plan) => plan.source_files.length ? plan.source_files : plan.source_file ? [plan.source_file] : [])));
  const sourceMaterial = buildSourceMaterial(files, 4500);
  const planSummary = plans.map((plan, index) => `${index + 1}. ${plan.title}\nCategory: ${plan.category || '未分类'}\nTags: ${plan.tags.join(', ')}\nNotes: ${plan.notes || ''}`).join('\n\n');

  const system = `You are a rigorous technical learning-material author. Generate accurate Markdown study notes for each selected TODO. Ground claims in the provided local material when available, and clearly mark general best-practice content when it is inferred. Tailor examples and depth to the candidate's background.

Return ONLY valid JSON:
{
  "materials": [
    {
      "planId": 1,
      "markdown": "# Title\\n..."
    }
  ]
}

Each markdown document must include: learning objective, key concepts, practical code examples relevant to the candidate's tech stack, common interview traps, checklist, and references to source filenames.`;

  let audienceContext = input.audience || 'developer preparing for technical interviews';
  if (profile.job_context) {
    audienceContext = `${audienceContext}\nCandidate job context: ${profile.job_context}`;
  }
  if (profile.resume_text) {
    audienceContext = `${audienceContext}\nCandidate resume summary: ${profile.resume_text.slice(0, 800)}`;
  }

  const response = await apiRequest({
    model: settings.settings.quiz_model || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `AUDIENCE:\n${audienceContext}\n\nTODO PLAN:\n${planSummary}\n\nLOCAL SOURCE MATERIAL:\n${sourceMaterial || 'No source files were attached.'}` },
    ],
    stream: false,
  }, apiKey);

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  const parsed = JSON.parse(stripJsonFence(content));
  if (!Array.isArray(parsed.materials)) {
    throw new Error('Response missing "materials" array');
  }

  const outputDirectory = path.join(settings.settings.study_materials_path, 'QuizMate生成学习资料');
  fs.mkdirSync(outputDirectory, { recursive: true });

  const update = db.prepare(
    `UPDATE study_plans
     SET generated_material = @generated_material, material_file = @material_file, status = 'in_progress', updated_at = datetime('now')
     WHERE id = @id`
  );

  for (const material of parsed.materials) {
    const plan = plans.find((item) => item.id === Number(material.planId));
    if (!plan) continue;

    const markdown = String(material.markdown || '').trim();
    const safeTitle = plan.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
    const filePath = path.join(outputDirectory, `${String(plan.id).padStart(3, '0')}-${safeTitle}.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');
    update.run({ id: plan.id, generated_material: markdown, material_file: filePath });
  }

  const updatedPlans = db.prepare(`SELECT * FROM study_plans WHERE id IN (${input.planIds.map(() => '?').join(',')}) ORDER BY priority DESC, id ASC`)
    .all(...input.planIds)
    .map(parsePlanRow);

  return { plans: updatedPlans, outputDirectory };
}
