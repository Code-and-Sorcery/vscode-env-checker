export interface EnvEntry {
  key: string;
  value: string;
  documentation: string;
  /** Ligne 1-based de la clé (`KEY=value`). */
  line: number;
  /**
   * Première ligne 1-based du bloc de doc au-dessus (lignes `# …` rattachées à cette clé).
   * Égal à `line` si la doc ne vient que du commentaire inline sur la ligne d’assignation.
   */
  docStartLine: number;
}

function stripQuotes(raw: string): string {
  const t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    return t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  return t;
}

/** Parse # comment body (strip leading # and one optional space). */
function commentBody(line: string): string {
  const m = line.match(/^#\s?(.*)$/);
  return m ? m[1] : line;
}

function isEnvAssignmentLine(trimmed: string): boolean {
  return /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed);
}

/**
 * Parse dotenv-style content: KEY=value, optional export.
 * Doc au-dessus : lignes `# …` jusqu’à la clé ; **une** ligne vide entre le bloc `#` et la clé ne casse
 * pas le rattachement (format souvent écrit par l’extension). **Deux** lignes vides ou plus séparent.
 * Sinon une ligne vide sans assignation juste en dessous vide le pending.
 * Dernière ligne de doc : `# …` inline sur la même ligne que KEY=value (hors chaînes quotées).
 */
export function parseEnvFile(content: string): EnvEntry[] {
  const lines = content.split(/\n/);
  const entries: EnvEntry[] = [];
  const pending: string[] = [];
  let pendingStartLine: number | null = null;

  const clearPending = (): void => {
    pending.length = 0;
    pendingStartLine = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      const next = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const skipBlankBeforeKey = next !== '' && isEnvAssignmentLine(next);
      if (!skipBlankBeforeKey) {
        clearPending();
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      if (pending.length === 0) {
        pendingStartLine = i + 1;
      }
      pending.push(commentBody(trimmed));
      continue;
    }

    const kv = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!kv) {
      clearPending();
      continue;
    }

    let valuePart = kv[2];
    let inlineDoc = '';

    const dq = valuePart.match(/^("(?:\\.|[^"])*")\s*(?:#\s*(.*))?$/);
    const sq = valuePart.match(/^('(?:\\.|[^'])*')\s*(?:#\s*(.*))?$/);
    if (dq) {
      valuePart = dq[1];
      inlineDoc = dq[2] ?? '';
    } else if (sq) {
      valuePart = sq[1];
      inlineDoc = sq[2] ?? '';
    } else {
      const unquoted = valuePart.split(/\s+#/);
      valuePart = unquoted[0]?.trim() ?? '';
      if (unquoted.length > 1) {
        inlineDoc = unquoted.slice(1).join(' #').trim();
      }
    }

    const documentation = [...pending, ...(inlineDoc ? [inlineDoc] : [])].filter(Boolean).join('\n');
    const docStartLine = pending.length > 0 && pendingStartLine !== null ? pendingStartLine : i + 1;
    clearPending();

    entries.push({
      key: kv[1],
      value: stripQuotes(valuePart),
      documentation,
      line: i + 1,
      docStartLine,
    });
  }

  return entries;
}

export function keysSet(entries: Iterable<{ key: string }>): Set<string> {
  return new Set(Array.from(entries, (e) => e.key));
}

export function missingKeys(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  for (const k of a) {
    if (!b.has(k)) {
      out.push(k);
    }
  }
  return out.sort((x, y) => x.localeCompare(y));
}
