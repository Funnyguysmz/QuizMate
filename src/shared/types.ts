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

  // Candidate Profile
  PROFILE_GET: 'profile:get',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_CLEAR: 'profile:clear',
  PROFILE_IMPORT_RESUME: 'profile:import-resume',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // API Key
  API_KEY_GET: 'api-key:get',
  API_KEY_SET: 'api-key:set',
  API_KEY_DELETE: 'api-key:delete',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',

  // Agent Runs
  AGENT_RUNS_CREATE: 'agent-runs:create',
  AGENT_RUNS_UPDATE: 'agent-runs:update',
  AGENT_RUNS_GET: 'agent-runs:get',
  AGENT_RUNS_LIST: 'agent-runs:list',
  AGENT_STEPS_CREATE: 'agent-steps:create',
  AGENT_STEPS_UPDATE: 'agent-steps:update',

  // Interview Database
  INTERVIEWS_CREATE: 'interviews:create',
  INTERVIEWS_UPDATE: 'interviews:update',
  INTERVIEWS_GET: 'interviews:get',
  INTERVIEWS_LIST: 'interviews:list',
  INTERVIEWS_DELETE: 'interviews:delete',
  INTERVIEW_QUESTIONS_CREATE: 'interview-questions:create',
  INTERVIEW_QUESTIONS_UPDATE: 'interview-questions:update',
  INTERVIEW_QUESTIONS_DELETE: 'interview-questions:delete',
  INTERVIEWS_IMPORT_FROM_FILE: 'interviews:import-from-file',
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
  agent_run_id: number | null;
  source_summary: string | null;
  quality_summary: string | null;
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
  mode?: 'manual_files' | 'smart_agent';
  focus?: string;
  enableThinking?: boolean;
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

export interface CandidateProfile {
  resume_file_path: string | null;
  resume_text: string | null;
  job_context: string;
  updated_at: string | null;
}

export interface ImportResumeResult {
  filePath: string;
  text: string;
}

export interface AppSettings {
  study_materials_path: string;
  quiz_default_count: number;
  quiz_model: string;
  dark_mode: boolean;
}

export type AgentRunType = 'material_generation' | 'wrong_answer_review' | 'interview_import' | 'quiz_generation' | 'study_planning';
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentRun {
  id: number;
  type: AgentRunType;
  status: AgentRunStatus;
  title: string;
  input_summary: string | null;
  output_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentStep {
  id: number;
  run_id: number;
  name: string;
  status: AgentStepStatus;
  order_index: number;
  input: string | null;
  output: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AgentRunWithSteps extends AgentRun {
  steps: AgentStep[];
}

export interface CreateAgentRunInput {
  type: AgentRunType;
  title: string;
  input_summary?: string;
}

export interface UpdateAgentRunInput {
  status?: AgentRunStatus;
  output_summary?: string;
  title?: string;
}

export interface CreateAgentStepInput {
  run_id: number;
  name: string;
  order_index: number;
  input?: string;
}

export interface UpdateAgentStepInput {
  status?: AgentStepStatus;
  output?: string;
  error?: string;
}

export type InterviewResult = 'unknown' | 'passed' | 'failed' | 'pending';
export type AnswerQuality = 'unknown' | 'good' | 'medium' | 'weak';

export interface InterviewRecord {
  id: number;
  company: string;
  team: string | null;
  round: string | null;
  date: string | null;
  result: InterviewResult;
  source_file: string | null;
  interviewer_focus: string | null;
  observations: string | null;
  raw_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: number;
  interview_id: number;
  question_text: string;
  topic: string | null;
  follow_up_questions: string | null;
  answer_quality: AnswerQuality;
  weakness_tags: string[];
  created_at: string;
}

export interface InterviewRecordWithQuestions extends InterviewRecord {
  questions: InterviewQuestion[];
}

export interface CreateInterviewInput {
  company: string;
  team?: string;
  round?: string;
  date?: string;
  result?: InterviewResult;
  source_file?: string;
  interviewer_focus?: string;
  observations?: string;
  raw_notes?: string;
}

export interface UpdateInterviewInput {
  company?: string;
  team?: string;
  round?: string;
  date?: string;
  result?: InterviewResult;
  source_file?: string;
  interviewer_focus?: string;
  observations?: string;
  raw_notes?: string;
}

export interface InterviewFilters {
  company?: string;
  result?: string;
  search?: string;
}

export interface CreateInterviewQuestionInput {
  interview_id: number;
  question_text: string;
  topic?: string;
  follow_up_questions?: string;
  answer_quality?: AnswerQuality;
  weakness_tags?: string[];
}

export interface UpdateInterviewQuestionInput {
  question_text?: string;
  topic?: string;
  follow_up_questions?: string;
  answer_quality?: AnswerQuality;
  weakness_tags?: string[];
}

export interface ImportInterviewInput {
  filePath: string;
  companyHint?: string;
  roundHint?: string;
  resultHint?: InterviewResult;
}

export interface ImportInterviewResult {
  interview: InterviewRecordWithQuestions;
  agentRunId: number;
}
