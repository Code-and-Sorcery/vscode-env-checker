import * as path from 'path';
import * as vscode from 'vscode';
import { CompareSession } from './compareSession';
import { isEnvDotFileName } from './relatedFiles';

const VIEW_TYPE = 'envChecker.editor';

export function registerEnvCustomEditor(context: vscode.ExtensionContext): vscode.Disposable {
  const provider = new EnvCustomEditorProvider();
  return vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: false,
  });
}

class EnvCustomEditorProvider implements vscode.CustomTextEditorProvider {
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    if (document.uri.scheme !== 'file') {
      return;
    }

    webviewPanel.webview.options = { enableScripts: true };

    const dirUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
    const nonce = String(Date.now());
    const subs: vscode.Disposable[] = [];

    const session = new CompareSession({
      dirUri,
      webview: webviewPanel.webview,
      nonce,
      panelEnvFsPath: document.uri.fsPath,
    });
    session.attach(subs);

    const refresh = (): void => {
      void session.refresh();
    };

    subs.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.scheme !== 'file') {
          return;
        }
        if (path.dirname(e.document.uri.fsPath) !== dirUri.fsPath) {
          return;
        }
        if (!isEnvDotFileName(path.basename(e.document.uri.fsPath))) {
          return;
        }
        refresh();
      }),
    );

    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(dirUri, '.env*'));
    watcher.onDidChange(refresh);
    watcher.onDidCreate(refresh);
    watcher.onDidDelete(refresh);
    subs.push(watcher);

    webviewPanel.onDidDispose(() => {
      for (const s of subs) {
        s.dispose();
      }
    });
  }
}

export const ENV_CUSTOM_EDITOR_VIEW_TYPE = VIEW_TYPE;
