import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import type { AppSettings, CandidateProfile } from '../../shared/types';

const defaultSettings: AppSettings = {
  study_materials_path: getDefaultStudyMaterialsPath(),
  quiz_default_count: 5,
  quiz_model: 'deepseek-v4-flash',
  dark_mode: false,
};

interface SettingsData {
  settings: AppSettings;
  apiKey?: string;
  candidateProfile?: CandidateProfile;
  windowBounds?: { x?: number; y?: number; width: number; height: number };
}

let settingsPath: string;
let cache: SettingsData | null = null;

function getDefaultStudyMaterialsPath(): string {
  const home = app.getPath('home');

  // Priority 1: iCloud Documents folder
  const iCloudDocs = path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs/Documents');
  if (fs.existsSync(iCloudDocs)) {
    return iCloudDocs;
  }

  // Priority 2: iCloud root folder
  const iCloudRoot = path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs');
  if (fs.existsSync(iCloudRoot)) {
    return iCloudRoot;
  }

  // Priority 3: system Documents folder
  return app.getPath('documents');
}

function getSettingsPath(): string {
  if (!settingsPath) {
    settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  }
  return settingsPath;
}

function readSettingsFile(): SettingsData {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { settings: { ...defaultSettings } };
  }
}

function writeSettingsFile(data: SettingsData): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), 'utf-8');
}

export function loadSettings(): SettingsData {
  if (!cache) {
    cache = readSettingsFile();
    cache.settings = { ...defaultSettings, ...cache.settings };
  }
  return cache;
}

export function saveSettings(settings: AppSettings): void {
  const data = loadSettings();
  data.settings = { ...data.settings, ...settings };
  cache = data;
  writeSettingsFile(data);
}

export function saveApiKey(key: string): void {
  const data = loadSettings();
  if (key) {
    data.apiKey = key;
  } else {
    delete data.apiKey;
  }
  cache = data;
  writeSettingsFile(data);
}

export function saveWindowBounds(bounds: { x?: number; y?: number; width: number; height: number }): void {
  const data = loadSettings();
  data.windowBounds = bounds;
  cache = data;
  try {
    writeSettingsFile(data);
  } catch {
    // Ignore write errors on quit
  }
}

export function loadCandidateProfile(): CandidateProfile {
  const data = loadSettings();
  return data.candidateProfile || {
    resume_file_path: null,
    resume_text: null,
    job_context: '',
    updated_at: null,
  };
}

export function saveCandidateProfile(profile: Partial<CandidateProfile>): CandidateProfile {
  const data = loadSettings();
  const current = data.candidateProfile || {
    resume_file_path: null,
    resume_text: null,
    job_context: '',
    updated_at: null,
  };
  const merged: CandidateProfile = {
    ...current,
    ...profile,
    updated_at: new Date().toISOString(),
  };
  data.candidateProfile = merged;
  cache = data;
  writeSettingsFile(data);
  return merged;
}

export function clearCandidateProfile(): void {
  const data = loadSettings();
  delete data.candidateProfile;
  cache = data;
  writeSettingsFile(data);
}
