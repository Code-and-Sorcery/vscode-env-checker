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
    th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; word-break: break-word; }
    tbody td { vertical-align: middle; }
    th { background: var(--head); font-weight: 600; font-size: 12px; vertical-align: middle; }
    th.col-diff, td.col-diff { width: 44px; padding: 0; text-align: center; vertical-align: middle; }
    th.col-diff { padding: 6px 4px; }
    tbody td.col-diff { height: 1px; }
    td.col-diff .diff-inner {
      display: flex; align-items: center; justify-content: center; box-sizing: border-box;
      height: 100%; min-height: 100%; padding: 6px 4px;
    }
    tr.env-doc-above.row-both td { background: var(--row-both); }
    tr.env-doc-above.row-both td.col-doc-above { vertical-align: top; }
    tr.env-data-row.row-both td:not(.col-diff) { background: var(--row-both); }
    tr.env-data-row.row-both td.col-diff { background: transparent; }
    tr.env-data-row.row-both .diff-inner { background: var(--row-both); }
    tr.env-doc-above.row-baseOnly td { background: var(--row-base); }
    tr.env-doc-above.row-baseOnly td.col-doc-above { vertical-align: top; }
    tr.env-data-row.row-baseOnly td:not(.col-diff) { background: var(--row-base); }
    tr.env-data-row.row-baseOnly td.col-diff { background: transparent; }
    tr.env-data-row.row-baseOnly .diff-inner { background: var(--row-base); }
    tr.env-doc-above.row-compareOnly td { background: var(--row-compare); }
    tr.env-doc-above.row-compareOnly td.col-doc-above { vertical-align: top; }
    tr.env-data-row.row-compareOnly td:not(.col-diff) { background: var(--row-compare); }
    tr.env-data-row.row-compareOnly td.col-diff { background: transparent; }
    tr.env-data-row.row-compareOnly .diff-inner { background: var(--row-compare); }
    tr.env-doc-above.row-neutral td { background: transparent; }
    tr.env-doc-above.row-neutral td.col-doc-above { vertical-align: top; }
    tr.env-data-row.row-neutral td:not(.col-diff) { background: transparent; }
    tr.env-data-row.row-neutral .diff-inner { background: transparent; }
    th.col-key, td.col-key { width: 26%; font-family: var(--mono); font-size: 12px; }
    th.col-val, td.col-val { width: 38%; font-family: var(--mono); font-size: 12px; white-space: pre-wrap; }
    th.col-edit, td.col-edit { width: 100px; text-align: center; vertical-align: middle; padding: 4px 6px; }
    td.col-edit.rowspan-edit { vertical-align: middle; }
    tr.env-doc-above.row-both td.col-edit.rowspan-edit { background: var(--row-both); }
    tr.env-doc-above.row-baseOnly td.col-edit.rowspan-edit { background: var(--row-base); }
    tr.env-doc-above.row-compareOnly td.col-edit.rowspan-edit { background: var(--row-compare); }
    tr.env-doc-above.row-neutral td.col-edit.rowspan-edit { background: transparent; }
    td.col-doc-above { padding: 8px 10px; }
    .doc-above-display {
      font-size: 11px; color: var(--muted); line-height: 1.45; white-space: pre-wrap; word-break: break-word;
      min-height: 1.2em;
    }
    textarea.doc-ta-above {
      width: 100%; box-sizing: border-box; min-height: 72px; resize: vertical;
      font-family: var(--mono); font-size: 12px; color: var(--fg); background: var(--bg);
      border: 1px solid var(--border); padding: 8px; border-radius: 2px;
    }
    input.inp-row-edit {
      width: 100%; box-sizing: border-box; font-family: var(--mono); font-size: 12px;
      color: var(--fg); background: var(--bg); border: 1px solid var(--border); padding: 5px 6px; border-radius: 2px;
    }
    svg.icon-svg { display: block; width: 16px; height: 16px; flex-shrink: 0; }
    button.btn-doc-edit {
      font-size: 10px; padding: 2px 7px; cursor: pointer; border: 1px solid var(--border); border-radius: 2px;
      background: var(--btn-bg); color: var(--btn-fg); line-height: 1.2;
    }
    button.btn-doc-edit:hover { filter: brightness(1.08); }
    .row-edit-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-items: center; }
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
    tfoot.add-foot td.col-diff { padding: 0; }
    tfoot.add-foot input.inp-new {
      width: 100%; box-sizing: border-box; font-family: var(--mono); font-size: 12px;
      color: var(--fg); background: var(--bg); border: 1px solid var(--border);
      padding: 5px 6px; border-radius: 2px;
    }
    tfoot.add-foot input.inp-new::placeholder { color: var(--muted); opacity: 0.85; }
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
      thead.innerHTML = '<tr><th class="col-diff">Diff</th><th class="col-key">Clé</th><th class="col-val">Valeur</th><th class="col-edit"></th></tr>';
      table.appendChild(thead);
      const tb = document.createElement('tbody');

      function setDiffIcon(diffInner, row) {
        if (row.status === 'both') {
          diffInner.innerHTML = svgCheck;
          diffInner.style.color = 'var(--icon-both)';
        } else if (row.status === 'baseOnly') {
          diffInner.innerHTML = svgMinus;
          diffInner.style.color = '';
        } else if (row.status === 'compareOnly') {
          diffInner.innerHTML = svgPlus;
          diffInner.style.color = '';
        }
      }

      for (const row of payload.rows) {
        var editing = window.__editingRowKey === row.key && row.status !== 'compareOnly';
        let taDoc = null;
        let inpKey = null;
        let inpVal = null;
        var hasDoc = !!(row.documentation && String(row.documentation).trim());
        var docRowVisible = editing || hasDoc;
        /** Cellule Éditer : rowspan 2 si ligne doc au-dessus, sinon une seule ligne sur trData. */
        var tdEdit = null;

        if (docRowVisible) {
          const trDoc = document.createElement('tr');
          trDoc.className = 'env-doc-above row-' + row.status;
          const tdDiffRowspan = document.createElement('td');
          tdDiffRowspan.className = 'col-diff diff-rowspan';
          tdDiffRowspan.rowSpan = 2;
          const diffInnerSpan = document.createElement('div');
          diffInnerSpan.className = 'diff-inner';
          setDiffIcon(diffInnerSpan, row);
          tdDiffRowspan.appendChild(diffInnerSpan);
          trDoc.appendChild(tdDiffRowspan);
          const tdDocMerged = document.createElement('td');
          tdDocMerged.colSpan = 2;
          tdDocMerged.className = 'col-doc-above';
          if (editing) {
            taDoc = document.createElement('textarea');
            taDoc.className = 'doc-ta-above';
            taDoc.value = row.documentation || '';
            taDoc.setAttribute('aria-label', 'Documentation pour ' + row.key);
            tdDocMerged.appendChild(taDoc);
          } else {
            var docDisp = document.createElement('div');
            docDisp.className = 'doc-above-display';
            docDisp.textContent = row.documentation;
            tdDocMerged.appendChild(docDisp);
          }
          trDoc.appendChild(tdDocMerged);
          tdEdit = document.createElement('td');
          tdEdit.className = 'col-edit rowspan-edit';
          tdEdit.rowSpan = 2;
          trDoc.appendChild(tdEdit);
          tb.appendChild(trDoc);
        }

        const trData = document.createElement('tr');
        trData.className = 'env-data-row row-' + row.status;
        trData.dataset.envKey = row.key;

        if (!docRowVisible) {
          const tdDiff = document.createElement('td');
          tdDiff.className = 'col-diff';
          const diffInner = document.createElement('div');
          diffInner.className = 'diff-inner';
          setDiffIcon(diffInner, row);
          tdDiff.appendChild(diffInner);
          trData.appendChild(tdDiff);
        }

        const tdKey = document.createElement('td');
        tdKey.className = 'col-key';
        if (editing) {
          inpKey = document.createElement('input');
          inpKey.type = 'text';
          inpKey.className = 'inp-row-edit';
          inpKey.value = row.key;
          inpKey.setAttribute('autocomplete', 'off');
          tdKey.appendChild(inpKey);
        } else {
          tdKey.textContent = row.key;
        }
        trData.appendChild(tdKey);

        const tdVal = document.createElement('td');
        tdVal.className = 'col-val';
        if (editing) {
          inpVal = document.createElement('input');
          inpVal.type = 'text';
          inpVal.className = 'inp-row-edit';
          inpVal.value = row.value;
          inpVal.setAttribute('autocomplete', 'off');
          tdVal.appendChild(inpVal);
        } else {
          tdVal.textContent = row.value;
        }
        trData.appendChild(tdVal);

        if (!docRowVisible) {
          tdEdit = document.createElement('td');
          tdEdit.className = 'col-edit';
        }
        if (row.status !== 'compareOnly') {
          if (editing && taDoc && inpKey && inpVal) {
            var act = document.createElement('div');
            act.className = 'row-edit-actions';
            var btnSave = document.createElement('button');
            btnSave.type = 'button';
            btnSave.className = 'row-action';
            btnSave.textContent = 'Enregistrer';
            btnSave.addEventListener('click', function () {
              vscode.postMessage({
                type: 'saveRow',
                basePath: payload.basePath,
                originalKey: row.key,
                key: inpKey.value.trim(),
                value: inpVal.value,
                comment: taDoc.value
              });
            });
            var btnCancel = document.createElement('button');
            btnCancel.type = 'button';
            btnCancel.className = 'row-action';
            btnCancel.textContent = 'Annuler';
            btnCancel.addEventListener('click', function () {
              window.__editingRowKey = null;
              render(window.__lastPayload);
            });
            act.appendChild(btnSave);
            act.appendChild(btnCancel);
            tdEdit.appendChild(act);
          } else if (!editing) {
            var btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'btn-doc-edit';
            btnEdit.textContent = 'Éditer';
            btnEdit.addEventListener('click', function (ev) {
              ev.preventDefault();
              window.__editingRowKey = row.key;
              render(window.__lastPayload);
            });
            tdEdit.appendChild(btnEdit);
          }
        }
        if (!docRowVisible) {
          trData.appendChild(tdEdit);
        }

        tb.appendChild(trData);
      }
      table.appendChild(tb);

      const foot = document.createElement('tfoot');
      foot.className = 'add-foot';
      const trAdd = document.createElement('tr');
      const tdIconF = document.createElement('td');
      tdIconF.className = 'col-diff';
      const tdKeyF = document.createElement('td');
      tdKeyF.className = 'col-key';
      const inpNewKey = document.createElement('input');
      inpNewKey.type = 'text';
      inpNewKey.className = 'inp-new';
      inpNewKey.id = 'inp-new-key';
      inpNewKey.placeholder = 'Nouvelle clé';
      inpNewKey.setAttribute('autocomplete', 'off');
      inpNewKey.setAttribute('title', 'Appuyez sur Entrée pour ajouter la variable au fichier de base');
      tdKeyF.appendChild(inpNewKey);
      const tdValF = document.createElement('td');
      tdValF.className = 'col-val';
      const inpNewVal = document.createElement('input');
      inpNewVal.type = 'text';
      inpNewVal.className = 'inp-new';
      inpNewVal.id = 'inp-new-val';
      inpNewVal.placeholder = 'Valeur';
      inpNewVal.setAttribute('autocomplete', 'off');
      inpNewVal.setAttribute('title', 'Appuyez sur Entrée pour ajouter la variable au fichier de base');
      tdValF.appendChild(inpNewVal);
      const tdEditF = document.createElement('td');
      tdEditF.className = 'col-edit';
      trAdd.appendChild(tdIconF);
      trAdd.appendChild(tdKeyF);
      trAdd.appendChild(tdValF);
      trAdd.appendChild(tdEditF);
      foot.appendChild(trAdd);
      table.appendChild(foot);

      function submitNewRow() {
        var k = inpNewKey.value.trim();
        var v = inpNewVal.value;
        if (!k) {
          return;
        }
        vscode.postMessage({
          type: 'addManualEntry',
          basePath: payload.basePath,
          key: k,
          value: v
        });
      }
      function tryAddFromEnter(ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitNewRow();
        }
      }
      inpNewKey.addEventListener('keydown', tryAddFromEnter);
      inpNewVal.addEventListener('keydown', tryAddFromEnter);

      tableWrap.replaceChildren(table);
    }

    window.addEventListener('message', function (event) {
      const m = event.data;
      if (m && m.type === 'comparePayload' && m.payload) {
        window.__editingRowKey = null;
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
