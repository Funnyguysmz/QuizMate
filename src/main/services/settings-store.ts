import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import type { AppSettings } from '../../shared/types';

const defaultSettings: AppSettings = {
  study_materials_path: '/Users/mac/Desktop/Halo博客文稿',
  quiz_default_count: 5,
  quiz_model: 'deepseek-v4-flash',
  dark_mode: false,
};

interface SettingsData {
  settings: AppSettings;
  apiKey?: string;
  windowBounds?: { x?: number; y?: number; width: number; height: number };
}

let settingsPath: string;
let cache: SettingsData | null = null;

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
