import * as vscode from 'vscode';
import type { CompareViewPayload } from './compareModel';
import { webviewLucideHtml } from './lucideSvg';

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
    th.col-grip, td.col-grip { width: 30px; padding: 0; text-align: center; vertical-align: middle; }
    th.col-grip { padding: 6px 2px; }
    tbody td.col-grip { height: 1px; }
    td.col-grip.diff-rowspan { vertical-align: middle; }
    .grip-handle {
      display: inline-flex; align-items: center; justify-content: center; cursor: grab;
      color: var(--muted); padding: 4px 2px; user-select: none; line-height: 0;
    }
    .grip-handle:active { cursor: grabbing; }
    .grip-handle[draggable="false"] { cursor: default; opacity: 0.35; }
    /* Avant cette variable : barre de prévisualisation sur toute la largeur du tableau. */
    tr.drag-over-key > td {
      box-shadow: inset 0 3px 0 var(--vscode-focusBorder, #007fd4);
    }
    /* Après cette variable : bas de la ligne clé/valeur (toutes les cellules de ce tr). */
    tr.drag-over-key-after > td {
      box-shadow: inset 0 -3px 0 var(--vscode-focusBorder, #007fd4);
    }
    /*
     * Bloc doc + ligne données : grip / diff / action sont sur la 1re tr (rowspan 2) ;
     * la cellule doc ne va pas jusqu’en bas — on trace la barre sur 1, 2 et 4e td seulement.
     */
    tr.drag-over-key-after-doc > td:nth-child(1),
    tr.drag-over-key-after-doc > td:nth-child(2),
    tr.drag-over-key-after-doc > td:nth-child(4) {
      box-shadow: inset 0 -3px 0 var(--vscode-focusBorder, #007fd4);
    }
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
    /* Clé + valeur : pas de % fixe — elles absorbent l’espace restant (voir colgroup). */
    th.col-key, td.col-key,
    th.col-val, td.col-val {
      width: auto;
      min-width: 0;
      font-family: var(--mono);
      font-size: 12px;
    }
    th.col-val, td.col-val { white-space: pre-wrap; }
    th.col-edit, td.col-edit {
      width: 76px;
      max-width: 96px;
      min-width: 56px;
      text-align: center;
      vertical-align: middle;
      padding: 2px 4px;
      white-space: nowrap;
      box-sizing: border-box;
    }
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
      display: inline-flex; align-items: center; justify-content: center;
      padding: 4px; cursor: pointer; border: 1px solid var(--border); border-radius: 2px;
      background: var(--btn-bg); color: var(--btn-fg); line-height: 0;
    }
    button.btn-doc-edit:hover { filter: brightness(1.08); }
    .row-edit-actions {
      display: inline-flex;
      flex-wrap: nowrap;
      gap: 3px;
      justify-content: center;
      align-items: center;
      max-width: 100%;
    }
    .col-edit button.row-action,
    .col-edit button.btn-doc-edit {
      padding: 3px;
      min-width: 0;
      flex-shrink: 0;
    }
    button.row-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 6px;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 2px;
      background: var(--btn-bg);
      color: var(--btn-fg);
      line-height: 0;
    }
    button.row-action:hover { filter: brightness(1.1); }
    button.row-action.row-action-delete-armed {
      border-color: var(--vscode-inputValidation-errorBorder, #c00);
      color: var(--vscode-errorForeground, #f44);
    }
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

    const svgCheck = ${JSON.stringify(webviewLucideHtml.check)};
    const svgMinus = ${JSON.stringify(webviewLucideHtml.minus)};
    const svgPlus = ${JSON.stringify(webviewLucideHtml.plus)};
    const svgEdit = ${JSON.stringify(webviewLucideHtml.pencil)};
    const svgSave = ${JSON.stringify(webviewLucideHtml.save)};
    const svgCancel = ${JSON.stringify(webviewLucideHtml.x)};
    const svgGrip = ${JSON.stringify(webviewLucideHtml.gripVertical)};
    const svgTrash2 = ${JSON.stringify(webviewLucideHtml.trash2)};
    window.__armedDeleteBtn = null;
    function resetDeleteConfirmButton() {
      var b = window.__armedDeleteBtn;
      if (!b) {
        return;
      }
      b.innerHTML = svgMinus;
      b.removeAttribute('data-delete-phase');
      b.setAttribute('aria-label', 'Supprimer du fichier de base');
      b.setAttribute('title', 'Supprimer cette variable du fichier de base');
      b.classList.remove('row-action-delete-armed');
      window.__armedDeleteBtn = null;
    }
    if (!window.__envCheckerDeleteOutsideBound) {
      window.__envCheckerDeleteOutsideBound = true;
      document.addEventListener(
        'click',
        function (ev) {
          var b = window.__armedDeleteBtn;
          if (!b) {
            return;
          }
          if (!document.body.contains(b)) {
            window.__armedDeleteBtn = null;
            return;
          }
          var t = ev.target;
          if (b === t || b.contains(t)) {
            return;
          }
          resetDeleteConfirmButton();
        },
        true,
      );
    }
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
      resetDeleteConfirmButton();

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
      const cg = document.createElement('colgroup');
      const colW = function (w) {
        const c = document.createElement('col');
        if (w) {
          c.style.width = w;
        }
        return c;
      };
      cg.appendChild(colW('30px'));
      cg.appendChild(colW('44px'));
      cg.appendChild(colW(null));
      cg.appendChild(colW(null));
      cg.appendChild(colW('80px'));
      table.appendChild(cg);
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th class="col-grip" aria-label="Ordre"></th><th class="col-diff">Diff</th><th class="col-key">Clé</th><th class="col-val">Valeur</th><th class="col-edit">Action</th></tr>';
      table.appendChild(thead);
      const tb = document.createElement('tbody');

      function attachGripHandle(tdGrip, row, editing) {
        if (row.status === 'compareOnly') {
          return;
        }
        var gh = document.createElement('span');
        gh.className = 'grip-handle';
        gh.innerHTML = svgGrip;
        gh.setAttribute('aria-label', 'Réorganiser');
        gh.dataset.dragKey = row.key;
        gh.draggable = !editing;
        tdGrip.appendChild(gh);
      }

      function setupDragReorder(tableBody, pl, tfootAddTr) {
        var baseKeys = pl.rows
          .filter(function (r) { return r.status !== 'compareOnly'; })
          .map(function (r) { return r.key; });
        function clearDragOver() {
          tableBody.querySelectorAll('tr.drag-over-key, tr.drag-over-key-after, tr.drag-over-key-after-doc').forEach(function (tr) {
            tr.classList.remove('drag-over-key', 'drag-over-key-after', 'drag-over-key-after-doc');
          });
        }
        /**
         * insertAfter : uniquement sur env-data-row (moitié basse) → après ce bloc variable ;
         * sinon → avant ce bloc (ligne doc si présente, sinon données).
         */
        function highlightReorder(key, insertAfter) {
          clearDragOver();
          var docTr = null;
          var dataTr = null;
          tableBody.querySelectorAll('tr[data-env-key]').forEach(function (tr) {
            if (tr.dataset.envKey !== key) {
              return;
            }
            if (tr.classList.contains('env-doc-above')) {
              docTr = tr;
            }
            if (tr.classList.contains('env-data-row')) {
              dataTr = tr;
            }
          });
          if (insertAfter && dataTr) {
            dataTr.classList.add('drag-over-key-after');
            if (docTr) {
              docTr.classList.add('drag-over-key-after-doc');
            }
          } else if (docTr) {
            docTr.classList.add('drag-over-key');
          } else if (dataTr) {
            dataTr.classList.add('drag-over-key');
          }
        }
        /** Bas ~60 % de la ligne clé/valeur = insérer après (cible plus large que 50 %). */
        function insertAfterFromEvent(tr, e) {
          if (!tr.classList.contains('env-data-row')) {
            return false;
          }
          var rect = tr.getBoundingClientRect();
          return e.clientY >= rect.top + rect.height * 0.4;
        }
        function getLastReorderableBaseKey() {
          var rows = tableBody.querySelectorAll('tr.env-data-row[data-reorder-target="1"]');
          if (!rows.length) {
            return null;
          }
          return rows[rows.length - 1].dataset.envKey || null;
        }
        function postReorder(order) {
          vscode.postMessage({
            type: 'reorderKeys',
            basePath: pl.basePath,
            orderedKeys: order
          });
        }
        tableBody.querySelectorAll('.grip-handle[draggable="true"]').forEach(function (h) {
          h.addEventListener('dragstart', function (e) {
            var k = h.dataset.dragKey || '';
            e.dataTransfer.setData('text/plain', k);
            e.dataTransfer.effectAllowed = 'move';
          });
          h.addEventListener('dragend', clearDragOver);
        });
        tableBody.querySelectorAll('tr[data-reorder-target="1"]').forEach(function (tr) {
          tr.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            var k = tr.dataset.envKey || '';
            if (!k) {
              return;
            }
            highlightReorder(k, insertAfterFromEvent(tr, e));
          });
          tr.addEventListener('drop', function (e) {
            e.preventDefault();
            clearDragOver();
            var fromKey = e.dataTransfer.getData('text/plain');
            var toKey = tr.dataset.envKey || '';
            if (!fromKey || !toKey) {
              return;
            }
            var insertAfter = insertAfterFromEvent(tr, e);
            if (fromKey === toKey) {
              return;
            }
            var order = baseKeys.slice();
            var fi = order.indexOf(fromKey);
            var ti = order.indexOf(toKey);
            if (fi < 0 || ti < 0) {
              return;
            }
            order.splice(fi, 1);
            var newTi = order.indexOf(toKey);
            if (insertAfter) {
              order.splice(newTi + 1, 0, fromKey);
            } else {
              order.splice(newTi, 0, fromKey);
            }
            postReorder(order);
          });
        });
        if (tfootAddTr) {
          tfootAddTr.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            var lk = getLastReorderableBaseKey();
            if (lk) {
              highlightReorder(lk, true);
            }
          });
          tfootAddTr.addEventListener('drop', function (e) {
            e.preventDefault();
            clearDragOver();
            var fromKey = e.dataTransfer.getData('text/plain');
            var lastKey = getLastReorderableBaseKey();
            if (!fromKey || !lastKey) {
              return;
            }
            if (fromKey === lastKey) {
              return;
            }
            var order = baseKeys.slice();
            var fi = order.indexOf(fromKey);
            var li = order.indexOf(lastKey);
            if (fi < 0 || li < 0) {
              return;
            }
            order.splice(fi, 1);
            var newLi = order.indexOf(lastKey);
            if (newLi < 0) {
              return;
            }
            order.splice(newLi + 1, 0, fromKey);
            postReorder(order);
          });
        }
      }

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
          trDoc.dataset.envKey = row.key;
          trDoc.setAttribute('data-reorder-target', row.status !== 'compareOnly' ? '1' : '0');
          const tdGripRowspan = document.createElement('td');
          tdGripRowspan.className = 'col-grip diff-rowspan';
          tdGripRowspan.rowSpan = 2;
          attachGripHandle(tdGripRowspan, row, editing);
          trDoc.appendChild(tdGripRowspan);
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
        trData.setAttribute('data-reorder-target', row.status !== 'compareOnly' ? '1' : '0');

        if (!docRowVisible) {
          const tdGrip = document.createElement('td');
          tdGrip.className = 'col-grip';
          attachGripHandle(tdGrip, row, editing);
          trData.appendChild(tdGrip);
        }

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
        if (row.status === 'compareOnly' && payload.comparePath) {
          var btnAdd = document.createElement('button');
          btnAdd.type = 'button';
          btnAdd.className = 'row-action';
          btnAdd.setAttribute('aria-label', 'Ajouter au fichier de base');
          btnAdd.setAttribute('title', 'Ajouter cette variable au fichier de base');
          btnAdd.innerHTML = svgPlus;
          btnAdd.addEventListener('click', function () {
            vscode.postMessage({
              type: 'addKey',
              basePath: payload.basePath,
              comparePath: payload.comparePath,
              key: row.key
            });
          });
          tdEdit.appendChild(btnAdd);
        } else if (editing && taDoc && inpKey && inpVal) {
          var act = document.createElement('div');
          act.className = 'row-edit-actions';
          var btnSave = document.createElement('button');
          btnSave.type = 'button';
          btnSave.className = 'row-action';
          btnSave.setAttribute('aria-label', 'Enregistrer');
          btnSave.innerHTML = svgSave;
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
          btnCancel.setAttribute('aria-label', 'Annuler');
          btnCancel.innerHTML = svgCancel;
          btnCancel.addEventListener('click', function () {
            window.__editingRowKey = null;
            render(window.__lastPayload);
          });
          act.appendChild(btnSave);
          act.appendChild(btnCancel);
          tdEdit.appendChild(act);
        } else if (!editing && row.status !== 'compareOnly') {
          var actRow = document.createElement('div');
          actRow.className = 'row-edit-actions';
          var btnEditRow = document.createElement('button');
          btnEditRow.type = 'button';
          btnEditRow.className = 'btn-doc-edit';
          btnEditRow.setAttribute('aria-label', 'Éditer');
          btnEditRow.innerHTML = svgEdit;
          btnEditRow.addEventListener('click', function (ev) {
            ev.preventDefault();
            window.__editingRowKey = row.key;
            render(window.__lastPayload);
          });
          var btnDelRow = document.createElement('button');
          btnDelRow.type = 'button';
          btnDelRow.className = 'row-action';
          btnDelRow.setAttribute('aria-label', 'Supprimer du fichier de base');
          btnDelRow.setAttribute('title', 'Supprimer cette variable du fichier de base');
          btnDelRow.innerHTML = svgMinus;
          btnDelRow.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var delBtn = ev.currentTarget;
            if (delBtn.getAttribute('data-delete-phase') === 'confirm') {
              vscode.postMessage({
                type: 'deleteKey',
                basePath: payload.basePath,
                key: row.key
              });
              resetDeleteConfirmButton();
              return;
            }
            if (window.__armedDeleteBtn && window.__armedDeleteBtn !== delBtn) {
              resetDeleteConfirmButton();
            }
            window.__armedDeleteBtn = delBtn;
            delBtn.setAttribute('data-delete-phase', 'confirm');
            delBtn.innerHTML = svgTrash2;
            delBtn.classList.add('row-action-delete-armed');
            delBtn.setAttribute('aria-label', 'Confirmer la suppression');
            delBtn.setAttribute('title', 'Cliquer à nouveau pour supprimer du fichier de base');
          });
          actRow.appendChild(btnEditRow);
          actRow.appendChild(btnDelRow);
          tdEdit.appendChild(actRow);
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
      const tdGripF = document.createElement('td');
      tdGripF.className = 'col-grip';
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
      trAdd.appendChild(tdGripF);
      trAdd.appendChild(tdIconF);
      trAdd.appendChild(tdKeyF);
      trAdd.appendChild(tdValF);
      trAdd.appendChild(tdEditF);
      foot.appendChild(trAdd);
      table.appendChild(foot);

      setupDragReorder(tb, payload, trAdd);

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
