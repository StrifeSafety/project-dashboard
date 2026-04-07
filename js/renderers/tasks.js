import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { isOverdue, fmtDate, pCol, pColor, statusBadge, priBadge, pBar, safeJSON, statusIcon, taskDateStatus, fmtCur, calcProgress } from '../utils.js';
import { openDetail, openAddForm } from '../components/modal.js';
import { switchSubtab } from '../router.js';

/* ══════════════════════════════════════════════════
   RENDERER — Tasks (Planner, Milestones, Kanban)
   ══════════════════════════════════════════════════ */

export function renderTaskRows(list) {
  return list.map(t => {
    const linkedBudget = t.linkedBudgetId ? DATA.budgets.find(b => b.id === t.linkedBudgetId) : null;
    return `
    <tr onclick="openDetail('task',${safeJSON(t)})" ${isOverdue(t) ? 'style="border-left:2px solid var(--red)"' : ''}>
      <td class="td-main"><span>${t.name}</span></td>
      <td><span class="ptag"><span class="pdot" style="background:${pColor(t.project)}"></span>${t.project || '—'}</span></td>
      <td>${statusBadge(t)}</td>
      <td>${priBadge(t.priority)}</td>
      <td><span class="badge b-purple" style="font-family:'DM Mono',monospace;font-size:9.5px">${t.phase || '—'}</span></td>
      <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${calcProgress(t)}%;background:${pCol(calcProgress(t))}"></div></div><span class="prog-pct">${calcProgress(t)}%</span></div></td>
      <td class="td-mono" style="color:var(--text2)">${t.startDate ? fmtDate(t.startDate) : '—'}</td>
      <td class="td-mono">
        <div style="color:${taskDateStatus(t).color};font-weight:500">${t.due ? fmtDate(t.due) : '—'}</div>
        <div style="font-size:11.5px;color:${taskDateStatus(t).color};margin-top:2px">${taskDateStatus(t).icon} ${taskDateStatus(t).label}</div>
      </td>
      <td class="td-mono">${linkedBudget ? `
        <div title="Target: ${fmtCur(linkedBudget.target)} | Spend: ${fmtCur(linkedBudget.spend)} | Variance: ${linkedBudget.spend > linkedBudget.target ? '−' : '+'}${fmtCur(Math.abs(linkedBudget.spend - linkedBudget.target))} | Project: ${linkedBudget.project}" style="cursor:help">
          <div style="color:var(--text);font-weight:500;font-size:13px">${linkedBudget.name}</div>
          <div style="font-size:12px;margin-top:2px">
            <span style="color:var(--text3)">Target: </span><span style="color:var(--text2)">${fmtCur(linkedBudget.target)}</span>
            <span class="badge ${linkedBudget.spend > linkedBudget.target ? 'b-red' : 'b-green'}" style="margin-left:4px;font-size:11px">${linkedBudget.spend > linkedBudget.target ? '⬆ Over' : '⬇ Under'}</span>
          </div>
          <div style="font-size:11.5px;color:${linkedBudget.spend > linkedBudget.target ? 'var(--red)' : 'var(--green)'};margin-top:1px">${linkedBudget.spend > linkedBudget.target ? '−' : '+'}${fmtCur(Math.abs(linkedBudget.spend - linkedBudget.target))}</div>
        </div>
      ` : '—'}</td>
    </tr>`;
  }).join('');
}

export function filterTasks() {
  const s = document.getElementById('tsearch')?.value.toLowerCase();
  const ph = document.getElementById('tphase')?.value;
  const pr = document.getElementById('tpri')?.value;
  let list = [...DATA.tasks];
  if (AppState.sbProject) list = list.filter(t => t.project === AppState.sbProject);
  if (s) list = list.filter(t => t.name?.toLowerCase().includes(s) || t.project?.toLowerCase().includes(s));
  if (ph) list = list.filter(t => t.phase === ph);
  if (pr) list = list.filter(t => t.priority === pr);
  const tb = document.getElementById('taskTbody');
  if (tb) tb.innerHTML = renderTaskRows(list);
}

export function renderTasks(sub) {
  let list = [...DATA.tasks];
  if (AppState.sbProject) list = list.filter(t => t.project === AppState.sbProject);
  if (AppState.sbStatus) list = list.filter(t => t.status === AppState.sbStatus);

  const toolbarHTML = `
    <div class="task-toolbar-sticky" style="border-radius:var(--r) var(--r) 0 0">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;flex-wrap:wrap">
        <div class="search-wrap" style="max-width:240px"><span class="search-icon">🔍</span><input placeholder="Search tasks…" id="tsearch" oninput="filterTasks()" /></div>
        <select class="fselect" id="tphase" onchange="filterTasks()"><option value="">All Phases</option>${['Initiation', 'Planning', 'Execution', 'Review', 'Launch', 'Completed'].map(p => `<option>${p}</option>`).join('')}</select>
        <select class="fselect" id="tpri" onchange="filterTasks()"><option value="">All Priorities</option>${['High', 'Medium', 'Low'].map(p => `<option>${p}</option>`).join('')}</select>
        <div class="view-switcher" style="margin-left:auto">
          <button class="vs-btn${sub === 0 ? ' active' : ''}" onclick="switchSubtab(0)">⊞ Planner</button>
          <button class="vs-btn${sub === 1 ? ' active' : ''}" onclick="switchSubtab(1)">🏁 Milestones</button>
          <button class="vs-btn${sub === 2 ? ' active' : ''}" onclick="switchSubtab(2)">⊟ Kanban</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddForm('task')">+ Task</button>
      </div>
    </div>`;

  // ── KANBAN VIEW ──
  if (sub === 2) {
    const statuses = ['Not Started', 'In Progress', 'On Hold', 'Complete'];
    const scols = { 'Not Started': 'var(--text3)', 'In Progress': 'var(--yellow)', 'On Hold': 'var(--blue)', 'Complete': 'var(--green)' };
    return `<div style="padding:16px 24px">
      <div class="table-card" style="margin-bottom:16px">
        ${toolbarHTML}
        <div style="padding:12px 18px;border-bottom:1px solid var(--border)"><div class="table-title">⊟ Kanban Board</div></div>
      </div>
      <div class="kanban-wrap">
        ${statuses.map(s => {
      const cards = list.filter(t => t.status === s);
      return `<div class="kb-col">
            <div class="kb-head"><span class="kb-title" style="color:${scols[s]}">${statusIcon(s)} ${s}</span><span class="kb-cnt">${cards.length}</span></div>
            <div class="kb-cards">${cards.map(t => `
              <div class="kb-card" onclick="openDetail('task',${safeJSON(t)})">
                <div class="kb-card-title">${t.name}</div>
                <div class="kb-card-meta"><span class="ptag" style="font-size:11px"><span class="pdot" style="background:${pColor(t.project)}"></span>${t.project || '—'}</span>${priBadge(t.priority)}</div>
                <div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${calcProgress(t)}%;background:${pCol(calcProgress(t))}"></div></div><span class="prog-pct">${calcProgress(t)}%</span></div>
                <div class="kb-card-foot">
                  <span style="display:flex;flex-direction:column;gap:2px">
                    ${t.startDate ? `<span style="font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text3)">▶ ${fmtDate(t.startDate)}</span>` : ''}
                    <span style="font-family:'DM Mono',monospace;font-size:9.5px;color:${isOverdue(t) ? 'var(--red)' : 'var(--text2)'}">⏹ ${fmtDate(t.due)}</span>
                  </span>
                  <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3)">${t.hours ? t.hours + 'h' : '—'}</span>
                </div>
              </div>
            `).join('') || '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">Empty</div>'}</div>
          </div>`;
    }).join('')}
      </div>
    </div>`;
  }

  // ── MILESTONES VIEW ──
  if (sub === 1) {
    const phases = ['Initiation', 'Planning', 'Execution', 'Review', 'Launch', 'Completed'];
    const picons = { 'Initiation': '🌱', 'Planning': '🗺', 'Execution': '⚙️', 'Review': '🔍', 'Launch': '🚀', 'Completed': '✅' };
    return `<div style="padding:16px 24px"><div class="table-card">
      ${toolbarHTML}
      <div class="task-title-sticky" style="top:53px">
        <div class="table-header" style="border-radius:0;border-top:none"><div class="table-title">🏁 Milestones <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${list.length} tasks</span></div></div>
      </div>
      <table>
        <thead class="task-thead-sticky">
          <tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Progress</th><th>Start Date</th><th>Due</th><th>Hours</th></tr>
        </thead>
        <tbody>${phases.map(ph => {
      const group = list.filter(t => (t.phase || '') === ph);
      if (!group.length) return '';
      return `<tr class="group-header-row"><td colspan="8"><div class="gh-inner">${picons[ph] || '📌'} ${ph} <span style="font-family:'DM Mono',monospace;font-size:9px;background:var(--surface3);padding:1px 5px;border-radius:8px;font-weight:400">${group.length}</span></div></td></tr>` +
        group.map(t => `<tr onclick="openDetail('task',${safeJSON(t)})" class="${isOverdue(t) ? 'row-ov' : ''}">
          <td class="td-main"><span>${t.name}</span></td>
          <td><span class="ptag"><span class="pdot" style="background:${pColor(t.project)}"></span>${t.project || '—'}</span></td>
          <td>${statusBadge(t)}</td>
          <td>${priBadge(t.priority)}</td>
          <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${calcProgress(t)}%;background:${pCol(calcProgress(t))}"></div></div><span class="prog-pct">${calcProgress(t)}%</span></div></td>
          <td class="td-mono" style="color:var(--text2)">${t.startDate ? fmtDate(t.startDate) : '—'}</td>
          <td class="td-mono">
            <div style="color:${taskDateStatus(t).color};font-weight:500">${t.due ? fmtDate(t.due) : '—'}</div>
            <div style="font-size:9.5px;color:${taskDateStatus(t).color};margin-top:2px">${taskDateStatus(t).icon} ${taskDateStatus(t).label}</div>
          </td>
          <td class="td-mono">${t.hours ? t.hours + 'h' : '—'}</td>
        </tr>`).join('');
    }).join('')}</tbody></table>
    </div></div>`;
  }

  // ── TASK PLANNER (default) ──
  return `<div style="padding:16px 24px" id="taskTableWrap">
    <div class="table-card">
      ${toolbarHTML}
      <div class="task-title-sticky" style="top:53px">
        <div class="table-header" style="border-radius:0;border-top:none"><div class="table-title">📋 Task Planner <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${list.length} tasks</span></div></div>
      </div>
      <table>
        <thead class="task-thead-sticky">
          <tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Phase</th><th title="Progress is auto-calculated from Phase + Status.&#10;Phase sets the base: Initiation 5% · Planning 20% · Execution 50% · Review 72% · Launch 88% · Completed 100%&#10;Status adjusts within each phase: Not Started = base % · In Progress = +5–10% · On Hold = +3–5% · Complete = +10–15%" style="cursor:help">Progress ❗</th><th>Start Date</th><th>Due Date</th><th>Linked Budget</th></tr>
        </thead>
        <tbody id="taskTbody">${renderTaskRows(list)}</tbody>
      </table>
    </div>
  </div>`;
}