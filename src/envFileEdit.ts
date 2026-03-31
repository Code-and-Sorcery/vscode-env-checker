import * as vscode from 'vscode';
import { parseEnvFile } from './parser';
import { readEnvContent } from './compareModel';

function formatEnvAssignment(key: string, value: string): string {
  if (value === '' || /[\s#"']/.test(value)) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `${key}="${escaped}"`;
  }
  return `${key}=${value}`;
}

/** Supprime toutes les lignes de définition de `key` (d’après le parseur). */
export function removeKeyFromContent(content: string, key: string): string {
  const entries = parseEnvFile(content);
  const toRemove = new Set(entries.filter((e) => e.key === key).map((e) => e.line - 1));
  const lines = content.split(/\n/);
  return lines.filter((_, i) => !toRemove.has(i)).join('\n');
}

async function applyFullDocumentReplace(uri: vscode.Uri, newText: string): Promise<void> {
  const doc =
    vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath) ??
    (await vscode.workspace.openTextDocument(uri));
  const ed = new vscode.WorkspaceEdit();
  const end = doc.positionAt(doc.getText().length);
  ed.replace(doc.uri, new vscode.Range(new vscode.Position(0, 0), end), newText);
  await vscode.workspace.applyEdit(ed);
}

export async function writeEnvFileContent(uri: vscode.Uri, newText: string): Promise<void> {
  const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
  if (open) {
    await applyFullDocumentReplace(uri, newText);
    return;
  }
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(newText));
}

export async function deleteKeyFromEnvFile(baseFsPath: string, key: string): Promise<void> {
  const uri = vscode.Uri.file(baseFsPath);
  const content = await readEnvContent(baseFsPath);
  const next = removeKeyFromContent(content, key);
  await writeEnvFileContent(uri, next);
}

export async function addKeyFromCompareToBase(
  baseFsPath: string,
  compareFsPath: string,
  key: string,
): Promise<void> {
  const compareText = await readEnvContent(compareFsPath);
  const entry = parseEnvFile(compareText).find((e) => e.key === key);
  const line = entry ? formatEnvAssignment(key, entry.value) : `${key}=`;

  const baseUri = vscode.Uri.file(baseFsPath);
  const baseText = await readEnvContent(baseFsPath);
  const normalized =
    baseText.length === 0 ? `${line}\n` : `${baseText.replace(/\s*$/, '')}\n${line}\n`;
  await writeEnvFileContent(baseUri, normalized);
}
