import * as path from 'path';
import * as vscode from 'vscode';
import { CompareSession } from './compareSession';
import { t } from './nls';
import { ENV_CUSTOM_EDITOR_VIEW_TYPE, registerEnvCustomEditor } from './envCustomEditor';
import { labelForUri } from './envPayload';

async function openPanel(_context: vscode.ExtensionContext, primaryUri: vscode.Uri): Promise<void> {
  const dirUri = vscode.Uri.file(path.dirname(primaryUri.fsPath));
  const panel = vscode.window.createWebviewPanel(
    'envChecker',
    t('Env Checker — {0}', labelForUri(primaryUri)),
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const nonce = String(Date.now());
  const subs: vscode.Disposable[] = [];
  const session = new CompareSession({
    dirUri,
    webview: panel.webview,
    nonce,
    panelEnvFsPath: primaryUri.fsPath,
  });
  session.attach(subs);

  const refresh = (): void => {
    void session.refresh();
  };

  subs.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.scheme !== 'file' || path.dirname(e.document.uri.fsPath) !== dirUri.fsPath) {
        return;
      }
      const bn = path.basename(e.document.uri.fsPath);
      if (bn !== '.env' && !bn.startsWith('.env.')) {
        return;
      }
      if (bn.toLowerCase() === '.envrc') {
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

  panel.onDidDispose(() => {
    for (const s of subs) {
      s.dispose();
    }
  });
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(registerEnvCustomEditor(context));

  context.subscriptions.push(
    vscode.commands.registerCommand('envChecker.openFormattedView', async () => {
      const uri = await resolveEnvFileUriForCommands();
      if (!uri || uri.scheme !== 'file') {
        vscode.window.showWarningMessage(t('Open a .env file (on disk) to use Env Checker.'));
        return;
      }
      if (!isLikelyEnvPath(uri.fsPath)) {
        const yes = t('Yes');
        const no = t('No');
        const go = await vscode.window.showWarningMessage(
          t('This file does not look like a .env. Continue anyway?'),
          yes,
          no,
        );
        if (go !== yes) {
          return;
        }
      }
      await openPanel(context, uri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('envChecker.compareWithExample', async () => {
      const uri = await resolveEnvFileUriForCommands();
      if (!uri) {
        vscode.window.showWarningMessage(t('Open a .env file to compare.'));
        return;
      }
      await openPanel(context, uri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('envChecker.compareEnvFiles', async () => {
      const picks = await vscode.window.showOpenDialog({
        canSelectMany: true,
        openLabel: t('Compare'),
        filters: { [t('All Files')]: ['*'] },
      });
      if (!picks?.length) {
        return;
      }
      await openPanel(context, picks[0]);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('envChecker.reopenAsTextEditor', async () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const input = tab?.input;
      if (!input || !(input instanceof vscode.TabInputCustom) || input.viewType !== ENV_CUSTOM_EDITOR_VIEW_TYPE) {
        vscode.window.showInformationMessage(
          t('Activate an .env tab opened with Env Checker (custom editor) first.'),
        );
        return;
      }
      await vscode.commands.executeCommand('vscode.openWith', input.uri, 'default', vscode.ViewColumn.Active);
    }),
  );
}

async function resolveEnvFileUriForCommands(): Promise<vscode.Uri | undefined> {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const input = tab?.input;
  if (input instanceof vscode.TabInputCustom && input.viewType === ENV_CUSTOM_EDITOR_VIEW_TYPE) {
    return input.uri;
  }
  const te = vscode.window.activeTextEditor?.document.uri;
  if (te && te.scheme === 'file' && isLikelyEnvPath(te.fsPath)) {
    return te;
  }
  return undefined;
}

function isLikelyEnvPath(fsPath: string): boolean {
  const base = path.basename(fsPath);
  return base === '.env' || base.startsWith('.env.');
}

export function deactivate(): void {}
