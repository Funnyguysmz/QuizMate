import fs from 'fs';
import path from 'path';
import type { FileNode, SearchResult } from '../../shared/types';

const SUPPORTED_EXTENSIONS = ['.md', '.txt'];
const IGNORE_PATTERNS = ['.DS_Store', '.claude', 'node_modules', '.git'];

export function scanDirectory(dirPath: string): FileNode[] {
  const nodes: FileNode[] = [];

  if (!fs.existsSync(dirPath)) {
    return nodes;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_PATTERNS.includes(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const children = scanDirectory(fullPath);
      if (children.length > 0 || entry.name !== '面试录音') {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children,
        });
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
        extension: ext || undefined,
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh');
  });

  return nodes;
}

export function readMarkdownContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content;
}

export function searchInFiles(dirPath: string, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  if (!fs.existsSync(dirPath)) return results;

  function searchDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_PATTERNS.includes(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        searchDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.md' || ext === '.txt') {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(lowerQuery)) {
              results.push({
                filePath: fullPath,
                fileName: entry.name,
                lineNumber: i + 1,
                excerpt: lines[i].trim().substring(0, 200),
              });
            }
          }
        }
      }
    }
  }

  searchDir(dirPath);
  return results;
}

export function collectMarkdownFiles(dirPath: string, limit = 24): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) return files;

  function walk(currentPath: string) {
    if (files.length >= limit) return;

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= limit) return;
      if (IGNORE_PATTERNS.includes(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return files;
}

export function collectAllMarkdownFiles(dirPath: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) return files;

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_PATTERNS.includes(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return files;
}
