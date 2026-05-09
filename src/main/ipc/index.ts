import { ipcMain } from 'electron';
import { registerFileSystemHandlers } from './file-system';
import { registerDatabaseHandlers } from './database';
import { registerDeepSeekHandlers } from './deepseek';
import { registerSettingsHandlers } from './settings';

export function registerAllIpcHandlers() {
  registerFileSystemHandlers();
  registerDatabaseHandlers();
  registerDeepSeekHandlers();
  registerSettingsHandlers();
}
