import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { loadSettings, saveSettings, saveApiKey } from '../services/settings-store';
import type { AppSettings } from '../../shared/types';

export function registerSettingsHandlers() {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return loadSettings().settings;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_event, updates: Partial<AppSettings>) => {
    const current = loadSettings();
    const merged: AppSettings = { ...current.settings, ...updates };
    saveSettings(merged);
    return merged;
  });

  ipcMain.handle(IPC_CHANNELS.API_KEY_GET, () => {
    const { apiKey } = loadSettings();
    return apiKey || null;
  });

  ipcMain.handle(IPC_CHANNELS.API_KEY_SET, (_event, key: string) => {
    saveApiKey(key);
  });

  ipcMain.handle(IPC_CHANNELS.API_KEY_DELETE, () => {
    saveApiKey('');
  });
}
