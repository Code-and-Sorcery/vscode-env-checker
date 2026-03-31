export interface EnvEntry {
  key: string;
  value: string;
  documentation: string;
  line: number;
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

/**
 * Parse dotenv-style content: KEY=value, optional export, comments above a key become documentation.
 * Inline `#` after a quoted value is not treated as comment start (value is taken as whole per stripQuotes).
 */
export function parseEnvFile(content: string): EnvEntry[] {
  const lines = content.split(/\n/);
  const entries: EnvEntry[] = [];
  const pending: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    if (trimmed.startsWith('#')) {
      pending.push(commentBody(trimmed));
      continue;
    }

    const kv = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!kv) {
      pending.length = 0;
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
    pending.length = 0;

    entries.push({
      key: kv[1],
      value: stripQuotes(valuePart),
      documentation,
      line: i + 1,
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
