import type { IconNode, SVGProps } from 'lucide';
import Check from 'lucide/dist/esm/icons/check.js';
import Minus from 'lucide/dist/esm/icons/minus.js';
import Plus from 'lucide/dist/esm/icons/plus.js';
import Pencil from 'lucide/dist/esm/icons/pencil.js';
import Save from 'lucide/dist/esm/icons/save.js';
import X from 'lucide/dist/esm/icons/x.js';
import GripVertical from 'lucide/dist/esm/icons/grip-vertical.js';

function escapeXmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function serializePath(tag: string, attrs: SVGProps): string {
  const parts = Object.entries(attrs).map(([k, v]) => ` ${k}="${escapeXmlAttr(String(v))}"`);
  return `<${tag}${parts.join('')}/>`;
}

/**
 * Sérialise une icône Lucide (IconNode) en SVG inline pour la webview.
 * `createElement` de lucide utilise `document` — ici on reste compatible hôte Node / extension.
 */
export function lucideIconHtml(icon: IconNode, className = 'icon-svg'): string {
  const inner = icon.map(([tag, attrs]) => serializePath(tag, attrs)).join('');
  const cls = escapeXmlAttr(className);
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/** Icônes utilisées par la webview Env Checker (imports profonds pour éviter tout le bundle lucide). */
export const webviewLucideHtml = {
  check: lucideIconHtml(Check),
  minus: lucideIconHtml(Minus),
  plus: lucideIconHtml(Plus),
  pencil: lucideIconHtml(Pencil),
  save: lucideIconHtml(Save),
  x: lucideIconHtml(X),
  /** Lucide n’expose pas « grid-vertical » ; grip-vertical est l’icône standard de poignée de glisser-déposer. */
  gripVertical: lucideIconHtml(GripVertical),
} as const;
