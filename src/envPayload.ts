import * as path from 'path';
import * as vscode from 'vscode';

export function labelForUri(uri: vscode.Uri): string {
  return path.basename(uri.fsPath);
}

export function getPreferredNames(): string[] {
  const cfg = vscode.workspace.getConfiguration('envChecker');
  const names = cfg.get<string[]>('relatedFileNames');
  return Array.isArray(names) && names.length > 0 ? names : [];
}
