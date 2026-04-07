import { DATA } from '../storage.js';
import { isOverdue, fmtDate, pCol, pColor, projStatusBadge, statusBadge, meetType, fmtCur, safeJSON, taskDateStatus, calcProgress, getProjectStats } from '../utils.js';
import { switchTab } from '../router.js';
import { openDetail } from '../components/modal.js';

/* ══════════════════════════════════════════════════
   RENDERER — Dashboard
   ══════════════════════════════════════════════════ */

let completionChartInstance = null;
let budgetChartInstance = null;
let donutChartInstance = null;

/* ── CHART 1 — Task Completion by Month ── */
export function initCompletionChart() {
  const canvas = document.getElementById('completionChart');
  if (!canvas) return;
  if (completionChartInstance) { completionChartInstance.destroy(); completionChartInstance = null; }

  const C_BORDER = '#2a2a30';
  const C_SURFACE2 = '#1c1c20';
  const C_TEXT = '#f2f2f6';
  const C_TEXT2 = '#9898aa';
  const C_TEXT3 = '#55556a';
  const C_GRID = '#2a2a30';

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() });
  }

  const counts = months.map(m =>
    DATA.tasks.filter(t =>
      t.status === 'Complete' && t.due &&
      new Date(t.due).getFullYear() === m.year &&
      new Date(t.due).getMonth() === m.month
    ).length
  );

  completionChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Tasks Completed',
        data: counts,
        backgroundColor: 'rgba(62,207,142,0.7)',
        hoverBackgroundColor: '#3ecf8e',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: C_SURFACE2, borderColor: C_BORDER, borderWidth: 1,
          titleColor: C_TEXT, bodyColor: C_TEXT2,
          callbacks: { label: ctx => `  ${ctx.parsed.y} task${ctx.parsed.y !== 1 ? 's' : ''} completed` }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: C_TEXT2, font: { family: 'DM Sans', size: 11 } } },
        y: { grid: { color: C_GRID, drawTicks: false }, border: { display: false }, ticks: { color: C_TEXT3, font: { family: 'DM Mono', size: 10 }, stepSize: 1, padding: 8 }, beginAtZero: true }
      },
      animation: { duration: 700, easing: 'easeOutQuart' }
    }
  });
}

/* ── CHART 2 — Budget Burn Rate ── */
export function initBudgetChart() {
  const canvas = document.getElementById('budgetChart');
  if (!canvas) return;
  if (budgetChartInstance) { budgetChartInstance.destroy(); budgetChartInstance = null; }

  const C_BORDER = '#2a2a30';
  const C_SURFACE2 = '#1c1c20';
  const C_TEXT = '#f2f2f6';
  const C_TEXT2 = '#9898aa';
  const C_TEXT3 = '#55556a';
  const C_GRID = '#2a2a30';

  const projects = DATA.projects.filter(p => (p.target || 0) > 0 || DATA.budgets.filter(b => b.project === p.name).length > 0);
  const labels = projects.map(p => p.name);
  const targets = projects.map(p => p.target || 0);
  const spends = projects.map(p => {
    const projectSpend = p.spend || 0;
    const itemSpend = DATA.budgets.filter(b => b.project === p.name).reduce((s, b) => s + (b.spend || 0), 0);
    return projectSpend + itemSpend;
  });
  const spendColors = projects.map((p, i) => spends[i] > targets[i] ? 'rgba(240,82,82,0.8)' : 'rgba(124,111,255,0.8)');
  const spendHover = projects.map((p, i) => spends[i] > targets[i] ? '#f05252' : '#7c6fff');

  budgetChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Target Budget', data: targets, backgroundColor: 'rgba(96,165,250,0.2)', hoverBackgroundColor: 'rgba(96,165,250,0.4)', borderRadius: 4, borderSkipped: false },
        { label: 'Actual Spend', data: spends, backgroundColor: spendColors, hoverBackgroundColor: spendHover, borderRadius: 4, borderSkipped: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: true, position: 'top', labels: { color: C_TEXT2, font: { family: 'DM Sans', size: 11 }, boxWidth: 12, padding: 16 } },
        tooltip: {
          backgroundColor: C_SURFACE2, borderColor: C_BORDER, borderWidth: 1,
          titleColor: C_TEXT, bodyColor: C_TEXT2,
          callbacks: { label: ctx => `  ${ctx.dataset.label}: $${Number(ctx.parsed.x).toLocaleString()}` }
        }
      },
      scales: {
        x: { grid: { color: C_GRID, drawTicks: false }, border: { display: false }, ticks: { color: C_TEXT3, font: { family: 'DM Mono', size: 10 }, padding: 8, callback: v => '$' + Number(v).toLocaleString() } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: C_TEXT2, font: { family: 'DM Sans', size: 11 } } }
      },
      animation: { duration: 700, easing: 'easeOutQuart' }
    }
  });
}

/* ── CHART 3 — Task Status Donut ── */
export function initDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }

  const C_BORDER = '#2a2a30';
  const C_SURFACE2 = '#1c1c20';
  const C_TEXT = '#f2f2f6';
  const C_TEXT2 = '#9898aa';

  const complete = DATA.tasks.filter(t => t.status === 'Complete').length;
  const inProgress = DATA.tasks.filter(t => t.status === 'In Progress').length;
  const onHold = DATA.tasks.filter(t => t.status === 'On Hold').length;
  const notStarted = DATA.tasks.filter(t => t.status === 'Not Started').length;
  const overdue = DATA.tasks.filter(t => isOverdue(t)).length;
  const total = DATA.tasks.length;

  donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Complete', 'In Progress', 'On Hold', 'Not Started', 'Overdue'],
      datasets: [{
        data: [complete, inProgress, onHold, notStarted, overdue],
        backgroundColor: ['#3ecf8e', '#f5a623', '#60a5fa', '#2c2c32', '#f05252'],
        hoverBackgroundColor: ['#4eddA0', '#ffb83f', '#7cb8ff', '#38383f', '#ff6b6b'],
        borderColor: '#151518',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: true, position: 'right', labels: { color: C_TEXT2, font: { family: 'DM Sans', size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: {
          backgroundColor: C_SURFACE2, borderColor: C_BORDER, borderWidth: 1,
          titleColor: C_TEXT, bodyColor: C_TEXT2,
          callbacks: {
            label: ctx => {
              const pct = total ? Math.round(ctx.parsed / total * 100) : 0;
              return `  ${ctx.label}: ${ctx.parsed} tasks (${pct}%)`;
            }
          }
        }
      },
      animation: { duration: 700, easing: 'easeOutQuart' }
    },
    plugins: [{
      id: 'centerLabel',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        ctx.save();
        const cx = left + (width - (chart.legend?.width || 0)) / 2;
        const cy = top + height / 2;
        ctx.font = `700 28px "Syne", sans-serif`;
        ctx.fillStyle = C_TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy - 8);
        ctx.font = `400 11px "DM Mono", monospace`;
        ctx.fillStyle = C_TEXT2;
        ctx.fillText('total tasks', cx, cy + 14);
        ctx.restore();
      }
    }]
  });
}

export function renderDashboard() {
  const allTasks = DATA.tasks, projects = DATA.projects;
  const done = allTasks.filter(t => t.status === 'Complete').length;
  const inProg = allTasks.filter(t => t.status === 'In Progress').length;
  const overdue = allTasks.filter(t => isOverdue(t)).length;
  const activeProj = projects.filter(p => p.active && !p.completed).length;
  const avgP = allTasks.length ? Math.round(allTasks.reduce((s, t) => s + calcProgress(t), 0) / allTasks.length) : 0;
  const totalTarget = DATA.projects.reduce((s, p) => s + (p.target || 0), 0);
  const totalSpend = DATA.projects.reduce((s, p) => {
    const projectSpend = p.spend || 0;
    const itemSpend = DATA.budgets.filter(b => b.project === p.name).reduce((a, b) => a + (b.spend || 0), 0);
    return s + projectSpend + itemSpend;
  }, 0);
  const recentTasks = allTasks.filter(t => t.status !== 'Complete').sort((a, b) => (a.due || '9999') > (b.due || '9999') ? 1 : -1).slice(0, 6);
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = DATA.meetings.filter(m => m.date >= todayStr).sort((a, b) => a.date > b.date ? 1 : -1).slice(0, 4);

  return `
  <div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon"><img src="assets/Project book Image.png" style="width:120px;height:120px;object-fit:contain;" /></div>
      <div>
        <h2>Welcome back!</h2>
        <p>A centralised workspace designed to support the effective management of your projects.</p>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text3)">${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="kpi-card">
        <div class="kpi-label">Active Projects</div>
        <div class="kpi-value" style="color:var(--accent)">${activeProj}</div>
        <div class="kpi-sub">${projects.filter(p => p.completed).length} completed</div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${projects.length ? Math.round(activeProj / projects.length * 100) : 0}%;background:var(--accent)"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tasks Complete</div>
        <div class="kpi-value" style="color:var(--green)">${done}</div>
        <div class="kpi-sub">${allTasks.length} total · ${inProg} in progress</div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${allTasks.length ? Math.round(done / allTasks.length * 100) : 0}%;background:var(--green)"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tasks Overdue</div>
        <div class="kpi-value" style="color:${overdue ? 'var(--red)' : 'var(--text)'}">${overdue}</div>
        <div class="kpi-sub">Overall progress: ${avgP}%</div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${avgP}%;background:${pCol(avgP)}"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Spend</div>
        <div class="kpi-value" style="color:var(--yellow);font-size:20px">${fmtCur(totalSpend)}</div>
        <div class="kpi-sub">Target budget: ${fmtCur(totalTarget)}</div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${totalTarget ? Math.min(100, Math.round(totalSpend / totalTarget * 100)) : 0}%;background:var(--yellow)"></div></div>
      </div>
    </div>

    <div class="table-card" style="margin-bottom:20px">
      <div class="table-header">
        <div class="table-title">📅 Upcoming Meetings</div>
        <button class="btn btn-ghost btn-sm" onclick="switchTab('meetings')">View all</button>
      </div>
      <table><thead><tr><th>Meeting</th><th>Category</th><th>Project</th><th>Date</th><th>Type</th><th>Next Steps</th></tr></thead>
      <tbody>${upcomingMeetings.length ? upcomingMeetings.map(m => `
        <tr onclick="openDetail('meeting',${safeJSON(m)})">
          <td class="td-main"><span>${m.name}</span></td>
          <td><span class="badge ${m.project ? 'b-accent' : 'b-grey'}">${m.project ? '📁 Project' : '🏢 Internal'}</span></td>
          <td><span class="ptag"><span class="pdot" style="background:${pColor(m.project)}"></span>${m.project || '—'}</span></td>
          <td class="td-mono">${fmtDate(m.date)}</td>
          <td><span class="badge ${meetType(m.type)}">${m.type}</span></td>
          <td style="font-size:11.5px;color:var(--text3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.nextSteps || '—'}</td>
        </tr>
      `).join('') : '<tr><td colspan="6" style="padding:16px 18px;color:var(--text3);font-size:12px">No upcoming meetings scheduled.</td></tr>'}</tbody></table>
    </div>

    <div class="col-2" style="gap:16px;margin-bottom:20px">
      <div>
        <div class="table-card">
          <div class="table-header">
            <div class="table-title">⚡ Priority Tasks</div>
            <button class="btn btn-ghost btn-sm" onclick="switchTab('tasks')">View all</button>
          </div>
          <table><thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>${recentTasks.map(t => `
            <tr onclick="openDetail('task',${safeJSON(t)})">
              <td class="td-main"><span>${t.name}</span></td>
              <td><span class="ptag"><span class="pdot" style="background:${pColor(t.project)}"></span>${t.project || '—'}</span></td>
              <td>${statusBadge(t)}</td>
              <td class="td-mono">
                <div style="color:${taskDateStatus(t).color};font-weight:500">${t.due ? fmtDate(t.due) : '—'}</div>
                <div style="font-size:9.5px;color:${taskDateStatus(t).color};margin-top:2px">${taskDateStatus(t).icon} ${taskDateStatus(t).label}</div>
              </td>
            </tr>
          `).join('')}</tbody></table>
        </div>
      </div>
      <div>
        <div class="table-card">
          <div class="table-header">
            <div class="table-title">📁 Projects Overview</div>
            <button class="btn btn-ghost btn-sm" onclick="switchTab('projects')">View all</button>
          </div>
          <table><thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Tasks</th></tr></thead>
          <tbody>${projects.slice(0, 6).map(p => {
    const s = getProjectStats(p, DATA.tasks, DATA.budgets);
    return `<tr onclick="switchTab('projects')">
              <td class="td-main"><span style="display:flex;align-items:center;gap:6px"><span class="pdot" style="background:${pColor(p.name)}"></span>${p.name}</span></td>
              <td>${projStatusBadge(p.status)}</td>
              <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${s.pct}%;background:${pCol(s.pct)}"></div></div><span class="prog-pct">${s.pct}%</span></div></td>
              <td class="td-mono">${s.tasksDone}/${s.tasksTotal}</td>
            </tr>`;
  }).join('')}</tbody></table>
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