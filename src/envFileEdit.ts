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

const KV_PREFIX = /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=/;

/** Indice 0-based de la première ligne du bloc (# et lignes vides) juste au-dessus de `keyLine`. */
function findDocBlockStart(lines: string[], keyLine: number): number {
  let i = keyLine - 1;
  while (i >= 0) {
    const raw = lines[i];
    const t = raw.trim();
    if (t === '' || t.startsWith('#')) {
      i--;
      continue;
    }
    if (KV_PREFIX.test(raw.trim())) {
      return i + 1;
    }
    return i + 1;
  }
  return 0;
}

function formatCommentLines(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  return text.split('\n').map((line) => {
    const t = line.trimEnd();
    if (t.trim() === '') {
      return '';
    }
    const trimmedStart = t.trimStart();
    if (trimmedStart.startsWith('#')) {
      return t;
    }
    return '# ' + trimmedStart;
  });
}

/**
 * Remplace les lignes de commentaire / vides situées au-dessus de la première occurrence de `key`
 * par le texte donné (une ligne devient une ligne `# …` si besoin).
 */
export function replaceDocumentationAboveKey(content: string, key: string, commentText: string): string {
  const lines = content.split('\n');
  const entry = parseEnvFile(content).find((e) => e.key === key);
  if (!entry) {
    return content;
  }
  const keyLine = entry.line - 1;
  const docStart = findDocBlockStart(lines, keyLine);
  const formatted = formatCommentLines(commentText);
  while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
    formatted.pop();
  }
  const insert = formatted.length > 0 ? [...formatted, ''] : [];
  const before = lines.slice(0, docStart);
  const fromKey = lines.slice(keyLine);
  return [...before, ...insert, ...fromKey].join('\n');
}

export async function setDocumentationForKey(
  baseFsPath: string,
  key: string,
  commentText: string,
): Promise<void> {
  const uri = vscode.Uri.file(baseFsPath);
  const content = await readEnvContent(baseFsPath);
  const next = replaceDocumentationAboveKey(content, key, commentText);
  await writeEnvFileContent(uri, next);
}

function replaceKeyAssignmentLine(content: string, oldKey: string, newKey: string, value: string): string {
  const lines = content.split('\n');
  const entry = parseEnvFile(content).find((e) => e.key === oldKey);
  if (!entry) {
    return content;
  }
  const i = entry.line - 1;
  lines[i] = formatEnvAssignment(newKey, value);
  return lines.join('\n');
}

/** Met à jour doc (lignes # au-dessus), clé et valeur pour la première occurrence de `originalKey`. */
export async function saveEnvRowEdit(
  baseFsPath: string,
  originalKey: string,
  newKey: string,
  newValue: string,
  comment: string,
): Promise<void> {
  const ok = originalKey.trim();
  const nk = newKey.trim();
  if (!isValidEnvKey(nk)) {
    throw new Error('INVALID_KEY');
  }
  let content = await readEnvContent(baseFsPath);
  const entries = parseEnvFile(content);
  if (!entries.some((e) => e.key === ok)) {
    throw new Error('KEY_NOT_FOUND');
  }
  if (nk !== ok && entries.some((e) => e.key === nk)) {
    throw new Error('DUPLICATE_KEY');
  }
  content = replaceDocumentationAboveKey(content, ok, comment);
  content = replaceKeyAssignmentLine(content, ok, nk, newValue);
  await writeEnvFileContent(vscode.Uri.file(baseFsPath), content);
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

export function isValidEnvKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key.trim());
}

/** Ajoute une ligne KEY=value à la fin du fichier de base (fichier ouvert ou disque). */
export async function appendManualEntryToBase(baseFsPath: string, key: string, value: string): Promise<void> {
  const k = key.trim();
  if (!isValidEnvKey(k)) {
    throw new Error('INVALID_KEY');
  }
  const baseUri = vscode.Uri.file(baseFsPath);
  const baseText = await readEnvContent(baseFsPath);
  const line = formatEnvAssignment(k, value);
  const normalized =
    baseText.length === 0 ? `${line}\n` : `${baseText.replace(/\s*$/, '')}\n${line}\n`;
  await writeEnvFileContent(baseUri, normalized);
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
