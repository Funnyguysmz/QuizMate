import { getDatabase } from './database';
import { readMarkdownContent } from './file-scanner';
import { loadSettings } from './settings-store';
import type { QuizGenerateInput, QuizSessionWithQuestions } from '../../shared/types';
import * as https from 'https';
import * as http from 'http';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 7897;

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

function makeRequest(body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(DEEPSEEK_ENDPOINT);
    const payload = JSON.stringify(body);

    const options: https.RequestOptions = {
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      path: DEEPSEEK_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
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
      reject(new Error(`DeepSeek API request failed: ${err.message}\nMake sure proxy is running at ${PROXY_HOST}:${PROXY_PORT}`));
    });

    req.write(payload);
    req.end();
  });
}

function parseQuizResponse(data: any): any[] {
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  let jsonStr = content.trim();
  // Remove markdown code fences if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
  }

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
  if (!settings.apiKey) {
    throw new Error('NO_API_KEY');
  }

  const { system, user } = buildPrompt(input.files, input.questionCount, input.topic);

  const requestBody = {
    model: settings.settings.quiz_model || 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  };

  // Proxy auth header
  const apiKey = settings.apiKey;

  // Need to inject auth into proxy chain via headers
  const url = new URL(DEEPSEEK_ENDPOINT);
  const payload = JSON.stringify(requestBody);

  const response = await new Promise<any>((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      path: DEEPSEEK_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${apiKey}`,
        'Host': url.hostname,
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
      reject(new Error(`DeepSeek API request failed: ${err.message}\nMake sure proxy is running at ${PROXY_HOST}:${PROXY_PORT}`));
    });

    req.write(payload);
    req.end();
  });

  const questions = parseQuizResponse(response);

  // Store in database
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

  const insertedQuestions: any[] = [];
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
