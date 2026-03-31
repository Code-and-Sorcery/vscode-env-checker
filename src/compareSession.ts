import * as vscode from 'vscode';
import {
  buildComparePayload,
  defaultBaseAndCompare,
  loadEnvFileOptions,
  type CompareViewPayload,
} from './compareModel';
import { addKeyFromCompareToBase, deleteKeyFromEnvFile } from './envFileEdit';
import { getEnvCheckerWebviewHtml, postComparePayloadToWebview } from './webview';

export interface CompareSessionOptions {
  dirUri: vscode.Uri;
  webview: vscode.Webview;
  nonce: string;
}

/**
 * Gère la sélection base / comparaison, le rafraîchissement et les actions sur les fichiers.
 */
export class CompareSession {
  private readonly dirUri: vscode.Uri;
  private readonly webview: vscode.Webview;
  private basePath: string | null = null;
  private comparePath: string | null = null;
  /** Si true, l’utilisateur a choisi explicitement « aucune comparaison » — on ne réapplique pas le défaut .env.example. */
  private compareClearedByUser = false;
  private seeded = false;

  constructor(options: CompareSessionOptions) {
    this.dirUri = options.dirUri;
    this.webview = options.webview;
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
      this.basePath = d.basePath;
      this.comparePath = d.comparePath;
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
    }
  }

  public async refresh(): Promise<void> {
    await this.push();
  }
}
