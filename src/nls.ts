import * as vscode from 'vscode';
import { frMessages } from './l10n/fr';

/**
 * Localized string. **English is always the default** (the `message` argument in source).
 * French is applied when `vscode.env.language` starts with `fr` (e.g. `fr`, `fr-CA`).
 */
export function t(message: string, ...args: (string | number | boolean)[]): string {
  const useFr = isFrenchUi();
  let s = useFr ? (frMessages[message] ?? message) : message;
  args.forEach((a, i) => {
    s = s.split(`{${i}}`).join(String(a));
  });
  return s;
}

function isFrenchUi(): boolean {
  const raw = vscode.env.language;
  if (!raw || typeof raw !== 'string') {
    return false;
  }
  return raw.toLowerCase().startsWith('fr');
}

/** BCP 47 primary subtag for `<html lang="…">` (not limited to fr/en). */
export function uiLanguageTag(): string {
  const raw = vscode.env.language;
  if (!raw || typeof raw !== 'string') {
    return 'en';
  }
  const base = raw.split(/[-_]/)[0];
  return base || 'en';
}
