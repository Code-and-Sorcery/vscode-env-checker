import * as path from 'path';
import * as vscode from 'vscode';
import { getPreferredNames } from './envPayload';

/** True for `.env`, `.env.local`, `.env.example`, etc.; false for `.envrc`. */
export function isEnvDotFileName(fileName: string): boolean {
  if (fileName === '.env') {
    return true;
  }
  if (fileName.toLowerCase() === '.envrc') {
    return false;
  }
  return fileName.startsWith('.env.');
}

export async function listEnvFilesInDirectory(dirUri: vscode.Uri): Promise<vscode.Uri[]> {
  const entries = await vscode.workspace.fs.readDirectory(dirUri);
  const preferred = getPreferredNames();
  const prefIndex = (n: string): number => {
    const i = preferred.findIndex((p) => p.toLowerCase() === n.toLowerCase());
    if (i >= 0) {
      return i;
    }
    if (n === '.env.example' || n === '.env.sample') {
      return 1000;
    }
    if (n === '.env.test' || n === '.env.testing') {
      return 1001;
    }
    if (n === '.env') {
      return 1002;
    }
    return 2000;
  };
  const names = entries
    .filter(([name, type]) => type === vscode.FileType.File && isEnvDotFileName(name))
    .map(([name]) => name)
    .sort((a, b) => {
      const oa = prefIndex(a);
      const ob = prefIndex(b);
      if (oa !== ob) {
        return oa - ob;
      }
      return a.localeCompare(b);
    });
  return names.map((n) => vscode.Uri.joinPath(dirUri, n));
}

export function samePath(a: vscode.Uri, b: vscode.Uri): boolean {
  return a.fsPath === b.fsPath;
}

/**
 * Related env files in the same folder as `current`, excluding `current`.
 * Preference order: configured names that exist, then any other `.env*` files in the folder.
 */
export async function discoverRelatedEnvUris(
  current: vscode.Uri,
  preferredNames: string[],
): Promise<vscode.Uri[]> {
  const dir = vscode.Uri.file(path.dirname(current.fsPath));
  const currentBase = path.basename(current.fsPath);
  const all = await listEnvFilesInDirectory(dir);
  const filtered = all.filter((u) => !samePath(u, current));

  const preferredSet = new Set(preferredNames.map((n) => n.toLowerCase()));
  const preferred: vscode.Uri[] = [];
  const rest: vscode.Uri[] = [];

  for (const u of filtered) {
    const base = path.basename(u.fsPath);
    if (preferredSet.has(base.toLowerCase())) {
      preferred.push(u);
    } else {
      rest.push(u);
    }
  }

  const seen = new Set<string>();
  const out: vscode.Uri[] = [];
  for (const u of [...preferred, ...rest]) {
    const key = u.fsPath;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }

  return out.filter((u) => path.basename(u.fsPath).toLowerCase() !== currentBase.toLowerCase());
}
