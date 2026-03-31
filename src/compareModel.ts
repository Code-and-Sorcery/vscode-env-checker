import * as vscode from 'vscode';
import { t } from './nls';
import { parseEnvFile } from './parser';
import { labelForUri } from './envPayload';
import { listEnvFilesInDirectory } from './relatedFiles';

export type RowStatus = 'both' | 'baseOnly' | 'compareOnly' | 'neutral';

export interface CompareRow {
  key: string;
  value: string;
  documentation: string;
  status: RowStatus;
}

export interface EnvFileOption {
  path: string;
  label: string;
}

export interface CompareViewPayload {
  envFiles: EnvFileOption[];
  basePath: string | null;
  comparePath: string | null;
  rows: CompareRow[];
  noEnvFiles: boolean;
  /** Localized line under the file selectors. */
  hintText: string;
  /** Shown in the table area when there is no base file selected. */
  emptyStateText?: string;
}

function pathByBasename(uris: vscode.Uri[], baseName: string): string | undefined {
  const lower = baseName.toLowerCase();
  const u = uris.find((x) => x.fsPath.split(/[/\\]/).pop()?.toLowerCase() === lower);
  return u?.fsPath;
}

export function getLiveText(fsPath: string): string | undefined {
  const uri = vscode.Uri.file(fsPath);
  const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
  return doc?.getText();
}

export async function readEnvContent(fsPath: string): Promise<string> {
  const live = getLiveText(fsPath);
  if (live !== undefined) {
    return live;
  }
  const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
  return new TextDecoder('utf-8').decode(data);
}

/**
 * Défauts : `.env` pour la base, `.env.example` pour la comparaison (si présents et distincts).
 */
export function defaultBaseAndCompare(envFiles: EnvFileOption[]): {
  basePath: string | null;
  comparePath: string | null;
} {
  if (envFiles.length === 0) {
    return { basePath: null, comparePath: null };
  }
  const uris = envFiles.map((f) => vscode.Uri.file(f.path));

  const basePath = pathByBasename(uris, '.env') ?? envFiles[0].path;
  let comparePath = pathByBasename(uris, '.env.example') ?? null;

  if (comparePath === basePath) {
    comparePath = null;
  }
  if (!comparePath && envFiles.length > 1) {
    comparePath = envFiles.find((f) => f.path !== basePath)?.path ?? null;
  }
  return { basePath, comparePath };
}

export function buildRows(baseText: string, compareText: string | null): CompareRow[] {
  const baseEntries = parseEnvFile(baseText);
  const compareEntries = compareText !== null ? parseEnvFile(compareText) : [];
  const baseKeySet = new Set(baseEntries.map((e) => e.key));
  const compareKeySet = new Set(compareEntries.map((e) => e.key));

  const hasCompare = compareText !== null;
  const rows: CompareRow[] = [];

  for (const e of baseEntries) {
    const inCompare = hasCompare && compareKeySet.has(e.key);
    const status: RowStatus = !hasCompare ? 'neutral' : inCompare ? 'both' : 'baseOnly';
    rows.push({
      key: e.key,
      value: e.value,
      documentation: e.documentation,
      status,
    });
  }

  if (hasCompare) {
    const onlyCompare = compareEntries
      .filter((e) => !baseKeySet.has(e.key))
      .sort((a, b) => a.key.localeCompare(b.key));
    for (const e of onlyCompare) {
      rows.push({
        key: e.key,
        value: e.value,
        documentation: e.documentation,
        status: 'compareOnly',
      });
    }
  }

  return rows;
}

export async function loadEnvFileOptions(dirUri: vscode.Uri): Promise<EnvFileOption[]> {
  const listed = await listEnvFilesInDirectory(dirUri);
  return listed.map((u) => ({
    path: u.fsPath,
    label: labelForUri(u),
  }));
}

export async function buildComparePayload(
  envFiles: EnvFileOption[],
  basePath: string | null,
  comparePath: string | null,
): Promise<CompareViewPayload> {
  if (envFiles.length === 0) {
    return {
      envFiles,
      basePath: null,
      comparePath: null,
      rows: [],
      noEnvFiles: true,
      hintText: t('No .env files in this folder.'),
    };
  }

  const baseOk = basePath && envFiles.some((f) => f.path === basePath);
  if (!baseOk) {
    return {
      envFiles,
      basePath: null,
      comparePath: null,
      rows: [],
      noEnvFiles: false,
      hintText: t('Choose a base file to show the table.'),
      emptyStateText: t('No table: no base file selected.'),
    };
  }

  const compareOk =
    comparePath && envFiles.some((f) => f.path === comparePath) && comparePath !== basePath ? comparePath : null;

  const baseText = await readEnvContent(basePath!);
  const compareText = compareOk ? await readEnvContent(compareOk) : null;
  const rows = buildRows(baseText, compareText);

  const compareLabel = compareOk ? envFiles.find((f) => f.path === compareOk)?.label ?? '' : '';
  const hintText = compareOk
    ? t('Comparison by key with "{0}".', compareLabel)
    : t('No comparison file: showing base file keys only.');

  return {
    envFiles,
    basePath,
    comparePath: compareOk,
    rows,
    noEnvFiles: false,
    hintText,
  };
}
