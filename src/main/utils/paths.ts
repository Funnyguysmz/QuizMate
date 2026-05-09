import path from 'path';
import { app } from 'electron';

export function getUserDataPath(...segments: string[]): string {
  return path.join(app.getPath('userData'), ...segments);
}

export function getDbPath(): string {
  return getUserDataPath('study-app.db');
}
