import { ipcMain, shell, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { scanDirectory, readMarkdownContent, searchInFiles } from '../services/file-scanner';

export function registerFileSystemHandlers() {
  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_GET_TREE, async (_event, rootPath: string) => {
    return scanDirectory(rootPath);
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_READ_FILE, async (_event, filePath: string) => {
    return readMarkdownContent(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_SEARCH, async (_event, query: string) => {
    const settings = await import('../services/settings-store').then(m => m.loadSettings());
    return searchInFiles(settings.settings.study_materials_path, query);
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_OPEN_EXTERNAL, async (_event, filePath: string) => {
    await shell.openPath(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      defaultPath,
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}
