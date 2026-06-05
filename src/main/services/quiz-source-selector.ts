import fs from 'fs';
import path from 'path';
import { getDatabase } from './database';
import { collectAllMarkdownFiles, readMarkdownContent } from './file-scanner';

export interface QuizSourceInput {
  explicitFiles: string[];
  questionCount: number;
  focus?: string;
  studyMaterialsPath: string;
}

export interface SelectedFile {
  path: string;
  title: string;
  score: number;
  reasons: string[];
}

export interface IgnoredFile {
  path: string;
  reason: string;
}

export interface QuizSourceResult {
  selectedFiles: SelectedFile[];
  focusTopics: string[];
  weaknessSummary: string;
  ignoredFiles: IgnoredFile[];
}

// High-priority keywords in file paths/names — these indicate files likely relevant for quiz generation
const HIGH_PRIORITY_PATH_KEYWORDS = [
  'weakness', '错题', '复盘', 'analysis',
  'interview_report', 'question_bank', 'weakness_heatmap',
  '面试', '考题', '重点', '总结', 'review',
];

// QuizMate generated materials directory names (multiple variants)
const QUIZMATE_MATERIALS_DIRS = [
  'QuizMate生成学习资料',
  'QuizMate学习资料',
  'QuizMate生成资料',
];

// Patterns to always ignore
const IGNORE_DIR_NAMES = new Set(['node_modules', '.git', '.claude', '__pycache__']);
const IGNORE_EXTENSIONS = new Set(['.pdf', '.tex', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.mp3', '.wav', '.mp4', '.mov', '.avi', '.zip', '.tar', '.gz', '.7z']);

// Pure resume keywords — files likely to be raw resumes (low value for quiz)
const PURE_RESUME_KEYWORDS = ['简历', 'resume', 'cv'];

// Analysis/reflection keywords — these override resume filtering
const ANALYSIS_KEYWORDS = ['讲解', '复盘', '分析', '总结', '话术', '溯源', '项目', '面试', 'review'];

// Minimum file content length to be considered (in chars)
const MIN_CONTENT_LENGTH = 50;

// Target: roughly 2-3 files per question, capped
const MAX_SELECTED_FILES = 15;

export function selectQuizSources(input: QuizSourceInput): QuizSourceResult {
  const db = getDatabase();
  const ignoredFiles: IgnoredFile[] = [];
  const scoredFiles = new Map<string, { score: number; reasons: string[] }>();

  // ---- Helper: add score to a file ----
  const addScore = (filePath: string, score: number, reason: string) => {
    const normalized = path.normalize(filePath);
    if (!scoredFiles.has(normalized)) {
      scoredFiles.set(normalized, { score: 0, reasons: [] });
    }
    const entry = scoredFiles.get(normalized)!;
    entry.score += score;
    if (!entry.reasons.includes(reason)) {
      entry.reasons.push(reason);
    }
  };

  // ---- Helper: check if file should be ignored ----
  const shouldIgnore = (filePath: string): string | null => {
    const ext = path.extname(filePath).toLowerCase();
    if (IGNORE_EXTENSIONS.has(ext)) {
      return `不支持的文件类型: ${ext}`;
    }
    const baseName = path.basename(filePath).toLowerCase();
    const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');

    // Check if filename suggests a pure resume (not analysis)
    const hasResumeKeyword = PURE_RESUME_KEYWORDS.some(kw => nameWithoutExt.includes(kw));
    const hasAnalysisKeyword = ANALYSIS_KEYWORDS.some(kw => nameWithoutExt.includes(kw));

    if (hasResumeKeyword && !hasAnalysisKeyword) {
      return `疑似纯简历文件: ${path.basename(filePath)}`;
    }
    // Ignore dotfiles
    if (path.basename(filePath).startsWith('.')) {
      return '隐藏文件';
    }
    // Ignore files in ignore dirs
    const parts = filePath.split(path.sep);
    for (const part of parts) {
      if (IGNORE_DIR_NAMES.has(part)) {
        return `位于忽略目录: ${part}`;
      }
    }
    return null;
  };

  // ============================================
  // Phase 1: Process explicit files (最高权重)
  // ============================================
  for (const filePath of input.explicitFiles) {
    const ignoreReason = shouldIgnore(filePath);
    if (ignoreReason) {
      ignoredFiles.push({ path: filePath, reason: `用户指定但${ignoreReason}` });
      continue;
    }
    if (!fs.existsSync(filePath)) {
      ignoredFiles.push({ path: filePath, reason: '用户指定但文件不存在' });
      continue;
    }
    const content = readMarkdownContent(filePath).trim();
    if (content.length < MIN_CONTENT_LENGTH) {
      ignoredFiles.push({ path: filePath, reason: `用户指定但内容过短(${content.length}字符)` });
      continue;
    }
    addScore(filePath, 100, '用户指定文件');
  }

  // ============================================
  // Phase 2: Extract focus topics from wrong answers
  // ============================================
  const wrongAnswers = db.prepare(
    `SELECT * FROM wrong_answers WHERE status = 'unresolved' ORDER BY review_count DESC, last_correct ASC LIMIT 50`
  ).all() as any[];

  const wrongAnswerTopics = new Set<string>();
  const wrongAnswerCategories = new Map<string, number>(); // category -> count

  for (const wa of wrongAnswers) {
    if (wa.category) {
      wrongAnswerTopics.add(wa.category);
      wrongAnswerCategories.set(wa.category, (wrongAnswerCategories.get(wa.category) || 0) + 1);
    }
    // Parse options to extract potential topics
    try {
      JSON.parse(wa.options || '[]');
      // options are question options, not topics — skip
    } catch {}
  }

  // ============================================
  // Phase 3: Extract topics from interview weaknesses
  // ============================================
  const weakQuestions = db.prepare(
    `SELECT * FROM interview_questions WHERE answer_quality IN ('weak', 'medium') ORDER BY created_at DESC LIMIT 50`
  ).all() as any[];

  const interviewTopics = new Set<string>();
  const allWeaknessTags = new Set<string>();

  for (const q of weakQuestions) {
    if (q.topic) interviewTopics.add(q.topic);
    try {
      const tags = JSON.parse(q.weakness_tags || '[]');
      for (const tag of tags) {
        if (typeof tag === 'string' && tag.trim()) {
          allWeaknessTags.add(tag.trim());
        }
      }
    } catch {}
  }

  // ============================================
  // Phase 4: Extract insights from failed interviews
  // ============================================
  const failedInterviews = db.prepare(
    `SELECT * FROM interview_records WHERE result = 'failed' ORDER BY created_at DESC LIMIT 20`
  ).all() as any[];

  const interviewFocusAreas = new Set<string>();
  for (const iv of failedInterviews) {
    if (iv.interviewer_focus) {
      // Split by common delimiters and add each token
      const tokens = iv.interviewer_focus.split(/[,，、;；\s]+/).filter((t: string) => t.length > 1);
      for (const token of tokens) {
        interviewFocusAreas.add(token);
      }
    }
  }

  // ============================================
  // Phase 5: Collect all local files and score them
  // ============================================
  const allLocalFiles = collectAllMarkdownFiles(input.studyMaterialsPath);

  // Build combined focus keywords for matching
  const focusKeywords = new Set<string>();
  for (const t of wrongAnswerTopics) focusKeywords.add(t.toLowerCase());
  for (const t of interviewTopics) focusKeywords.add(t.toLowerCase());
  for (const t of allWeaknessTags) focusKeywords.add(t.toLowerCase());
  for (const t of interviewFocusAreas) focusKeywords.add(t.toLowerCase());
  if (input.focus) {
    // Add focus keywords
    const focusTokens = input.focus.split(/[,，、;；\s]+/).filter((t: string) => t.length > 1);
    for (const token of focusTokens) {
      focusKeywords.add(token.toLowerCase());
    }
  }

  for (const filePath of allLocalFiles) {
    // Skip files already added as explicit
    if (scoredFiles.has(path.normalize(filePath))) continue;

    const ignoreReason = shouldIgnore(filePath);
    if (ignoreReason) {
      ignoredFiles.push({ path: filePath, reason: ignoreReason });
      continue;
    }

    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);
    const lowerName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // Check content length (avoid reading all files if not needed)
    try {
      const stat = fs.statSync(filePath);
      if (stat.size < 30) {
        ignoredFiles.push({ path: filePath, reason: `文件过小(${stat.size}字节)` });
        continue;
      }
    } catch {
      ignoredFiles.push({ path: filePath, reason: '无法读取文件信息' });
      continue;
    }

    // Score: Path/name contains high-priority keywords
    for (const kw of HIGH_PRIORITY_PATH_KEYWORDS) {
      if (lowerPath.includes(kw)) {
        score += 15;
        reasons.push(`路径包含关键词: ${kw}`);
      }
    }

    // Score: Is in QuizMate generated materials directory
    for (const dirName of QUIZMATE_MATERIALS_DIRS) {
      if (fileDir.includes(dirName)) {
        score += 10;
        reasons.push(`QuizMate生成资料目录: ${dirName}`);
        break; // only count once
      }
    }

    // Score: File name/content matches focus keywords
    // For performance, first check filename match
    let fileNameMatched = false;
    for (const kw of focusKeywords) {
      if (kw.length < 2) continue;
      if (lowerName.includes(kw)) {
        score += 20;
        reasons.push(`文件名匹配关键词: ${kw}`);
        fileNameMatched = true;
      }
    }

    // If filename didn't match, do a quick content check for focus keywords
    // (only read content if we have focus keywords and no filename match yet)
    if (focusKeywords.size > 0) {
      try {
        const content = readMarkdownContent(filePath).substring(0, 3000).toLowerCase();
        if (content.length < MIN_CONTENT_LENGTH) {
          ignoredFiles.push({ path: filePath, reason: `内容过短(${content.length}字符)` });
          continue;
        }
        for (const kw of focusKeywords) {
          if (kw.length < 2) continue;
          if (content.includes(kw)) {
            score += 10;
            if (!reasons.some(r => r.includes(kw))) {
              reasons.push(`内容匹配关键词: ${kw}`);
            }
          }
        }
      } catch {
        ignoredFiles.push({ path: filePath, reason: '无法读取文件内容' });
        continue;
      }
    }

    // Only add files with positive score — score-0 files go to ignored
    if (score > 0) {
      addScore(filePath, score, reasons.join('; '));
    } else {
      ignoredFiles.push({ path: filePath, reason: '低相关度，未命中弱点/分析关键词' });
    }
  }

  // ============================================
  // Phase 6: Sort and select top files
  // ============================================
  const rankedFiles = Array.from(scoredFiles.entries())
    .map(([filePath, { score, reasons }]) => ({
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      score,
      reasons,
    }))
    .sort((a, b) => b.score - a.score);

  // Only select files with positive quality score — don't pad to targetFileCount
  const targetFileCount = Math.min(Math.max(input.questionCount * 2, 3), MAX_SELECTED_FILES);
  const selectedFiles = rankedFiles.slice(0, targetFileCount);

  // Any ranked files beyond targetFileCount go to ignored
  for (const file of rankedFiles.slice(targetFileCount)) {
    ignoredFiles.push({
      path: file.path,
      reason: `得分${file.score}，未进入前${targetFileCount}名（共${rankedFiles.length}个高质量文件）`,
    });
  }

  // ============================================
  // Phase 7: Build focusTopics and weaknessSummary
  // ============================================
  const focusTopics: string[] = [];
  // Prioritize: wrong answer categories (sorted by count), then interview topics, then weakness tags
  const sortedCategories = Array.from(wrongAnswerCategories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
  focusTopics.push(...sortedCategories);
  for (const t of interviewTopics) {
    if (!focusTopics.includes(t)) focusTopics.push(t);
  }
  for (const t of allWeaknessTags) {
    if (!focusTopics.includes(t)) focusTopics.push(t);
  }
  // Limit
  const topFocusTopics = focusTopics.slice(0, 10);

  // Build weakness summary
  let weaknessSummary = '';
  const parts: string[] = [];
  if (wrongAnswers.length > 0) {
    const unresolved = wrongAnswers.filter((w: any) => w.status === 'unresolved').length;
    parts.push(`未解决错题${unresolved}道，涉及${wrongAnswerTopics.size}个知识领域`);
  }
  if (weakQuestions.length > 0) {
    parts.push(`面试弱项问题${weakQuestions.length}个`);
  }
  if (allWeaknessTags.size > 0) {
    const topTags = Array.from(allWeaknessTags).slice(0, 8);
    parts.push(`主要弱点: ${topTags.join('、')}`);
  }
  if (failedInterviews.length > 0) {
    parts.push(`失败面试${failedInterviews.length}场`);
  }

  weaknessSummary = parts.length > 0
    ? parts.join('；') + '。'
    : '暂无历史弱点数据，建议先完成测验或导入面试记录。';

  return {
    selectedFiles,
    focusTopics: topFocusTopics,
    weaknessSummary,
    ignoredFiles,
  };
}
