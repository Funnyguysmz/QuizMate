import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { loadSettings, saveSettings, saveApiKey, loadCandidateProfile, saveCandidateProfile, clearCandidateProfile } from '../services/settings-store';
import type { AppSettings, CandidateProfile, ImportResumeResult } from '../../shared/types';

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

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, () => {
    return loadCandidateProfile();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, (_event, patch: Partial<CandidateProfile>) => {
    return saveCandidateProfile(patch);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_CLEAR, () => {
    clearCandidateProfile();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT_RESUME, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const { parseResumePdf } = await import('../services/resume-parser');
    const text = await parseResumePdf(filePath);

    return { filePath, text } as ImportResumeResult;
  });
}
