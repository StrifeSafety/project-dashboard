import { DATA } from '../storage.js';
import { isOverdue, fmtCur, pColor, meetType, getProjectStats } from '../utils.js';
import { initCompletionChart, initBudgetChart, initDonutChart } from './dashboard.js';

/* ══════════════════════════════════════════════════
   RENDERER — Statistics
   ══════════════════════════════════════════════════ */

export function renderStatistics(sub) {
  const tasks = DATA.tasks, projects = DATA.projects, budgets = DATA.budgets, meetings = DATA.meetings, stk = DATA.stakeholders;
  const done = tasks.filter(t => t.status === 'Complete').length;
  const inProg = tasks.filter(t => t.status === 'In Progress').length;
  const notStarted = tasks.filter(t => t.status === 'Not Started').length;
  const onHold = tasks.filter(t => t.status === 'On Hold').length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const activeP = projects.filter(p => p.active && !p.completed).length;
  const completedP = projects.filter(p => p.completed).length;
  const totalTarget = projects.reduce((s, p) => s + (p.target || 0), 0);
  const totalSpend = projects.reduce((s, p) => {
    const projectSpend = p.spend || 0;
    const itemSpend = budgets.filter(b => b.project === p.name).reduce((a, b) => a + (b.spend || 0), 0);
    return s + projectSpend + itemSpend;
  }, 0);
  const teamM = stk.filter(s => s.category === 'Team').length;
  const clientM = stk.filter(s => s.category === 'Clients').length;
  const contractorM = stk.filter(s => s.category === 'Contractor').length;
  const consultantM = stk.filter(s => s.category === 'Consultant').length;
  const inspectorM = stk.filter(s => s.category === 'Inspector').length;
  const governmentM = stk.filter(s => s.category === 'Government').length;
  const investorM = stk.filter(s => s.category === 'Investors').length;

  return `<div style="padding:20px 24px">
    <div class="page-banner"><div class="page-banner-icon">📊</div><div><h2>Statistics & KPIs</h2><p>Get a clear overview of key project, budget, stakeholder and meeting metrics.</p></div></div>

    <div class="stats-grid">
      <div class="stat-section">
        <div class="stat-section-title">✅ Task Summary</div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-green">✓ Complete</span></div><div class="stat-row-val">${done}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-yellow">◉ In Progress</span></div><div class="stat-row-val">${inProg}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-grey">○ Not Started</span></div><div class="stat-row-val">${notStarted}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-blue">⏸ On Hold</span></div><div class="stat-row-val">${onHold}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-red">⚠ Overdue</span></div><div class="stat-row-val" style="color:${overdue ? 'var(--red)' : 'var(--text)'}">${overdue}</div></div>
        <div class="stat-row"><div class="stat-row-label">Total Tasks</div><div class="stat-row-val">${tasks.length}</div></div>
      </div>

      <div class="stat-section">
        <div class="stat-section-title">📁 Project Scorecard</div>
        ${projects.map(p => {
          const projTasks = tasks.filter(t => t.project === p.name);
          const projDone = projTasks.filter(t => t.status === 'Complete').length;
          const projOverdue = projTasks.filter(t => isOverdue(t)).length;
          const pct = projTasks.length ? Math.round(projDone / projTasks.length * 100) : 0;
          const progColor = pct === 100 ? 'var(--green)' : projOverdue > 0 ? 'var(--red)' : 'var(--accent)';
          const dueLabel = p.endDate ? (() => {
            const d = new Date(p.endDate);
            return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
          })() : '—';
          return `<div class="stat-row" style="padding:6px 0;align-items:center">
            <div class="stat-row-label" style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${pColor(p.name)};display:inline-block;flex-shrink:0"></span>
              ${p.name}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:60px;height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${progColor};border-radius:2px"></div>
                </div>
                <span style="font-size:10px;color:var(--text3);min-width:28px;text-align:right">${pct}%</span>
              </div>
              <span style="font-size:10px;color:var(--text3)">Due: ${dueLabel} · <span style="color:${projOverdue > 0 ? 'var(--red)' : 'var(--green)'}">${projOverdue} overdue</span></span>
            </div>
          </div>`;
        }).join('')}
        <div style="height:1px;background:var(--border);margin:10px 0"></div>
        <div class="stat-row"><div class="stat-row-label">Total Tasks</div><div class="stat-row-val">${tasks.length}</div></div>
        <div class="stat-row"><div class="stat-row-label">Total Overdue</div><div class="stat-row-val" style="color:${overdue > 0 ? 'var(--red)' : 'var(--green)'}">${overdue}</div></div>
        <div class="stat-row"><div class="stat-row-label">Completed Projects</div><div class="stat-row-val" style="color:var(--green)">${completedP}</div></div>
        <div class="stat-row"><div class="stat-row-label">Active Projects</div><div class="stat-row-val" style="color:var(--accent)">${activeP}</div></div>
      </div>
    </div>

    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header table-title-sticky">
        <div class="table-title">💰 Budget Health by Project <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:400;color:var(--text3)">click row to expand budget items</span></div>
      </div>
      <table><thead class="table-thead-sticky"><tr><th></th><th>Project</th><th>Budget</th><th>Project Spend</th><th>Allocated</th><th>Sub-budget Spend</th><th>Total Spent</th><th>Unallocated</th><th>Variance</th><th>% Used</th><th>Health</th></tr></thead>
      <tbody>${projects.map(p => {
        const projectTarget = p.target || 0;
        const projectSpend = p.spend || 0;
        const projBudgets = budgets.filter(b => b.project === p.name);
        const itemsTarget = projBudgets.reduce((s, b) => s + (b.target || 0), 0);
        const itemsSpend = projBudgets.reduce((s, b) => s + (b.spend || 0), 0);
        const combinedSpend = projectSpend + itemsSpend;
        const unallocated = Math.max(0, projectTarget - itemsTarget);
        const variance = projectTarget - combinedSpend;
        const pctUsed = projectTarget ? Math.round(combinedSpend / projectTarget * 100) : 0;
        const health = pctUsed > 100 ? { label: '🔴 Over Budget', color: 'var(--red)' } : pctUsed >= 90 ? { label: '🟠 Critical', color: 'var(--orange)' } : pctUsed >= 75 ? { label: '🟡 Watch', color: 'var(--yellow)' } : { label: '🟢 Healthy', color: 'var(--green)' };
        const rowId = 'bh-' + p.id;
        return `<tr style="cursor:pointer" onclick="document.getElementById('${rowId}').style.display=document.getElementById('${rowId}').style.display==='none'?'':'none';this.querySelector('.bh-arrow').textContent=document.getElementById('${rowId}').style.display===''?'▾':'▸'">
          <td style="width:24px;text-align:center;color:var(--text3);font-size:11px"><span class="bh-arrow">${projBudgets.length ? '▸' : ''}</span></td>
          <td class="td-main"><span style="display:flex;align-items:center;gap:6px"><span class="pdot" style="background:${pColor(p.name)}"></span>${p.name}</span></td>
          <td class="td-mono">${fmtCur(projectTarget)}</td>
          <td class="td-mono" style="color:var(--text2)">${fmtCur(projectSpend)}</td>
          <td class="td-mono" style="color:${itemsTarget > projectTarget ? 'var(--red)' : 'var(--text2)'}">${fmtCur(itemsTarget)}</td>
          <td class="td-mono" style="color:var(--text2)">${fmtCur(itemsSpend)}</td>
          <td class="td-mono" style="color:${combinedSpend > projectTarget ? 'var(--red)' : 'var(--green)'}"><strong>${fmtCur(combinedSpend)}</strong></td>
          <td class="td-mono" style="color:var(--text3)">${fmtCur(unallocated)}</td>
          <td class="td-mono" style="color:${variance < 0 ? 'var(--red)' : 'var(--green)'}">${variance < 0 ? '−' : '+'}${fmtCur(Math.abs(variance))}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;min-width:60px">
                <div style="height:100%;width:${Math.min(100, pctUsed)}%;background:${health.color};border-radius:3px"></div>
              </div>
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:${health.color};min-width:32px">${pctUsed}%</span>
            </div>
          </td>
          <td><span style="font-size:12px;color:${health.color}">${health.label}</span></td>
        </tr>
        ${projBudgets.length ? `<tr id="${rowId}" style="display:none">
          <td colspan="11" style="padding:0 0 0 40px;background:var(--surface2)">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead><tr>
                <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)">Item</th>
                <th style="padding:6px 10px;text-align:right;font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)">Target</th>
                <th style="padding:6px 10px;text-align:right;font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)">Spend</th>
                <th style="padding:6px 10px;text-align:right;font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)">Status</th>
              </tr></thead>
              <tbody>${projBudgets.map(b => {
                const bv = b.spend - b.target;
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:6px 10px;font-weight:500;color:var(--text)">${b.name}</td>
                  <td style="padding:6px 10px;text-align:right;font-family:'DM Mono',monospace;color:var(--text3)">${fmtCur(b.target)}</td>
                  <td style="padding:6px 10px;text-align:right;font-family:'DM Mono',monospace;color:${bv > 0 ? 'var(--red)' : 'var(--green)'}">${fmtCur(b.spend)}</td>
                  <td style="padding:6px 10px;text-align:right"><span class="badge ${bv > 0 ? 'b-red' : 'b-green'}" style="font-size:9px">${bv > 0 ? '⬆' : '⬇'} ${fmtCur(Math.abs(bv))}</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </td>
        </tr>` : ''}`;
      }).join('')}
      </tbody></table>
    </div>

    <div class="col-2" style="gap:14px">
      <div class="stat-section">
        <div class="stat-section-title">📅 Meetings Summary</div>
        <div class="stat-row"><div class="stat-row-label">Total Meetings</div><div class="stat-row-val">${meetings.length}</div></div>
        <div class="stat-row"><div class="stat-row-label">Project Meetings</div><div class="stat-row-val">${meetings.filter(m => m.project).length}</div></div>
        <div class="stat-row"><div class="stat-row-label">Internal Meetings</div><div class="stat-row-val">${meetings.filter(m => !m.project).length}</div></div>
        ${['Online', 'Offline', 'Daily', 'Weekly', 'Training'].map(t => `<div class="stat-row"><div class="stat-row-label"><span class="badge ${meetType(t)}">${t}</span></div><div class="stat-row-val">${meetings.filter(m => m.type === t).length}</div></div>`).join('')}
      </div>
      <div class="stat-section">
        <div class="stat-section-title">📋 Documents Summary</div>
        <div class="stat-row"><div class="stat-row-label">Total Documents</div><div class="stat-row-val">${DATA.documents.length}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-green">✓ Approved</span></div><div class="stat-row-val">${DATA.documents.filter(d => d.status === 'Approved').length}</div></div>
        <div class="stat-row"><div class="stat-row-label"><span class="badge b-grey">✏ Draft</span></div><div class="stat-row-val">${DATA.documents.filter(d => d.status === 'Draft').length}</div></div>
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
          <div class="stat-section-title" style="font-size:11px;margin-bottom:8px">By Phase</div>
          ${['Initiation', 'Planning', 'Execution', 'Launch'].map(ph => `<div class="chart-bar-row"><div class="chart-bar-label">${ph}</div><div class="chart-bar-track"><div class="chart-bar-fill" style="width:${DATA.documents.filter(d => d.phase === ph).length / (DATA.documents.length || 1) * 100}%;background:var(--accent)"></div></div><div class="chart-bar-val">${DATA.documents.filter(d => d.phase === ph).length}</div></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="col-2" style="gap:16px;margin-bottom:16px">
      <div class="table-card" style="margin-bottom:0">
        <div class="table-header">
          <div class="table-title">📅✔️ Task Completion by Month <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:400;color:var(--text3)">Last 6 months</span></div>
        </div>
        <div style="padding:16px 20px;height:220px;position:relative">
          <canvas id="completionChart"></canvas>
        </div>
      </div>
      <div class="table-card" style="margin-bottom:0">
        <div class="table-header">
          <div class="table-title">⭕ Task Status <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:400;color:var(--text3)">Distribution</span></div>
        </div>
        <div style="padding:16px 20px;height:220px;position:relative">
          <canvas id="donutChart"></canvas>
        </div>
      </div>
    </div>

    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header">
        <div class="table-title">💰🔥 Budget Burn Rate <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:400;color:var(--text3)">Spend vs Target by Project</span></div>
      </div>
      <div style="padding:16px 20px;height:${DATA.projects.length * 52 + 40}px;position:relative">
        <canvas id="budgetChart"></canvas>
      </div>
    </div>
  </div>`;
}