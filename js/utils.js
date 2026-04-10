export { pColor } from './state.js';

/* ══════════════════════════════════════════════════
   UTILITIES — Shared helpers, badge builders, formatters
   ══════════════════════════════════════════════════ */

export const isOverdue = t => t.due && t.status !== 'Complete' && new Date(t.due) < new Date(new Date().toDateString());

export const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const pBar = (p, len = 8) => {
  p = Math.min(100, Math.max(0, p || 0));
  const f = Math.round(p / 100 * len);
  return '▓'.repeat(f) + '░'.repeat(len - f) + ' ' + p + '%';
};

export const pCol = p => p >= 80 ? 'var(--green)' : p >= 40 ? 'var(--yellow)' : 'var(--accent)';

export const statusIcon = s => ({
  'Complete': '✅', 'In Progress': '🔃', 'Not Started': '⚪', 'On Hold': '⏸️',
  'Active': '●', 'Planning': '🧾', 'Execution': '🛠️', 'Initiation': '▶️',
  'Completed': '✅', 'Draft': '📙', 'Approved': '✅', 'Review': '🔍',
  'Under Budget': '⬇', 'Meets Budget': '✓', 'Over Budget': '⬆',
  'Current': '📗', 'Superseded': '📕'
}[s] || '○');

export const statusBadge = t => {
  if (isOverdue(t)) return `<span class="badge b-red">⚠️ Overdue</span>`;
  const m = { 'Complete': 'b-green', 'In Progress': 'b-yellow', 'Not Started': 'b-grey', 'On Hold': 'b-blue' };
  return `<span class="badge ${m[t.status] || 'b-grey'}">${statusIcon(t.status)} ${t.status}</span>`;
};

export const projStatusBadge = s => {
  const m = { 'Execution': 'b-yellow', 'Planning': 'b-blue', 'Initiation': 'b-purple', 'Completed': 'b-green', 'On Hold': 'b-grey' };
  return `<span class="badge ${m[s] || 'b-grey'}">${s}</span>`;
};

export const priBadge = p => {
  if (!p) return '';
  const m = { 'High': 'b-red', 'Medium': 'b-orange', 'Low': 'b-blue' };
  return `<span class="badge ${m[p] || 'b-grey'}">${p === 'High' ? '🔥' : p === 'Medium' ? '🟠' : '🔵'} ${p}</span>`;
};

export const docBadge = s => s === 'Approved'
  ? `<span class="badge b-green">✓ Approved</span>`
  : `<span class="badge b-grey">✏ ${s}</span>`;

export const docIcon = n => ({
  'Project Charter': '📋', 'Stakeholder Analysis': '👥', 'Risk Mitigation Plan': '⚠️',
  'Risk Management Plan': '⚠️', 'Statement of Work': '📝', 'Project Schedule': '📅',
  'Communication Plan': '📣', 'Retrospective': '🔄', 'Closeout Report': '🏁',
  'Budget': '💰', 'Impact Report': '📈'
}[n] || '📄');

export const fmtCur = v => '$' + Number(v || 0).toLocaleString();

export const budget_status = b => {
  const v = b.spend - b.target;
  const abs = Math.abs(v);
  if (v > 0) return `<span class="badge b-red">⬆ ${fmtCur(abs)} over</span>`;
  if (v === 0) return `<span class="badge b-blue">✓ Meets budget</span>`;
  return `<span class="badge b-green">⬇ ${fmtCur(abs)} under</span>`;
};

export const meetType = t => ({
  'Offline': 'b-blue', 'Online': 'b-accent', 'Daily': 'b-green',
  'Weekly': 'b-yellow', 'Training': 'b-purple', 'Monthly': 'b-orange'
}[t] || 'b-grey');

export const avatarColor = n => {
  const colors = ['#7c6fff', '#3ecf8e', '#f5a623', '#60a5fa', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9'];
  let h = 0;
  for (const c of (n || '?')) h += c.charCodeAt(0);
  return colors[h % colors.length];
};

export const initials = n => (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* Form value helpers */
export const gv = id => document.getElementById(id)?.value.trim() || '';
export const gn = id => parseFloat(document.getElementById(id)?.value) || 0;

/* Safe JSON for onclick attributes */
export const safeJSON = obj => JSON.stringify(obj).replace(/"/g, '&quot;');

/* Compute live project stats from tasks and budgets arrays */
export const getProjectStats = (p, tasks, budgets) => {
  const projTasks = tasks.filter(t => t.project === p.name);
  const projBudgets = budgets.filter(b => b.project === p.name);
  const tasksDone = projTasks.filter(t => t.status === 'Complete').length;
  const tasksTotal = projTasks.length;
  const tasksOverdue = projTasks.filter(t => isOverdue(t)).length;
  const totalSpend = projBudgets.reduce((s, b) => s + (b.spend || 0), 0);
  const totalTarget = projBudgets.reduce((s, b) => s + (b.target || 0), 0);
  const pct = tasksTotal ? Math.round(tasksDone / tasksTotal * 100) : 0;
  const ov = totalSpend - totalTarget;
  return { tasksDone, tasksTotal, tasksOverdue, totalSpend, totalTarget, pct, ov };
};

/* Auto calculate progress from phase and status combination */
export const calcProgress = t => {
  const phase = t.phase || '';
  const status = t.status || 'Not Started';

  if (phase === 'Completed') return 100;

  const matrix = {
    'Initiation':  { 'Not Started': 5,  'In Progress': 10, 'On Hold': 8,  'Complete': 15  },
    'Planning':    { 'Not Started': 20, 'In Progress': 30, 'On Hold': 25, 'Complete': 40  },
    'Execution':   { 'Not Started': 50, 'In Progress': 60, 'On Hold': 55, 'Complete': 70  },
    'Review':      { 'Not Started': 72, 'In Progress': 80, 'On Hold': 75, 'Complete': 88  },
    'Launch':      { 'Not Started': 88, 'In Progress': 90, 'On Hold': 89, 'Complete': 95  },
  };

  if (matrix[phase]) return matrix[phase][status] ?? matrix[phase]['Not Started'];

  /* No phase set — fall back to status only */
  const noPhase = { 'Not Started': 0, 'In Progress': 50, 'On Hold': 25, 'Complete': 100 };
  return noPhase[status] ?? 0;
};

/* Compute rich date status for a task using all three dates */
export const taskDateStatus = t => {
  const today = new Date(new Date().toDateString());
  const due = t.due ? new Date(t.due + 'T00:00:00') : null;
  const actual = t.actualCompletion ? new Date(t.actualCompletion + 'T00:00:00') : null;

  if (t.status === 'Complete') {
    if (actual && due) {
      const diffDays = Math.round((actual - due) / 86400000);
      if (diffDays > 0) return { label: `Completed ${diffDays}d late`, color: 'var(--red)', icon: '⚠️' };
      if (diffDays === 0) return { label: 'Completed on time', color: 'var(--green)', icon: '✅' };
      return { label: `Completed ${Math.abs(diffDays)}d early`, color: 'var(--green)', icon: '✅' };
    }
    return { label: 'Complete', color: 'var(--green)', icon: '✅' };
  }

  if (due) {
    const diffDays = Math.round((today - due) / 86400000);
    if (diffDays > 0) return { label: `${diffDays}d overdue`, color: 'var(--red)', icon: '⚠️' };
    if (diffDays === 0) return { label: 'Due today', color: 'var(--yellow)', icon: '⏰' };
    return { label: `${Math.abs(diffDays)}d remaining`, color: 'var(--green)', icon: '📅' };
  }

  return { label: 'No due date', color: 'var(--text3)', icon: '—' };
};

/* Compute "X days ago" from a date string field lastContactDate */
export const fmtLastContact = s => {
  if (!s || !s.lastContactDate) return '—';
  const diff = Math.floor((new Date() - new Date(s.lastContactDate + 'T00:00:00')) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return diff + ' days ago';
};

/* Shared loading state */
export const renderLoading = (message = 'Loading...') => `
  <div style="padding:60px;text-align:center;color:var(--text3);font-size:13px">
    <div style="font-size:28px;margin-bottom:12px;animation:spin 1s linear infinite;display:inline-block">⏳</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text3)">${message}</div>
  </div>`;

/* Shared empty state */
export const renderEmpty = (icon = '📭', title = 'Nothing here yet', message = '') => `
  <div class="empty">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${message ? `<div style="font-size:13px;color:var(--text3);margin-top:6px">${message}</div>` : ''}
  </div>`;