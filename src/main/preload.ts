import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  FileNode,
  SearchResult,
  StudyPlan,
  CreatePlanInput,
  UpdatePlanInput,
  PlanFilters,
  GenerateStudyMaterialsInput,
  GenerateStudyTodosInput,
  GeneratedStudyMaterialsResult,
  QuizSession,
  QuizSessionWithQuestions,
  QuizGenerateInput,
  WrongAnswer,
  WrongAnswerFilters,
  WrongAnswerStats,
  AppSettings,
  CandidateProfile,
  ImportResumeResult,
  AgentRun,
  AgentRunWithSteps,
  AgentStep,
  CreateAgentRunInput,
  UpdateAgentRunInput,
  CreateAgentStepInput,
  UpdateAgentStepInput,
  InterviewRecord,
  InterviewRecordWithQuestions,
  InterviewQuestion,
  CreateInterviewInput,
  UpdateInterviewInput,
  InterviewFilters,
  CreateInterviewQuestionInput,
  UpdateInterviewQuestionInput,
  ImportInterviewInput,
  ImportInterviewResult,
} from '../shared/types';

const electronAPI = {
  // Documents
  getFileTree: (rootPath: string): Promise<FileNode[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_GET_TREE, rootPath),

  readMarkdownFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_READ_FILE, filePath),

  searchDocuments: (query: string): Promise<SearchResult[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_SEARCH, query),

  openExternalFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_OPEN_EXTERNAL, filePath),

  // Study Plans
  createPlan: (input: CreatePlanInput): Promise<StudyPlan> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_CREATE, input),

  updatePlan: (id: number, input: UpdatePlanInput): Promise<StudyPlan> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_UPDATE, id, input),

  deletePlan: (id: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_DELETE, id),

  getPlans: (filters?: PlanFilters): Promise<StudyPlan[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_LIST, filters),

  getPlan: (id: number): Promise<StudyPlan> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_GET, id),

  generateStudyTodos: (input: GenerateStudyTodosInput): Promise<StudyPlan[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_GENERATE_TODOS, input),

  generateStudyMaterials: (input: GenerateStudyMaterialsInput): Promise<GeneratedStudyMaterialsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLANS_GENERATE_MATERIALS, input),

  // Quiz
  generateQuiz: (input: QuizGenerateInput): Promise<QuizSessionWithQuestions> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIZ_GENERATE, input),

  getQuizSession: (id: number): Promise<QuizSessionWithQuestions> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIZ_GET_SESSION, id),

  submitAnswer: (questionId: number, answer: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIZ_SUBMIT_ANSWER, questionId, answer),

  completeQuiz: (sessionId: number): Promise<QuizSession> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIZ_COMPLETE, sessionId),

  getQuizSessions: (): Promise<QuizSession[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIZ_LIST_SESSIONS),

  // Wrong Answers
  getWrongAnswers: (filters?: WrongAnswerFilters): Promise<WrongAnswer[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.WRONG_ANSWERS_LIST, filters),

  reanswerQuestion: (id: number, answer: string): Promise<WrongAnswer> =>
    ipcRenderer.invoke(IPC_CHANNELS.WRONG_ANSWERS_REANSWER, id, answer),

  resolveWrongAnswer: (id: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WRONG_ANSWERS_RESOLVE, id),

  getWrongAnswerStats: (): Promise<WrongAnswerStats> =>
    ipcRenderer.invoke(IPC_CHANNELS.WRONG_ANSWERS_STATS),

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  updateSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // API Key
  getApiKey: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.API_KEY_GET),

  setApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.API_KEY_SET, key),

  deleteApiKey: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.API_KEY_DELETE),

  // Candidate Profile
  getCandidateProfile: (): Promise<CandidateProfile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET),

  updateCandidateProfile: (profile: Partial<CandidateProfile>): Promise<CandidateProfile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, profile),

  clearCandidateProfile: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CLEAR),

  importResumePdf: (): Promise<ImportResumeResult | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT_RESUME),

  // Dialog
  openFolderDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER, defaultPath),

  // Agent Runs
  createAgentRun: (input: CreateAgentRunInput): Promise<AgentRun> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_RUNS_CREATE, input),

  updateAgentRun: (id: number, input: UpdateAgentRunInput): Promise<AgentRun> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_RUNS_UPDATE, id, input),

  getAgentRun: (id: number): Promise<AgentRunWithSteps | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_RUNS_GET, id),

  listAgentRuns: (type?: string): Promise<AgentRun[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_RUNS_LIST, type),

  createAgentStep: (input: CreateAgentStepInput): Promise<AgentStep> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_STEPS_CREATE, input),

  updateAgentStep: (id: number, input: UpdateAgentStepInput): Promise<AgentStep> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_STEPS_UPDATE, id, input),

  // Interview Database
  createInterview: (input: CreateInterviewInput): Promise<InterviewRecord> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_CREATE, input),

  updateInterview: (id: number, input: UpdateInterviewInput): Promise<InterviewRecord> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_UPDATE, id, input),

  getInterview: (id: number): Promise<InterviewRecordWithQuestions | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_GET, id),

  listInterviews: (filters?: InterviewFilters): Promise<InterviewRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_LIST, filters),

  deleteInterview: (id: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_DELETE, id),

  createInterviewQuestion: (input: CreateInterviewQuestionInput): Promise<InterviewQuestion> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEW_QUESTIONS_CREATE, input),

  updateInterviewQuestion: (id: number, input: UpdateInterviewQuestionInput): Promise<InterviewQuestion> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEW_QUESTIONS_UPDATE, id, input),

  deleteInterviewQuestion: (id: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEW_QUESTIONS_DELETE, id),

  importInterviewFromFile: (input: ImportInterviewInput): Promise<ImportInterviewResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.INTERVIEWS_IMPORT_FROM_FILE, input),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
