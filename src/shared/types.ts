// Shared types between main and renderer processes

// ---- IPC Channel Names ----
export const IPC_CHANNELS = {
  // Document
  DOCUMENTS_GET_TREE: 'documents:get-tree',
  DOCUMENTS_READ_FILE: 'documents:read-file',
  DOCUMENTS_SEARCH: 'documents:search',
  DOCUMENTS_OPEN_EXTERNAL: 'documents:open-external',

  // Study Plans
  PLANS_CREATE: 'plans:create',
  PLANS_UPDATE: 'plans:update',
  PLANS_DELETE: 'plans:delete',
  PLANS_LIST: 'plans:list',
  PLANS_GET: 'plans:get',
  PLANS_GENERATE_TODOS: 'plans:generate-todos',
  PLANS_GENERATE_MATERIALS: 'plans:generate-materials',

  // Quiz
  QUIZ_GENERATE: 'quiz:generate',
  QUIZ_GET_SESSION: 'quiz:get-session',
  QUIZ_SUBMIT_ANSWER: 'quiz:submit-answer',
  QUIZ_COMPLETE: 'quiz:complete',
  QUIZ_LIST_SESSIONS: 'quiz:list-sessions',

  // Wrong Answers
  WRONG_ANSWERS_LIST: 'wrong-answers:list',
  WRONG_ANSWERS_REANSWER: 'wrong-answers:reanswer',
  WRONG_ANSWERS_RESOLVE: 'wrong-answers:resolve',
  WRONG_ANSWERS_STATS: 'wrong-answers:stats',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // API Key
  API_KEY_GET: 'api-key:get',
  API_KEY_SET: 'api-key:set',
  API_KEY_DELETE: 'api-key:delete',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',
} as const;

// ---- Data Types ----

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  children?: FileNode[];
}

export interface SearchResult {
  filePath: string;
  fileName: string;
  lineNumber: number;
  excerpt: string;
}

export interface StudyPlan {
  id: number;
  title: string;
  category: string | null;
  tags: string[];
  status: 'pending' | 'in_progress' | 'done';
  priority: number;
  notes: string | null;
  source_file: string | null;
  source_files: string[];
  generated_material: string | null;
  material_file: string | null;
  ai_generated: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  title: string;
  category?: string;
  tags?: string[];
  status?: 'pending' | 'in_progress' | 'done';
  priority?: number;
  notes?: string;
  source_file?: string;
  source_files?: string[];
  generated_material?: string;
  material_file?: string;
  ai_generated?: number;
}

export interface UpdatePlanInput {
  title?: string;
  category?: string;
  tags?: string[];
  status?: 'pending' | 'in_progress' | 'done';
  priority?: number;
  notes?: string;
  source_file?: string;
  source_files?: string[];
  generated_material?: string;
  material_file?: string;
  ai_generated?: number;
}

export interface PlanFilters {
  status?: string;
  category?: string;
  search?: string;
}

export interface QuizSession {
  id: number;
  title: string;
  source_files: string[];
  total_questions: number;
  correct_count: number;
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed';
  created_at: string;
  completed_at: string | null;
}

export interface QuizQuestion {
  id: number;
  session_id: number;
  question_number: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  source_file: string | null;
  user_answer: string | null;
  is_correct: number | null;
  answered_at: string | null;
}

export interface QuizSessionWithQuestions extends QuizSession {
  questions: QuizQuestion[];
}

export interface QuizGenerateInput {
  files: string[];
  questionCount: number;
  topic?: string;
}

export interface GenerateStudyTodosInput {
  goal: string;
  focus?: string;
  files?: string[];
  count?: number;
}

export interface GenerateStudyMaterialsInput {
  planIds: number[];
  audience?: string;
}

export interface GeneratedStudyMaterialsResult {
  plans: StudyPlan[];
  outputDirectory: string;
}

export interface WrongAnswer {
  id: number;
  question_id: number | null;
  session_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  user_answer: string;
  source_file: string | null;
  category: string | null;
  review_count: number;
  last_correct: number | null;
  status: 'unresolved' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface WrongAnswerFilters {
  status?: string;
  category?: string;
}

export interface WrongAnswerStats {
  total: number;
  unresolved: number;
  resolved: number;
  byCategory: { category: string; count: number }[];
}

export interface AppSettings {
  study_materials_path: string;
  quiz_default_count: number;
  quiz_model: string;
  dark_mode: boolean;
}
