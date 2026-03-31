import * as vscode from 'vscode';
import {
  buildComparePayload,
  defaultBaseAndCompare,
  loadEnvFileOptions,
  readEnvContent,
} from './compareModel';
import { parseEnvFile, keysSet } from './parser';
import {
  addKeyFromCompareToBase,
  appendManualEntryToBase,
  deleteKeyFromEnvFile,
  isValidEnvKey,
  reorderEnvKeysInBase,
  saveEnvRowEdit,
} from './envFileEdit';
import { getEnvCheckerWebviewHtml, postComparePayloadToWebview } from './webview';

export interface CompareSessionOptions {
  dirUri: vscode.Uri;
  webview: vscode.Webview;
  nonce: string;
  /** Fichier .env ouvert dans ce panneau : premier sélecteur (base) l’utilise par défaut s’il est dans la liste. */
  panelEnvFsPath?: string;
}

/**
 * Gère la sélection base / comparaison, le rafraîchissement et les actions sur les fichiers.
 */
export class CompareSession {
  private readonly dirUri: vscode.Uri;
  private readonly webview: vscode.Webview;
  private readonly panelEnvFsPath: string | undefined;
  private basePath: string | null = null;
  private comparePath: string | null = null;
  /** Si true, l’utilisateur a choisi explicitement « aucune comparaison » — on ne réapplique pas le défaut .env.example. */
  private compareClearedByUser = false;
  private seeded = false;

  constructor(options: CompareSessionOptions) {
    this.dirUri = options.dirUri;
    this.webview = options.webview;
    this.panelEnvFsPath = options.panelEnvFsPath;
    this.webview.html = getEnvCheckerWebviewHtml(this.webview, options.nonce);
  }

  public attach(disposables: vscode.Disposable[]): void {
    disposables.push(
      this.webview.onDidReceiveMessage((msg: Record<string, unknown>) => {
        void this.onMessage(msg);
      }),
    );
  }

  private async resolveSelection(envFiles: Awaited<ReturnType<typeof loadEnvFileOptions>>): Promise<{
    base: string | null;
    compare: string | null;
  }> {
    if (envFiles.length === 0) {
      return { base: null, compare: null };
    }

    if (!this.seeded) {
      const d = defaultBaseAndCompare(envFiles);
      const panelOk =
        this.panelEnvFsPath !== undefined &&
        envFiles.some((f) => f.path === this.panelEnvFsPath);
      this.basePath = panelOk ? this.panelEnvFsPath! : d.basePath;
      let compare = d.comparePath;
      if (!compare || compare === this.basePath) {
        compare = envFiles.find((f) => f.path !== this.basePath)?.path ?? null;
      }
      this.comparePath = compare;
      this.seeded = true;
    }

    let base = this.basePath && envFiles.some((f) => f.path === this.basePath) ? this.basePath : null;
    if (!base) {
      const d = defaultBaseAndCompare(envFiles);
      base = d.basePath;
      this.basePath = base;
    }

    let compare: string | null = null;
    if (this.compareClearedByUser) {
      compare = null;
    } else if (
      this.comparePath &&
      envFiles.some((f) => f.path === this.comparePath) &&
      this.comparePath !== base
    ) {
      compare = this.comparePath;
    } else {
      const d = defaultBaseAndCompare(envFiles);
      compare = d.comparePath;
      if (compare === base) {
        compare = envFiles.find((f) => f.path !== base)?.path ?? null;
      }
      this.comparePath = compare;
    }

    return { base, compare };
  }

  private async push(): Promise<void> {
    const envFiles = await loadEnvFileOptions(this.dirUri);
    const { base, compare } = await this.resolveSelection(envFiles);
    const payload = await buildComparePayload(envFiles, base, compare);
    this.basePath = payload.basePath;
    this.comparePath = payload.comparePath;
    postComparePayloadToWebview(this.webview, payload);
  }

  private async onMessage(msg: Record<string, unknown>): Promise<void> {
    const type = msg.type as string;
    if (type === 'ready') {
      await this.push();
      return;
    }
    if (type === 'select') {
      if (typeof msg.basePath === 'string' && msg.basePath.length > 0) {
        this.basePath = msg.basePath;
        if (this.basePath === this.comparePath) {
          this.comparePath = null;
          this.compareClearedByUser = true;
        }
      }
      if ('comparePath' in msg) {
        if (msg.comparePath === '' || msg.comparePath === null) {
          this.comparePath = null;
          this.compareClearedByUser = true;
        } else if (typeof msg.comparePath === 'string' && msg.comparePath.length > 0) {
          this.comparePath = msg.comparePath;
          this.compareClearedByUser = false;
        }
      }
      await this.push();
      return;
    }
    if (type === 'deleteKey') {
      const baseFs = msg.basePath as string;
      const key = msg.key as string;
      if (baseFs && key) {
        await deleteKeyFromEnvFile(baseFs, key);
        await this.push();
      }
      return;
    }
    if (type === 'addKey') {
      const baseFs = msg.basePath as string;
      const compareFs = msg.comparePath as string;
      const key = msg.key as string;
      if (baseFs && compareFs && key) {
        await addKeyFromCompareToBase(baseFs, compareFs, key);
        await this.push();
      }
      return;
    }
    if (type === 'addManualEntry') {
      const baseFs = msg.basePath as string;
      const key = typeof msg.key === 'string' ? msg.key : '';
      const value = typeof msg.value === 'string' ? msg.value : '';
      if (!baseFs) {
        return;
      }
      if (!key.trim()) {
        vscode.window.showWarningMessage('Saisissez une clé pour ajouter une variable.');
        return;
      }
      if (!isValidEnvKey(key)) {
        vscode.window.showWarningMessage(
          'Clé invalide : utilisez des lettres, des chiffres et des underscores (ne commence pas par un chiffre).',
        );
        return;
      }
      const existing = keysSet(parseEnvFile(await readEnvContent(baseFs)));
      if (existing.has(key.trim())) {
        vscode.window.showWarningMessage(`La clé « ${key.trim()} » existe déjà dans le fichier de base.`);
        return;
      }
      try {
        await appendManualEntryToBase(baseFs, key, value);
        await this.push();
      } catch (e) {
        if (e instanceof Error && e.message === 'INVALID_KEY') {
          vscode.window.showWarningMessage('Clé invalide.');
        }
      }
      return;
    }
    if (type === 'reorderKeys') {
      const baseFs = msg.basePath as string;
      const orderedKeys = msg.orderedKeys;
      if (!baseFs || !Array.isArray(orderedKeys)) {
        return;
      }
      const keys = orderedKeys.filter((k): k is string => typeof k === 'string');
      if (keys.length !== orderedKeys.length) {
        return;
      }
      try {
        await reorderEnvKeysInBase(baseFs, keys);
        await this.push();
      } catch (e) {
        const code = e instanceof Error ? e.message : '';
        if (code === 'DUPLICATE_KEYS_IN_FILE') {
          vscode.window.showWarningMessage(
            'Réordonnancement impossible : le fichier contient des clés en double.',
          );
        } else {
          vscode.window.showWarningMessage('Impossible de réordonner les variables dans le fichier .env.');
        }
      }
      return;
    }
    if (type === 'saveRow') {
      const baseFs = msg.basePath as string;
      const originalKey = typeof msg.originalKey === 'string' ? msg.originalKey : '';
      const key = typeof msg.key === 'string' ? msg.key : '';
      const value = typeof msg.value === 'string' ? msg.value : '';
      const comment = typeof msg.comment === 'string' ? msg.comment : '';
      if (!baseFs || !originalKey) {
        return;
      }
      try {
        await saveEnvRowEdit(baseFs, originalKey, key, value, comment);
        await this.push();
      } catch (e) {
        const err = e instanceof Error ? e.message : '';
        if (err === 'INVALID_KEY') {
          vscode.window.showWarningMessage(
            'Clé invalide : utilisez des lettres, des chiffres et des underscores (ne commence pas par un chiffre).',
          );
        } else if (err === 'DUPLICATE_KEY') {
          vscode.window.showWarningMessage(`La clé « ${key.trim()} » existe déjà dans le fichier de base.`);
        } else if (err === 'KEY_NOT_FOUND') {
          vscode.window.showWarningMessage('Variable introuvable dans le fichier de base.');
        }
      }
    }
  }

  public async refresh(): Promise<void> {
    await this.push();
  }
}
