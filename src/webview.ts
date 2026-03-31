import * as vscode from 'vscode';
import type { CompareViewPayload } from './compareModel';

export function getEnvCheckerWebviewHtml(webview: vscode.Webview, nonce: string): string {
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Env Checker</title>
  <style>
    :root {
      --border: var(--vscode-panel-border, #444);
      --fg: var(--vscode-foreground);
      --bg: var(--vscode-editor-background);
      --head: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,.15));
      --mono: var(--vscode-editor-font-family, ui-monospace, monospace);
      --muted: var(--vscode-descriptionForeground, #999);
      --btn-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --btn-fg: var(--vscode-button-secondaryForeground, #ccc);
      --icon-both: var(--vscode-descriptionForeground, #888);
      --row-both: rgba(128, 128, 128, 0.14);
      --row-base: rgba(255, 80, 80, 0.14);
      --row-compare: rgba(72, 180, 120, 0.16);
    }
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--fg); background: var(--bg); margin: 0; padding: 12px 16px 24px; }
    h1 { font-size: 1.1rem; font-weight: 600; margin: 0 0 12px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 16px 24px; margin-bottom: 16px; align-items: flex-end; }
    .field { display: flex; flex-direction: column; gap: 4px; min-width: 180px; flex: 1; }
    .field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    select {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--fg);
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 6px 8px;
      border-radius: 2px;
      max-width: 100%;
    }
    select:disabled { opacity: 0.55; }
    .hint { color: var(--muted); font-size: 12px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: middle; word-break: break-word; }
    th { background: var(--head); font-weight: 600; font-size: 12px; }
    th.col-icon, td.col-icon { width: 36px; text-align: center; padding-left: 4px; padding-right: 4px; }
    th.col-key, td.col-key { width: 26%; font-family: var(--mono); font-size: 12px; }
    th.col-val, td.col-val { width: auto; font-family: var(--mono); font-size: 12px; white-space: pre-wrap; }
    th.col-act, td.col-act { width: 88px; text-align: center; }
    th.col-doc, td.col-doc { width: 40px; text-align: center; }
    tr.row-both td { background: var(--row-both); }
    tr.row-baseOnly td { background: var(--row-base); }
    tr.row-compareOnly td { background: var(--row-compare); }
    tr.row-neutral td { background: transparent; }
    .icon-cell { display: flex; align-items: center; justify-content: center; }
    svg.icon-svg { display: block; width: 16px; height: 16px; flex-shrink: 0; }
    .info-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border);
      background: var(--btn-bg); color: var(--btn-fg); cursor: help; padding: 0; margin: 0 auto;
    }
    .info-btn:hover { filter: brightness(1.08); }
    button.row-action {
      font-size: 11px;
      padding: 4px 8px;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 2px;
      background: var(--btn-bg);
      color: var(--btn-fg);
    }
    button.row-action:hover { filter: brightness(1.1); }
    .empty { color: var(--muted); padding: 16px 0; font-size: 13px; }
    tfoot.add-foot td { padding: 6px 8px; vertical-align: middle; border: 1px solid var(--border); }
    tfoot.add-foot input.inp-new {
      width: 100%; box-sizing: border-box; font-family: var(--mono); font-size: 12px;
      color: var(--fg); background: var(--bg); border: 1px solid var(--border);
      padding: 5px 6px; border-radius: 2px;
    }
    tfoot.add-foot input.inp-new::placeholder { color: var(--muted); opacity: 0.85; }
    .add-plus-wrap { margin-top: 10px; display: flex; justify-content: center; }
    button.btn-add-plus {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 36px; min-height: 32px; padding: 6px 14px; cursor: pointer;
      border: 1px solid var(--border); border-radius: 4px;
      background: var(--btn-bg); color: var(--btn-fg); font-size: 18px; line-height: 1;
    }
    button.btn-add-plus:hover { filter: brightness(1.1); }
  </style>
</head>
<body>
  <h1>Env Checker</h1>
  <div class="toolbar">
    <div class="field">
      <label for="sel-base">Fichier de base</label>
      <select id="sel-base"></select>
    </div>
    <div class="field">
      <label for="sel-compare">Fichier de comparaison</label>
      <select id="sel-compare"></select>
    </div>
  </div>
  <p class="hint" id="hint"></p>
  <div id="table-wrap"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const selBase = document.getElementById('sel-base');
    const selCompare = document.getElementById('sel-compare');
    const hint = document.getElementById('hint');
    const tableWrap = document.getElementById('table-wrap');

    const svgCheck = '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svgMinus = '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const svgPlus = '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 4v8M4 8h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const svgInfo = '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 7.2V11M8 5.1h.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    function fillSelect(select, files, selectedPath, includeEmpty) {
      select.innerHTML = '';
      if (includeEmpty) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '— Aucune comparaison —';
        select.appendChild(o);
      }
      var matched = false;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var o = document.createElement('option');
        o.value = f.path;
        o.textContent = f.label;
        if (selectedPath && f.path === selectedPath) {
          o.selected = true;
          matched = true;
        }
        select.appendChild(o);
      }
      if (!includeEmpty && files.length && !matched) {
        select.selectedIndex = 0;
      }
      if (includeEmpty && !matched) {
        select.value = '';
      }
    }

    function emitSelect() {
      vscode.postMessage({
        type: 'select',
        basePath: selBase.value,
        comparePath: selCompare.value || null
      });
    }

    selBase.addEventListener('change', function () {
      var base = selBase.value;
      var payload = window.__lastPayload;
      if (payload) {
        var others = payload.envFiles.filter(function (f) { return f.path !== base; });
        selCompare.disabled = others.length === 0;
        var prevCompare = selCompare.value;
        var nextCompare = prevCompare === base ? '' : prevCompare;
        fillSelect(selCompare, others, nextCompare, true);
      }
      emitSelect();
    });

    selCompare.addEventListener('change', emitSelect);

    function render(payload) {
      window.__lastPayload = payload;

      if (payload.noEnvFiles) {
        hint.textContent = 'Aucun fichier .env dans ce dossier.';
        tableWrap.innerHTML = '';
        selBase.innerHTML = '';
        selCompare.innerHTML = '';
        selCompare.disabled = true;
        return;
      }

      fillSelect(selBase, payload.envFiles, payload.basePath || '', false);
      const base = payload.basePath || '';
      const others = payload.envFiles.filter(function (f) { return f.path !== base; });
      selCompare.disabled = others.length === 0;
      if (others.length === 0) {
        selCompare.innerHTML = '';
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '—';
        selCompare.appendChild(o);
      } else {
        const curCompare = payload.comparePath && others.some(function (f) { return f.path === payload.comparePath; })
          ? payload.comparePath
          : '';
        fillSelect(selCompare, others, curCompare, true);
      }

      if (!payload.basePath) {
        hint.textContent = 'Choisissez un fichier de base pour afficher le tableau.';
        tableWrap.innerHTML = '<p class="empty">Aucun tableau : pas de fichier de base.</p>';
        return;
      }

      var cmpLabel = '';
      if (payload.comparePath) {
        var cf = payload.envFiles.find(function (f) { return f.path === payload.comparePath; });
        cmpLabel = cf ? cf.label : '';
      }
      hint.textContent = payload.comparePath
        ? 'Comparaison par clé avec « ' + cmpLabel + ' ».'
        : 'Aucun fichier de comparaison : affichage des seules clés du fichier de base.';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th class="col-icon"></th><th class="col-key">Clé</th><th class="col-val">Valeur</th><th class="col-act"></th><th class="col-doc"></th></tr>';
      table.appendChild(thead);
      const tb = document.createElement('tbody');

      for (const row of payload.rows) {
        const tr = document.createElement('tr');
        tr.className = 'row-' + row.status;

        const tdIcon = document.createElement('td');
        tdIcon.className = 'col-icon icon-cell';
        if (row.status === 'both') {
          tdIcon.innerHTML = svgCheck;
          tdIcon.style.color = 'var(--icon-both)';
        } else if (row.status === 'baseOnly') {
          tdIcon.innerHTML = svgMinus;
        } else if (row.status === 'compareOnly') {
          tdIcon.innerHTML = svgPlus;
        } else {
          tdIcon.textContent = '';
        }
        tr.appendChild(tdIcon);

        const tdKey = document.createElement('td');
        tdKey.className = 'col-key';
        tdKey.textContent = row.key;
        tr.appendChild(tdKey);

        const tdVal = document.createElement('td');
        tdVal.className = 'col-val';
        tdVal.textContent = row.value;
        tr.appendChild(tdVal);

        const tdAct = document.createElement('td');
        tdAct.className = 'col-act';
        if (row.status === 'baseOnly' && payload.comparePath) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'row-action';
          btn.textContent = 'Supprimer';
          btn.addEventListener('click', function () {
            vscode.postMessage({ type: 'deleteKey', basePath: payload.basePath, key: row.key });
          });
          tdAct.appendChild(btn);
        } else if (row.status === 'compareOnly' && payload.basePath && payload.comparePath) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'row-action';
          btn.textContent = 'Ajouter';
          btn.addEventListener('click', function () {
            vscode.postMessage({
              type: 'addKey',
              basePath: payload.basePath,
              comparePath: payload.comparePath,
              key: row.key
            });
          });
          tdAct.appendChild(btn);
        }
        tr.appendChild(tdAct);

        const tdDoc = document.createElement('td');
        tdDoc.className = 'col-doc';
        if (row.documentation) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'info-btn';
          b.title = row.documentation;
          b.setAttribute('aria-label', 'Documentation');
          b.innerHTML = svgInfo;
          tdDoc.appendChild(b);
        }
        tr.appendChild(tdDoc);

        tb.appendChild(tr);
      }
      table.appendChild(tb);

      const foot = document.createElement('tfoot');
      foot.className = 'add-foot';
      const trAdd = document.createElement('tr');
      const tdIconF = document.createElement('td');
      tdIconF.className = 'col-icon';
      const tdKeyF = document.createElement('td');
      tdKeyF.className = 'col-key';
      const inpKey = document.createElement('input');
      inpKey.type = 'text';
      inpKey.className = 'inp-new';
      inpKey.id = 'inp-new-key';
      inpKey.placeholder = 'Nouvelle clé';
      inpKey.setAttribute('autocomplete', 'off');
      tdKeyF.appendChild(inpKey);
      const tdValF = document.createElement('td');
      tdValF.className = 'col-val';
      const inpVal = document.createElement('input');
      inpVal.type = 'text';
      inpVal.className = 'inp-new';
      inpVal.id = 'inp-new-val';
      inpVal.placeholder = 'Valeur';
      inpVal.setAttribute('autocomplete', 'off');
      tdValF.appendChild(inpVal);
      const tdActF = document.createElement('td');
      tdActF.className = 'col-act';
      const tdDocF = document.createElement('td');
      tdDocF.className = 'col-doc';
      trAdd.appendChild(tdIconF);
      trAdd.appendChild(tdKeyF);
      trAdd.appendChild(tdValF);
      trAdd.appendChild(tdActF);
      trAdd.appendChild(tdDocF);
      foot.appendChild(trAdd);
      table.appendChild(foot);

      const plusWrap = document.createElement('div');
      plusWrap.className = 'add-plus-wrap';
      const btnPlus = document.createElement('button');
      btnPlus.type = 'button';
      btnPlus.className = 'btn-add-plus';
      btnPlus.setAttribute('aria-label', 'Ajouter la variable');
      btnPlus.innerHTML = svgPlus;
      btnPlus.addEventListener('click', function () {
        var kEl = document.getElementById('inp-new-key');
        var vEl = document.getElementById('inp-new-val');
        var k = kEl ? kEl.value.trim() : '';
        var v = vEl ? vEl.value : '';
        if (!k) {
          return;
        }
        vscode.postMessage({
          type: 'addManualEntry',
          basePath: payload.basePath,
          key: k,
          value: v
        });
      });
      plusWrap.appendChild(btnPlus);

      function tryAddFromEnter(ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          btnPlus.click();
        }
      }
      inpKey.addEventListener('keydown', tryAddFromEnter);
      inpVal.addEventListener('keydown', tryAddFromEnter);

      const frag = document.createDocumentFragment();
      frag.appendChild(table);
      frag.appendChild(plusWrap);
      tableWrap.replaceChildren(frag);
    }

    window.addEventListener('message', function (event) {
      const m = event.data;
      if (m && m.type === 'comparePayload' && m.payload) {
        render(m.payload);
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

export function postComparePayloadToWebview(webview: vscode.Webview, payload: CompareViewPayload): void {
  webview.postMessage({ type: 'comparePayload', payload });
}
