import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { pColor, fmtCur, budget_status, safeJSON } from '../utils.js';
import { openDetail, openAddForm } from '../components/modal.js';

/* ══════════════════════════════════════════════════
   RENDERER — Budgets
   ══════════════════════════════════════════════════ */

export async function renderBudgets(sub) {
  let list = [...DATA.budgets];
  if (AppState.sbProject) list = list.filter(b => b.project === AppState.sbProject);
  if (AppState.sbStatus) {
    if (AppState.sbStatus === 'Over Budget') list = list.filter(b => b.spend > b.target);
    else if (AppState.sbStatus === 'Under Budget') list = list.filter(b => b.spend < b.target);
    else if (AppState.sbStatus === 'Meets Budget') list = list.filter(b => b.spend === b.target);
  }
  if (sub === 0) list = list.filter(b => DATA.projects.find(p => p.name === b.project && p.active && !p.completed));
  if (sub === 1) list = list.filter(b => DATA.projects.find(p => p.name === b.project && p.completed));

  const totalTarget = list.reduce((s, b) => s + b.target, 0);
  const totalSpend = list.reduce((s, b) => s + b.spend, 0);
  const over = list.filter(b => b.spend > b.target).length;
  const meets = list.filter(b => b.spend === b.target).length;
  const under = list.filter(b => b.spend < b.target).length;

  return `<div style="padding:20px 24px">
    <div class="page-banner"><div class="page-banner-icon">💰</div><div><h2>${sub === 0 ? 'Active Budgets' : sub === 1 ? 'Closed Budgets' : 'All Budgets'}</h2><p>Track spend vs target budget across all projects and milestones.</p></div><div style="margin-left:auto"><button class="btn btn-primary" onclick="openAddForm('budget')">+ New Budget</button></div></div>
    <div class="dash-grid" style="margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-label">Total Target Budget</div><div class="kpi-value" style="font-size:20px;color:var(--accent)">${fmtCur(totalTarget)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total Spend</div><div class="kpi-value" style="font-size:20px;color:${totalSpend > totalTarget ? 'var(--red)' : 'var(--green)'}">${fmtCur(totalSpend)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Variance</div><div class="kpi-value" style="font-size:20px;color:${totalSpend > totalTarget ? 'var(--red)' : 'var(--green)'}">${totalSpend > totalTarget ? '−' : '+'}${fmtCur(Math.abs(totalSpend - totalTarget))}</div><div class="kpi-sub">${totalSpend > totalTarget ? 'Over' : 'Under'} target budget</div></div>
      <div class="kpi-card">
        <div class="kpi-label">Budget Status</div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--red)">⬆ Over budget</span><span class="td-mono" style="color:var(--red)">${over}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--blue)">✓ Meets budget</span><span class="td-mono" style="color:var(--blue)">${meets}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--green)">⬇ Under budget</span><span class="td-mono" style="color:var(--green)">${under}</span></div>
        </div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-header table-title-sticky"><div class="table-title">💰 Budget Lines <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${list.length} items</span></div></div>
      <table><thead class="table-thead-sticky"><tr><th>Budget</th><th>Project</th><th>Milestone</th><th>Type</th><th>Target Budget</th><th>Spend</th><th>Variance</th><th>Status</th></tr></thead>
      <tbody>${list.map(b => {
    const v = b.spend - b.target;
    return `<tr onclick="openDetail('budget',${safeJSON(b)})">
          <td class="td-main"><span>${b.name}</span></td>
          <td><span class="ptag"><span class="pdot" style="background:${pColor(b.project)}"></span>${b.project || '—'}</span></td>
          <td style="font-size:12px;color:var(--text2)">${b.milestone || '—'}</td>
          <td><span class="badge b-grey">${b.type || 'Fixed'}</span></td>
          <td class="td-mono">${fmtCur(b.target)}</td>
          <td class="td-mono" style="color:${b.spend > b.target ? 'var(--red)' : b.spend < b.target ? 'var(--green)' : 'var(--blue)'}">${fmtCur(b.spend)}</td>
          <td class="td-mono" style="color:${v > 0 ? 'var(--red)' : v < 0 ? 'var(--green)' : 'var(--blue)'}">${v > 0 ? '−' : v < 0 ? '+' : ''}${fmtCur(Math.abs(v))}</td>
          <td>${budget_status(b)}</td>
        </tr>`;
  }).join('')}</tbody></table>
    </div>
  </div>`;
}