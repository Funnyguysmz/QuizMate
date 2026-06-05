import { getDatabase } from './database';
import { collectMarkdownFiles, collectAllMarkdownFiles, readMarkdownContent } from './file-scanner';
import { loadSettings } from './settings-store';
import { selectQuizSources } from './quiz-source-selector';
import type {
  GenerateStudyMaterialsInput,
  GenerateStudyTodosInput,
  GeneratedStudyMaterialsResult,
  ImportInterviewInput,
  ImportInterviewResult,
  QuizGenerateInput,
  QuizSessionWithQuestions,
  StudyPlan,
} from '../../shared/types';
import type { SelectedFile, QuizSourceResult } from './quiz-source-selector';
import * as https from 'https';
import * as http from 'http';
import fs from 'fs';
import path from 'path';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEFAULT_API_TIMEOUT_MS = 60_000;
const THINKING_API_TIMEOUT_MS = 180_000;

function buildPrompt(files: string[], questionCount: number, topic?: string): { system: string; user: string } {
  const focusInstruction = topic
    ? `题目应重点围绕"${topic}"展开。`
    : '题目应覆盖资料中的不同主题。';

  const system = `你是一名资深技术面试官，负责为准备面试的高级软件工程师生成多选题。题目应考查深层理解，而非表面记忆。

规则：
1. 基于提供的资料精确生成 ${questionCount} 道题。
2. 每题必须包含 4 个选项（A, B, C, D），选项前缀保持英文字母大写。
3. 正确答案必须唯一且可在资料中验证。
4. 干扰项应合理，包含常见的误解作为错误选项。
5. ${focusInstruction}
6. 如果资料包含代码，应在题目中适当加入代码片段。
7. 每题必须附带详细解释，说明正确答案的理由。
8. 只输出有效 JSON，不要其他任何文本。

语言要求：
- 所有题目的题干（question）、选项文本（options）、解释（explanation）都必须使用**简体中文**输出。
- 技术专有名词、API 名称、类名、框架名、代码片段保持英文原文，不要翻译。例如 RecyclerView、ViewModel、StateFlow、CoroutineScope、Kotlin、Jetpack Compose 等应保持原样。
- JSON 字段名保持英文（question、options、correctAnswer、explanation），不要翻译成中文。
- 选项前缀保持 "A) ", "B) ", "C) ", "D) " 格式，字母为大写英文。

"correctAnswer" 字段的值必须恰好是 "A"、"B"、"C" 或 "D"——不能填写选项全文。
"options" 数组必须恰好包含 4 个字符串，每个以大写字母 + ") " 开头。
"explanation" 字段应包含 2-5 句有技术深度的解释。

返回如下 JSON 对象：
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

  const user = `参考资料：\n${sources}\n\n请基于上述资料生成 ${questionCount} 道多选题。`;

  return { system, user };
}

function apiRequest(body: any, apiKey: string, timeoutMs = DEFAULT_API_TIMEOUT_MS): Promise<any> {
  const url = new URL(DEEPSEEK_ENDPOINT);
  const payload = JSON.stringify(body);

  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || '';
  const useProxy = !!proxyUrl;

  if (useProxy) {
    return requestViaProxy(proxyUrl, url, payload, apiKey, timeoutMs);
  }
  return requestDirect(url, payload, apiKey, timeoutMs);
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

function requestDirect(url: URL, payload: string, apiKey: string, timeoutMs: number): Promise<any> {
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

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`DeepSeek API request timed out after ${Math.round(timeoutMs / 1000)}s`));
    });

    req.write(payload);
    req.end();
  });
}

function requestViaProxy(proxyUrl: string, targetUrl: URL, payload: string, apiKey: string, timeoutMs: number): Promise<any> {
  let proxy: URL;
  try {
    proxy = new URL(proxyUrl);
  } catch {
    return requestDirect(targetUrl, payload, apiKey, timeoutMs);
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

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`DeepSeek API request timed out after ${Math.round(timeoutMs / 1000)}s`));
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
  const mode = input.mode || 'smart_agent';

  if (mode === 'manual_files') {
    return generateQuizManual(input);
  }

  return generateQuizSmartAgent(input);
}

async function generateQuizManual(input: QuizGenerateInput): Promise<QuizSessionWithQuestions> {
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
  const title = `测验 - ${new Date().toLocaleDateString('zh-CN')}（${questions.length}题）`;

  const sessionResult = db.prepare(
    `INSERT INTO quiz_sessions (title, source_files, total_questions, status, agent_run_id, source_summary, quality_summary)
     VALUES (?, ?, ?, 'in_progress', NULL, NULL, NULL)`
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

async function generateQuizSmartAgent(input: QuizGenerateInput): Promise<QuizSessionWithQuestions> {
  const settings = loadSettings();
  const apiKey = getApiKeyOrThrow();
  const db = getDatabase();

  // Create agent run
  const runStmt = db.prepare(
    `INSERT INTO agent_runs (type, status, title, input_summary)
     VALUES (@type, 'running', @title, @input_summary)`
  );
  const focusHint = input.focus || input.topic || '';
  const fileHint = input.files.length > 0 ? `参考文件: ${input.files.length}个` : '自动筛选';
  const runResult = runStmt.run({
    type: 'quiz_generation',
    title: `智能出题：${focusHint || '自动聚焦弱点'}`,
    input_summary: `题目数量: ${input.questionCount}\n重点: ${focusHint || '无'}\n${fileHint}`,
  });
  const agentRunId = runResult.lastInsertRowid as number;

  // ── step helpers ────────
  const createStep = (name: string, orderIndex: number, stepInput?: string): number => {
    const stmt = db.prepare(
      `INSERT INTO agent_steps (run_id, name, status, order_index, input)
       VALUES (@run_id, @name, 'pending', @order_index, @input)`
    );
    const r = stmt.run({ run_id: agentRunId, name, order_index: orderIndex, input: stepInput || null });
    return r.lastInsertRowid as number;
  };

  const updateStep = (stepId: number, status: string, output?: string, error?: string) => {
    const fields = ['status = @status'];
    const values: Record<string, any> = { id: stepId, status };
    if (output !== undefined) { fields.push('output = @output'); values.output = output; }
    if (error !== undefined) { fields.push('error = @error'); values.error = error; }
    if (status === 'completed') { fields.push("completed_at = datetime('now')"); }
    db.prepare(`UPDATE agent_steps SET ${fields.join(', ')} WHERE id = @id`).run(values);
  };

  const failRun = (stepId: number | null, errorMessage: string) => {
    if (stepId !== null) updateStep(stepId, 'failed', undefined, errorMessage);
    db.prepare(
      `UPDATE agent_runs SET status = 'failed', output_summary = @error, updated_at = datetime('now') WHERE id = @id`
    ).run({ id: agentRunId, error: errorMessage });
  };

  let currentStepId: number | null = null;

  try {
    // ════════════════════════════════════════════
    // Step 1: 读取历史错题与面试弱点
    // ════════════════════════════════════════════
    const step1Id = createStep('读取历史错题与面试弱点', 1);
    currentStepId = step1Id;
    updateStep(step1Id, 'running');

    const wrongAnswers = db.prepare(
      `SELECT * FROM wrong_answers WHERE status = 'unresolved' ORDER BY review_count DESC, last_correct ASC LIMIT 50`
    ).all() as any[];

    const weakQuestions = db.prepare(
      `SELECT * FROM interview_questions WHERE answer_quality IN ('weak', 'medium') ORDER BY created_at DESC LIMIT 50`
    ).all() as any[];

    const wrongAnswerTopics = new Set<string>();
    const interviewTopics = new Set<string>();
    const weaknessTags = new Set<string>();

    for (const wa of wrongAnswers) {
      if (wa.category) wrongAnswerTopics.add(wa.category);
    }
    for (const q of weakQuestions) {
      if (q.topic) interviewTopics.add(q.topic);
      try {
        const tags = JSON.parse(q.weakness_tags || '[]');
        for (const tag of tags) {
          if (typeof tag === 'string' && tag.trim()) weaknessTags.add(tag.trim());
        }
      } catch {}
    }

    const step1Parts: string[] = [];
    if (wrongAnswers.length > 0) step1Parts.push(`未解决错题${wrongAnswers.length}道，涉及${wrongAnswerTopics.size}个领域`);
    if (weakQuestions.length > 0) step1Parts.push(`面试弱点${weakQuestions.length}个`);
    if (weaknessTags.size > 0) step1Parts.push(`弱点标签: ${Array.from(weaknessTags).slice(0, 10).join('、')}`);
    const step1Output = step1Parts.length > 0 ? step1Parts.join('；') : '暂无历史弱点数据';

    updateStep(step1Id, 'completed', step1Output);
    currentStepId = null;

    // ════════════════════════════════════════════
    // Step 2: 搜集候选资料
    // ════════════════════════════════════════════
    const step2Id = createStep('搜集候选资料', 2);
    currentStepId = step2Id;
    updateStep(step2Id, 'running');

    const allFiles = collectAllMarkdownFiles(settings.settings.study_materials_path);

    if (allFiles.length === 0) {
      throw new Error('未找到任何本地资料文件，请先导入学习资料');
    }

    updateStep(step2Id, 'completed', `共找到 ${allFiles.length} 个 Markdown 文件`);
    currentStepId = null;

    // ════════════════════════════════════════════
    // Step 3: 筛选高价值资料
    // ════════════════════════════════════════════
    const step3Id = createStep('筛选高价值资料', 3);
    currentStepId = step3Id;
    updateStep(step3Id, 'running');

    const selectedResult = selectQuizSources({
      explicitFiles: input.files,
      questionCount: input.questionCount,
      focus: input.focus || input.topic,
      studyMaterialsPath: settings.settings.study_materials_path,
    });

    if (selectedResult.selectedFiles.length === 0) {
      throw new Error('未找到高价值资料，请选择参考文件或先导入面试/错题数据');
    }

    const step3Output = `选中 ${selectedResult.selectedFiles.length} 个文件\n` +
      `重点领域: ${selectedResult.focusTopics.slice(0, 5).join(', ') || '无'}\n` +
      `弱点概述: ${selectedResult.weaknessSummary}`;

    updateStep(step3Id, 'completed', step3Output + `\n忽略文件: ${selectedResult.ignoredFiles.length} 个`);
    currentStepId = null;

    // ════════════════════════════════════════════
    // Step 4: 总结出题蓝图
    // ════════════════════════════════════════════
    const step4Id = createStep('总结出题蓝图', 4);
    currentStepId = step4Id;
    updateStep(step4Id, 'running');

    const blueprint = {
      focusTopics: selectedResult.focusTopics,
      weaknessSummary: selectedResult.weaknessSummary,
      questionCount: input.questionCount,
      selectedFiles: selectedResult.selectedFiles.map(f => ({ path: f.path, title: f.title, score: f.score })),
      questionDistribution: selectedResult.focusTopics.length > 0
        ? `基于 ${selectedResult.focusTopics.length} 个重点领域分配题目`
        : '基于选中资料内容分配题目',
    };

    updateStep(step4Id, 'completed', JSON.stringify(blueprint, null, 2));
    currentStepId = null;

    // ════════════════════════════════════════════
    // Step 5: DeepSeek thinking 生成中文试题
    // ════════════════════════════════════════════
    const step5Id = createStep('DeepSeek thinking 生成中文试题', 5);
    currentStepId = step5Id;
    updateStep(step5Id, 'running');

    const { system: smartSystem, user: smartUser } = buildSmartQuizPrompt(
      selectedResult.selectedFiles,
      input.questionCount,
      selectedResult.focusTopics,
      selectedResult.weaknessSummary,
      input.topic,
      input.focus
    );

    const requestBody: any = {
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: smartSystem },
        { role: 'user', content: smartUser },
      ],
      stream: false,
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
    };

    const response = await apiRequest(requestBody, apiKey, THINKING_API_TIMEOUT_MS);
    const responseContent = response.choices?.[0]?.message?.content;
    if (!responseContent) throw new Error('DeepSeek 返回空响应');

    let questions: any[];
    let repairNeeded = false;

    try {
      questions = parseQuizResponse(response);
      const validationError = validateQuizQuestions(questions, input.questionCount);
      if (validationError) throw new Error(validationError);
    } catch (firstError: any) {
      repairNeeded = true;
      updateStep(step5Id, 'running', undefined, `首次生成校验不通过: ${firstError.message}，尝试修复...`);

      const repairPrompt = buildRepairPrompt(smartUser, responseContent, firstError.message, input.questionCount);
      const repairBody: any = {
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: smartSystem },
          { role: 'user', content: repairPrompt },
        ],
        stream: false,
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      };

      const repairResponse = await apiRequest(repairBody, apiKey, THINKING_API_TIMEOUT_MS);

      try {
        questions = parseQuizResponse(repairResponse);
        const repairValidation = validateQuizQuestions(questions, input.questionCount);
        if (repairValidation) throw new Error(repairValidation);
      } catch (repairError: any) {
        throw new Error(`修复失败: ${repairError.message}`);
      }
    }

    const step5Output = `成功生成 ${questions.length} 道题${repairNeeded ? '（经修复）' : ''}`;
    updateStep(step5Id, 'completed', step5Output);
    currentStepId = null;

    // ════════════════════════════════════════════
    // Step 6: 校验并写入测验
    // ════════════════════════════════════════════
    const step6Id = createStep('校验并写入测验', 6);
    currentStepId = step6Id;
    updateStep(step6Id, 'running');

    const sourceSummary = JSON.stringify({
      selectedFiles: selectedResult.selectedFiles.map(f => ({ path: f.path, title: f.title, score: f.score })),
      focusTopics: selectedResult.focusTopics,
      weaknessSummary: selectedResult.weaknessSummary,
    });

    const qualitySummary = JSON.stringify({
      exactCount: questions.length === input.questionCount,
      chineseChecked: true,
      optionPrefixChecked: true,
      repairNeeded,
      validationPassed: true,
    });

    const title = `测验 - ${new Date().toLocaleDateString('zh-CN')}（${questions.length}题）`;

    let sessionId!: number;

    const transaction = db.transaction(() => {
      const sessionResult = db.prepare(
        `INSERT INTO quiz_sessions (title, source_files, total_questions, status, agent_run_id, source_summary, quality_summary)
         VALUES (?, ?, ?, 'in_progress', ?, ?, ?)`
      ).run(
        title,
        JSON.stringify(selectedResult.selectedFiles.map(f => f.path)),
        questions.length,
        agentRunId,
        sourceSummary,
        qualitySummary
      );
      sessionId = sessionResult.lastInsertRowid as number;

      const insertQuestion = db.prepare(
        `INSERT INTO quiz_questions (session_id, question_number, question_text, options, correct_answer, explanation, source_file)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const matchedFile = selectedResult.selectedFiles.find(f =>
          (q.question || '').toLowerCase().includes(f.title.toLowerCase())
        );
        const sourceFile = matchedFile?.path || selectedResult.selectedFiles[0]?.path || null;

        insertQuestion.run(
          sessionId, i + 1, q.question, JSON.stringify(q.options),
          q.correctAnswer, q.explanation || null, sourceFile
        );
      }
    });

    transaction();

    updateStep(step6Id, 'completed', `已写入 quiz_session #${sessionId}，共 ${questions.length} 道题`);
    db.prepare(
      `UPDATE agent_runs SET status = 'completed', output_summary = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      `生成 ${questions.length} 道题\n焦点: ${selectedResult.focusTopics.slice(0, 3).join(', ') || '无'}\n资料: ${selectedResult.selectedFiles.length} 个文件`,
      agentRunId
    );
    currentStepId = null;

    // ── return ──
    const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(sessionId) as any;
    const dbQuestions = db.prepare('SELECT * FROM quiz_questions WHERE session_id = ? ORDER BY question_number').all(sessionId) as any[];

    return {
      ...session,
      source_files: JSON.parse(session.source_files),
      questions: dbQuestions.map(q => ({ ...q, options: JSON.parse(q.options) })),
    };
  } catch (error: any) {
    failRun(currentStepId, error.message || '未知错误');
    throw error;
  }
}

function buildSmartQuizPrompt(
  selectedFiles: SelectedFile[],
  questionCount: number,
  focusTopics: string[],
  weaknessSummary: string,
  topic?: string,
  focus?: string
): { system: string; user: string } {
  const userFocus = focus || topic;
  const focusInstruction = userFocus
    ? `题目应重点围绕"${userFocus}"展开。`
    : focusTopics.length > 0
      ? `题目应重点围绕以下焦点领域展开：${focusTopics.join('、')}。`
      : '题目应覆盖资料中的不同主题。';

  const system = `你是一名资深技术面试官，负责为准备面试的高级软件工程师生成高质量的多选题。

你掌握以下背景信息：
- 候选人的历史弱项领域
- 选中的学习资料
- 焦点领域

规则：
1. 基于提供的资料精确生成 ${questionCount} 道题。
2. 每题必须包含 4 个选项（A, B, C, D），选项前缀保持英文字母大写。
3. 正确答案必须唯一且可在资料中验证。
4. 干扰项应合理，包含常见的误解作为错误选项。
5. ${focusInstruction}
6. 如果资料包含代码，应在题目中适当加入代码片段。
7. 每题必须附带详细解释，说明正确答案的理由，并指出常见错误。
8. 特别关注候选人的弱点领域，针对性地出题帮助巩固薄弱环节。
9. 只输出有效 JSON，不要其他任何文本。

语言要求：
- 所有题目的题干（question）、选项文本（options）、解释（explanation）都必须使用**简体中文**输出。
- 技术专有名词、API 名称、类名、框架名、代码片段保持英文原文，不要翻译。例如 RecyclerView、ViewModel、StateFlow、CoroutineScope、Kotlin、Jetpack Compose 等应保持原样。
- JSON 字段名保持英文（question、options、correctAnswer、explanation），不要翻译成中文。
- 选项前缀保持 "A) ", "B) ", "C) ", "D) " 格式，字母为大写英文。

"correctAnswer" 字段的值必须恰好是 "A"、"B"、"C" 或 "D"——不能填写选项全文。
"options" 数组必须恰好包含 4 个字符串，每个以大写字母 + ") " 开头。
"explanation" 字段应包含 2-5 句有技术深度的解释。

返回如下 JSON 对象：
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

  const sources = selectedFiles.map(file => {
    const content = readMarkdownContent(file.path);
    return `## ${file.title}\nPath: ${file.path}\n\n${content.substring(0, 4000)}`;
  }).join('\n\n---\n\n');

  const userFocusLine = userFocus ? `用户关注方向：${userFocus}\n\n` : '';
  const user = `${userFocusLine}候选人弱点分析：
${weaknessSummary}

焦点领域：
${focusTopics.length > 0 ? focusTopics.join('、') : '无特定焦点'}

参考资料：
${sources}

请基于上述资料和候选人的弱点分析，生成 ${questionCount} 道有针对性且高质量的多选题。题目应重点考察候选人的薄弱环节，帮助其巩固知识。`;

  return { system, user };
}

function validateQuizQuestions(questions: any[], expectedCount: number): string | null {
  if (!Array.isArray(questions)) return 'questions 不是数组';
  if (questions.length === 0) return '未生成任何题目';
  if (questions.length !== expectedCount) return `题目数量不符: 期望${expectedCount}题，实际${questions.length}题`;

  // Chinese character detection: at least one CJK character in the range 一-鿿
  const hasChinese = (text: string): boolean => /[一-鿿]/.test(text);
  const hasSemanticContent = (text: string): boolean => {
    const reasonWords = ['正确原因', '因为', '原因', '所以', '因此', '关键在于', '本质是'];
    const pitfallWords = ['常见误区', '误区', '容易误解', '错误理解', '不要认为', '容易犯', '易错点'];
    const examWords = ['考点', '考察', '重点', '关键点', '核心机制', '面试中', '常考'];
    const allWords = [...reasonWords, ...pitfallWords, ...examWords];
    const hasKeyword = allWords.some(kw => text.includes(kw));
    const chineseCharCount = (text.match(/[一-鿿]/g) || []).length;
    const sentenceCount = (text.match(/[。！？；]/g) || []).length;
    return hasKeyword || (chineseCharCount >= 40 && sentenceCount >= 2);
  };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Question text must exist and contain Chinese
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
      return `第${i + 1}题题干为空`;
    }
    if (!hasChinese(q.question)) {
      return `第${i + 1}题题干未包含中文`;
    }

    // Options must be exactly 4
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return `第${i + 1}题选项不是4个`;
    }

    // Each option must start with the correct prefix. Technical option values
    // may be pure identifiers, but the option set should still read in Chinese.
    const expectedPrefixes = ['A) ', 'B) ', 'C) ', 'D) '];
    let optionsWithChinese = 0;
    for (let j = 0; j < 4; j++) {
      const opt = q.options[j];
      if (typeof opt !== 'string' || !opt.startsWith(expectedPrefixes[j])) {
        return `第${i + 1}题选项${j + 1}前缀不正确，期望"${expectedPrefixes[j].trim()}"开头`;
      }
      const optBody = opt.slice(3).trim(); // text after "X) "
      if (optBody.length === 0) {
        return `第${i + 1}题选项${j + 1}内容为空`;
      }
      if (hasChinese(optBody)) optionsWithChinese++;
    }
    if (optionsWithChinese === 0) {
      return `第${i + 1}题选项缺少中文语境`;
    }

    // correctAnswer must be A/B/C/D
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
      return `第${i + 1}题 correctAnswer 不是 A/B/C/D: ${q.correctAnswer}`;
    }

    // Explanation must exist and contain Chinese
    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
      return `第${i + 1}题缺少解释`;
    }
    if (!hasChinese(q.explanation)) {
      return `第${i + 1}题解释未包含中文`;
    }
    if (!hasSemanticContent(q.explanation)) {
      return `第${i + 1}题解释过于空泛，缺少正确原因/常见误区/考点说明`;
    }
  }

  return null; // valid
}

function buildRepairPrompt(
  originalUserPrompt: string,
  previousResponse: string,
  errorMessage: string,
  expectedCount: number
): string {
  return `之前的生成结果校验未通过。

校验错误：${errorMessage}
期望题目数量：${expectedCount} 题

之前模型返回的内容（可能格式错误或内容不符合要求）：
${previousResponse}

─── 原始出题要求与参考资料 ───

${originalUserPrompt}

─── 修复要求 ───

请重新生成完全符合要求的多选题 JSON：
1. 只输出纯 JSON 对象，不要包含 \`\`\` 或任何 markdown 标记。
2. JSON 必须包含 "questions" 数组，恰好 ${expectedCount} 道题。
3. 每道题包含 "question"（简体中文题干）、"options"（恰好4个选项字符串，以 "A) " "B) " "C) " "D) " 开头）、"correctAnswer"（仅 "A"/"B"/"C"/"D"）、"explanation"（简体中文解释）。
4. 所有题目文字使用简体中文，技术专有名词（如 RecyclerView、ViewModel、StateFlow、Binder、Kotlin 等）保持英文原文。
5. 解释必须包含正确原因、常见误区或考点中的至少一项。`;
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

  const system = `你是一名资深技术面试辅导教练。基于候选人的简历、求职背景和本地资料，为候选人制定个性化的 TODO 学习计划。根据候选人实际的技术栈和目标岗位调整建议——除非候选人信息明确指明，否则不要假设特定的平台或语言。

只输出有效 JSON：
{
  "todos": [
    {
      "title": "简短可执行的学习项目",
      "category": "基于候选人背景的技术类别",
      "tags": ["tag1", "tag2"],
      "priority": 0,
      "notes": "为什么这很重要、与候选人背景的关联、以及如何验证学习成果",
      "sourceFiles": ["使用的资料绝对路径"]
    }
  ]
}

语言要求：
- todos.title、category、notes 字段必须使用**简体中文**。
- tags 字段可以中英混用，但技术专有名词保持英文原文。
- notes 字段需要用中文说明：为什么要学这个主题、它与候选人简历/求职背景的关联、以及如何验收学习成果。
- JSON 字段名保持英文（title、category、tags、priority、notes、sourceFiles），不要翻译。

规则：
1. 精确生成 ${count} 个 TODO。
2. 每个 TODO 必须对面试准备有实际可执行的价值。
3. priority：0（关键/必须掌握）、1（重要）、2（锦上添花）。优先分配高优先级给简历中提及但可能需要加强的主题，或目标岗位高频考察的主题。
4. 仅使用提供的资料路径中的绝对路径。
5. 如果候选人信息显示了具体技术（如 Android、Kotlin、Jetpack、React、Python 等），应自然地聚焦这些技术。如未检测到特定技术栈，则生成覆盖基础知识和目标方向/重点的平衡计划。
6. 每个 notes 字段应解释：为什么这个主题对**该候选人**重要、它与候选人简历/求职背景的关联、以及学习验收点是什么。`;

  let profileSection = '';
  if (profile.resume_text) {
    const resumeExcerpt = profile.resume_text.slice(0, 2000);
    profileSection += `\n\n候选人简历：\n${resumeExcerpt}`;
  }
  if (profile.job_context) {
    profileSection += `\n\n求职背景：\n${profile.job_context}`;
  }

  const user = `目标：\n${input.goal}\n\n重点：\n${input.focus || '技术面试准备'}\n${profileSection}\n\n本地参考资料：\n${sourceMaterial || '未找到本地文档。请根据候选人信息生成合理的学习计划，并将 sourceFiles 标记为 []。'}`;

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
  const planSummary = plans.map((plan, index) => `${index + 1}. ${plan.title}\n分类：${plan.category || '未分类'}\n标签：${plan.tags.join(', ')}\n备注：${plan.notes || ''}`).join('\n\n');

  const system = `你是一名严谨的技术学习资料作者。针对每个选中的 TODO 生成准确的 Markdown 学习笔记。有本地资料可用时，结论应有据可查；为通用最佳实践内容时需明确标注。根据候选人背景定制示例和讲解深度。

只输出有效 JSON：
{
  "materials": [
    {
      "planId": 1,
      "markdown": "# 标题\\n..."
    }
  ]
}

语言要求：
- markdown 正文字段必须使用**简体中文**。
- 技术名词、代码、API 名称、库名保持英文原文，不要翻译（如 RecyclerView、ViewModel、StateFlow、Kotlin、CoroutineScope 等）。
- 章节标题（如 # 学习目标、## 核心概念等）使用中文。
- 如果引用了英文源材料，应用中文解释其内容，不要大段照抄英文原文。
- JSON 字段名保持英文（planId、markdown），不要翻译。

每个 markdown 文档必须包含：学习目标、核心概念、与候选人技术栈相关的实用代码示例、常见面试陷阱、检查清单、以及引用的源文件名。`;

  let audienceContext = input.audience || '准备技术面试的开发者';
  if (profile.job_context) {
    audienceContext = `${audienceContext}\n候选人求职背景：${profile.job_context}`;
  }
  if (profile.resume_text) {
    audienceContext = `${audienceContext}\n候选人简历概要：${profile.resume_text.slice(0, 800)}`;
  }

  const response = await apiRequest({
    model: settings.settings.quiz_model || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `受众：\n${audienceContext}\n\nTODO 计划：\n${planSummary}\n\n本地参考资料：\n${sourceMaterial || '未附加源文件。'}` },
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

export async function importInterviewFromFile(input: ImportInterviewInput): Promise<ImportInterviewResult> {
  const settings = loadSettings();
  const apiKey = getApiKeyOrThrow();
  const db = getDatabase();

  // Step 0: Read file
  if (!fs.existsSync(input.filePath)) {
    throw new Error(`File not found: ${input.filePath}`);
  }
  const rawContent = fs.readFileSync(input.filePath, 'utf-8').trim();
  if (!rawContent) {
    throw new Error('File is empty');
  }

  // Truncate content to avoid excessive token usage (max ~8000 chars for the prompt)
  const contentForPrompt = rawContent.length > 8000 ? rawContent.slice(0, 8000) + '\n\n[... 原文过长，已截断 ...]' : rawContent;

  // Step 1: Create agent run
  const fileName = input.filePath.split('/').pop() || input.filePath;
  const runStmt = db.prepare(
    `INSERT INTO agent_runs (type, status, title, input_summary)
     VALUES (@type, 'running', @title, @input_summary)`
  );
  const runResult = runStmt.run({
    type: 'interview_import',
    title: `导入面试记录：${fileName}`,
    input_summary: `文件: ${input.filePath}\n公司提示: ${input.companyHint || '无'}\n轮次提示: ${input.roundHint || '无'}\n结果提示: ${input.resultHint || 'unknown'}`,
  });
  const agentRunId = runResult.lastInsertRowid as number;

  // Helper: create step
  const createStep = (name: string, orderIndex: number, stepInput?: string): number => {
    const stmt = db.prepare(
      `INSERT INTO agent_steps (run_id, name, status, order_index, input)
       VALUES (@run_id, @name, 'pending', @order_index, @input)`
    );
    const r = stmt.run({
      run_id: agentRunId,
      name,
      order_index: orderIndex,
      input: stepInput || null,
    });
    return r.lastInsertRowid as number;
  };

  // Helper: update step
  const updateStep = (stepId: number, status: string, output?: string, error?: string) => {
    const fields = ['status = @status'];
    const values: Record<string, any> = { id: stepId, status };
    if (output !== undefined) { fields.push('output = @output'); values.output = output; }
    if (error !== undefined) { fields.push('error = @error'); values.error = error; }
    if (status === 'completed') { fields.push("completed_at = datetime('now')"); }
    db.prepare(`UPDATE agent_steps SET ${fields.join(', ')} WHERE id = @id`).run(values);
  };

  // Helper: fail the run
  const failRun = (stepId: number | null, errorMessage: string) => {
    if (stepId !== null) {
      updateStep(stepId, 'failed', undefined, errorMessage);
    }
    db.prepare(`UPDATE agent_runs SET status = 'failed', output_summary = @error, updated_at = datetime('now') WHERE id = @id`)
      .run({ id: agentRunId, error: errorMessage });
  };

  let currentStepId: number | null = null;
  try {
    // Step 1: 读取面试记录
    const step1Id = createStep('读取面试记录', 1, `读取文件: ${input.filePath}`);
    currentStepId = step1Id;
    updateStep(step1Id, 'completed', `成功读取，共 ${rawContent.length} 字符`);
    currentStepId = null;

    // Step 2: Call DeepSeek to extract structured data
    const step2Id = createStep('抽取结构化面试信息', 2);
    const step3Id = createStep('抽取面试问题', 3);

    updateStep(step2Id, 'running');
    currentStepId = step2Id;

    const systemPrompt = `你是一位专业的面试记录分析助手。你的任务是从用户提供的面试经历文本中，抽取结构化信息。

规则：
1. 所有自然语言字段输出简体中文。技术专有名词保持原文（如 Binder、RecyclerView、StateFlow、Kotlin、ViewModel 等）。
2. 不要编造公司名称、轮次、面试结果。如果原文没有明确提及，使用 hint 提供的值，或使用 null/unknown。
3. answerQuality 只能是 "unknown"、"good"、"medium"、"weak" 之一。
4. result 只能是 "unknown"、"passed"、"failed"、"pending" 之一。
5. questions 必须来自原文中真实出现或明显可推断的问题，不要生成泛化题库。
6. weaknessTags 是对该问题回答质量的弱点分类，如 "framework-depth"、"follow-up-failed"、"concept-weak"、"no-answer"、"code-error"、"communication-issue" 等。
7. observations 是对本次面试的总体观察和总结，用中文撰写。
8. interviewerFocus 是面试官关注的重点领域。

只输出有效 JSON：
{
  "interview": {
    "company": "公司名或null",
    "team": "团队名或null",
    "round": "面试轮次或null",
    "date": "日期或null",
    "result": "unknown/passed/failed/pending",
    "interviewerFocus": "面试官关注点或null",
    "observations": "总体观察总结或null"
  },
  "questions": [
    {
      "questionText": "问题文本",
      "topic": "技术主题",
      "followUpQuestions": "追问内容或null",
      "answerQuality": "unknown/good/medium/weak",
      "weaknessTags": ["tag1", "tag2"]
    }
  ]
}`;

    const userPrompt = `公司提示: ${input.companyHint || '无'}
轮次提示: ${input.roundHint || '无'}
结果提示: ${input.resultHint || '无'}

面试记录原文：
${contentForPrompt}

请从以上面试记录中抽取结构化信息。`;

    const response = await apiRequest({
      model: settings.settings.quiz_model || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
    }, apiKey);

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek 返回空响应');

    const parsed = JSON.parse(stripJsonFence(content));
    if (!parsed.interview) throw new Error('响应缺少 interview 字段');
    if (!Array.isArray(parsed.questions)) throw new Error('响应缺少 questions 数组');

    // Validate interview.result
    const VALID_RESULTS = ['unknown', 'passed', 'failed', 'pending'] as const;
    let result: string = parsed.interview.result || 'unknown';
    if (!VALID_RESULTS.includes(result as any)) {
      if (input.resultHint && VALID_RESULTS.includes(input.resultHint as any)) {
        result = input.resultHint;
      } else {
        result = 'unknown';
      }
    }

    // Step 2 complete, Step 3 begin
    updateStep(step2Id, 'completed', JSON.stringify(parsed.interview));
    currentStepId = null;

    updateStep(step3Id, 'running');
    currentStepId = step3Id;

    // Filter and normalize questions
    const validQuestions = parsed.questions
      .filter((q: any) => {
        const text = (q.questionText || '').trim();
        return text.length > 0;
      })
      .map((q: any) => ({
        ...q,
        questionText: (q.questionText || '').trim(),
      }));

    if (validQuestions.length === 0) {
      throw new Error('未能从面试记录中抽取到有效问题');
    }

    updateStep(step3Id, 'completed', `成功抽取 ${validQuestions.length} 个问题`);
    currentStepId = null;

    // Step 4: Write to Interview Database
    const step4Id = createStep('写入 Interview Database', 4);
    updateStep(step4Id, 'running');
    currentStepId = step4Id;

    const iv = parsed.interview;
    const insertInterview = db.prepare(
      `INSERT INTO interview_records (company, team, round, date, result, source_file, interviewer_focus, observations, raw_notes)
       VALUES (@company, @team, @round, @date, @result, @source_file, @interviewer_focus, @observations, @raw_notes)`
    );
    const ivResult = insertInterview.run({
      company: iv.company || input.companyHint || '未知公司',
      team: iv.team || null,
      round: iv.round || input.roundHint || null,
      date: iv.date || null,
      result,
      source_file: input.filePath,
      interviewer_focus: iv.interviewerFocus || null,
      observations: iv.observations || null,
      raw_notes: rawContent,
    });
    const interviewId = ivResult.lastInsertRowid as number;

    const insertQuestion = db.prepare(
      `INSERT INTO interview_questions (interview_id, question_text, topic, follow_up_questions, answer_quality, weakness_tags)
       VALUES (@interview_id, @question_text, @topic, @follow_up_questions, @answer_quality, @weakness_tags)`
    );

    const VALID_ANSWER_QUALITIES = ['unknown', 'good', 'medium', 'weak'] as const;

    const insertedQuestions: any[] = [];
    for (const q of validQuestions) {
      // Validate answerQuality
      let answerQuality: string = q.answerQuality || 'unknown';
      if (!VALID_ANSWER_QUALITIES.includes(answerQuality as any)) {
        answerQuality = 'unknown';
      }

      // Validate weaknessTags as array
      let weaknessTags: string[] = [];
      if (Array.isArray(q.weaknessTags)) {
        weaknessTags = q.weaknessTags
          .map((t: any) => String(t).trim())
          .filter((t: string) => t.length > 0);
      }

      const qResult = insertQuestion.run({
        interview_id: interviewId,
        question_text: q.questionText || '',
        topic: q.topic || null,
        follow_up_questions: q.followUpQuestions || null,
        answer_quality: answerQuality,
        weakness_tags: JSON.stringify(weaknessTags),
      });
      const row = db.prepare('SELECT * FROM interview_questions WHERE id = ?').get(qResult.lastInsertRowid) as any;
      insertedQuestions.push({
        ...row,
        weakness_tags: JSON.parse(row.weakness_tags || '[]'),
      });
    }

    updateStep(step4Id, 'completed', `已写入 interview #${interviewId}，共 ${insertedQuestions.length} 个问题`);
    currentStepId = null;

    // Mark run as completed
    const outputSummary = `公司: ${iv.company || input.companyHint || '未知'}\n` +
      `轮次: ${iv.round || input.roundHint || '未知'}\n` +
      `结果: ${result}\n` +
      `问题数: ${insertedQuestions.length}\n` +
      `弱点标签: ${[...new Set(insertedQuestions.flatMap((q: any) => q.weakness_tags))].join(', ') || '无'}`;

    db.prepare(
      `UPDATE agent_runs SET status = 'completed', output_summary = @output_summary, updated_at = datetime('now') WHERE id = @id`
    ).run({ id: agentRunId, output_summary: outputSummary });

    // Return the full interview with questions
    const interview = db.prepare('SELECT * FROM interview_records WHERE id = ?').get(interviewId) as any;
    const questions = db.prepare('SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY created_at ASC').all(interviewId) as any[];

    return {
      interview: {
        ...interview,
        questions: questions.map((q: any) => ({
          ...q,
          weakness_tags: JSON.parse(q.weakness_tags || '[]'),
        })),
      },
      agentRunId,
    };
  } catch (error: any) {
    failRun(currentStepId, error.message || '未知错误');
    throw error;
  }
}
