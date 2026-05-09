import React from 'react';
import { FileTreeNode } from './FileTreeNode';
import type { FileNode } from '../../../shared/types';

interface FileTreeProps {
  nodes: FileNode[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onOpenExternal: (path: string) => void;
  selectableFiles?: string[];
  selectedFiles?: string[];
  onToggleSelect?: (path: string) => void;
  multiSelect?: boolean;
}

export function FileTree({
  nodes,
  selectedFile,
  onSelectFile,
  onOpenExternal,
  selectableFiles,
  selectedFiles,
  onToggleSelect,
  multiSelect,
}: FileTreeProps) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onOpenExternal={onOpenExternal}
          selectableFiles={selectableFiles}
          selectedFiles={selectedFiles}
          onToggleSelect={onToggleSelect}
          multiSelect={multiSelect}
        />
      ))}
    </div>
  );
}
