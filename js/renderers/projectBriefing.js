import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { isOverdue, fmtDate, pCol, pColor, projStatusBadge, statusBadge, priBadge, meetType, fmtCur, budget_status, avatarColor, initials, safeJSON, taskDateStatus, calcProgress } from '../utils.js';
import { openDetail, openAddForm, openEditForm, deleteItem } from '../components/modal.js';
import { renderContent, switchTab } from '../router.js';

/* ══════════════════════════════════════════════════
   RENDERER — Project Briefing Page
   ══════════════════════════════════════════════════ */

export async function openProjectBriefing(id) {
  if (AppState.currentBriefingId !== id) {
    AppState.ganttRangeStart = null;
    AppState.ganttRangeEnd = null;
    AppState.meetingViewMode = 'list';
    AppState.meetingCalMonth = null;
    AppState.pastMeetingsOpen = false;
  }
  AppState.currentBriefingId = id;
  history.pushState({ tab: 'projects', sub: 0, briefingId: id }, '', `#projects/briefing/${id}`);
  document.getElementById('contentArea').innerHTML = await renderProjectBriefing(id);
}

export function openAddTaskForProject(projectName) {
  openAddForm('task', { project: projectName });
}

export function openAddMeetingForProject(projectName, pid) {
  AppState.meetingViewMode = 'list';
  openAddForm('meeting', { project: projectName });
}

/* ── MEETINGS BOX ── */
export function renderMeetingsBox(projectName, pid) {
  const projMeetings = DATA.meetings
    .filter(m => m.project === projectName)
    .sort((a, b) => a.date > b.date ? 1 : -1);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const fmtTime = t => { if (!t) return ''; const [h, mn] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:${String(mn).padStart(2,'0')} ${ampm}`; };
  const modeBtn = (label, mode) =>
    `<button class="vs-btn ${AppState.meetingViewMode === mode ? 'active' : ''}"
      onclick="App.AppState.meetingViewMode='${mode}';App.openProjectBriefing('${pid}')">${label}</button>`;

  const header = `
    <div class="table-header table-title-sticky" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div class="table-title">📅 Meetings <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${projMeetings.length}</span></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="view-switcher">${modeBtn('≡ List', 'list')}${modeBtn('⊞ Calendar', 'calendar')}</div>
        <button class="btn btn-primary btn-sm" onclick="App.openAddMeetingForProject('${projectName}','${pid}')">+ Meeting</button>
      </div>
    </div>`;

  // ── LIST VIEW ──
  if (AppState.meetingViewMode === 'list') {
    if (!projMeetings.length) return `<div class="table-card" style="margin-bottom:16px">${header}
      <div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">No meetings scheduled — add one above.</div></div>`;

    const upcoming = projMeetings.filter(m => m.date >= todayStr);
    const past = projMeetings.filter(m => m.date < todayStr);
    const row = m => `<tr onclick="App.openDetail('meeting',${safeJSON(m)})">
      <td style="padding:10px 14px">
        <div style="font-size:13px;font-weight:500;color:${m.date < todayStr ? 'var(--text2)' : 'var(--text)'}">${m.name}</div>
        ${m.nextSteps ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">↪ ${m.nextSteps}</div>` : ''}
      </td>
      <td><span class="badge ${m.project ? 'b-accent' : 'b-grey'}">${m.project ? '📁 Project' : '🏢 Internal'}</span></td>
      <td class="td-mono" style="font-size:11px;color:${m.date < todayStr ? 'var(--text3)' : 'var(--text2)'}">${fmtDate(m.date)}${m.time ? ` <span style="opacity:.7">@ ${fmtTime(m.time)}</span>` : ''}${m.duration ? `<br><span style="font-size:10px;opacity:.6">${m.duration}</span>` : ''}</td>
      <td><span class="badge ${meetType(m.type)}">${m.type}</span></td>
      <td style="font-size:12px;color:var(--text3)">${m.attendees || '—'}</td>
    </tr>`;

    return `<div class="table-card" style="margin-bottom:16px">${header}
      <table><thead class="table-thead-sticky"><tr><th>Meeting</th><th>Category</th><th>Date</th><th>Type</th><th>Attendees</th></tr></thead>
      <tbody>
        ${upcoming.length ? upcoming.map(row).join('') : '<tr><td colspan="5" style="padding:14px 18px;color:var(--text3);font-size:12px">No upcoming meetings</td></tr>'}
        ${past.length ? `
          <tr><td colspan="5" style="padding:0">
            <div class="gh-inner" style="cursor:pointer;user-select:none;justify-content:space-between"
              onclick="App.AppState.pastMeetingsOpen=!App.AppState.pastMeetingsOpen;App.openProjectBriefing('${pid}')">
              <span style="display:flex;align-items:center;gap:7px">
                Past Meetings
                <span style="font-family:'DM Mono',monospace;font-size:9px;background:var(--surface3);padding:1px 5px;border-radius:8px;font-weight:400">${past.length}</span>
              </span>
              <span style="font-size:11px;color:var(--text3);margin-right:4px">${AppState.pastMeetingsOpen ? '▲ Hide' : '▼ Show'}</span>
            </div>
          </td></tr>
          ${AppState.pastMeetingsOpen ? [...past].reverse().map(row).join('') : ''}
        ` : ''}
      </tbody></table>
    </div>`;
  }

  // ── CALENDAR VIEW ──
  const nowYear = today.getFullYear();
  const nowMonth = today.getMonth();
  let calYear, calMonth;
  if (AppState.meetingCalMonth) {
    const [y, m] = AppState.meetingCalMonth.split('-').map(Number);
    calYear = y; calMonth = m - 1;
  } else { calYear = nowYear; calMonth = nowMonth; }

  const navKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
  let pY = calYear, pM = calMonth - 1; if (pM < 0) { pM = 11; pY--; }
  let nY = calYear, nM = calMonth + 1; if (nM > 11) { nM = 0; nY++; }
  const prevK = navKey(pY, pM);
  const nextK = navKey(nY, nM);
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  const isViewingPresentOrFuture = calYear > nowYear || (calYear === nowYear && calMonth >= nowMonth);
  const viewedMonthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-31`;
  const futureMtgs = isViewingPresentOrFuture ? projMeetings.filter(m => m.date && m.date > viewedMonthEnd) : [];
  const futureByMonth = {};
  futureMtgs.forEach(m => { const mk = m.date.slice(0, 7); if (!futureByMonth[mk]) futureByMonth[mk] = []; futureByMonth[mk].push(m); });
  const futureMonthKeys = Object.keys(futureByMonth).sort();

  const nextNotice = futureMtgs.length
    ? `<div class="mcal-next-notice">
        <span style="flex-shrink:0">📌</span>
        <div>
          <strong>${futureMtgs.length} upcoming meeting${futureMtgs.length > 1 ? 's' : ''} ahead:</strong>
          ${futureMonthKeys.map(mk => {
      const label = new Date(mk + '-01').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      const mtgs = futureByMonth[mk];
      return `<div style="margin-top:4px"><span style="opacity:.7">${label}:</span> ${mtgs.map(m => `<strong style="cursor:pointer;text-decoration:underline" onclick="App.AppState.meetingViewMode='calendar';AppState.meetingCalMonth='${mk}';App.openProjectBriefing('${pid}')">${m.name}</strong> (${fmtDate(m.date)}${m.time ? ' @ ' + fmtTime(m.time) : ''}${m.duration ? ' · ' + m.duration : ''})`).join(', ')}</div>`;
    }).join('')}
        </div>
      </div>` : '';

  const byDate = {};
  projMeetings.forEach(m => { if (m.date) { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); } });

  const firstDOW = new Date(calYear, calMonth, 1).getDay();
  const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mColors = { 'b-accent': 'var(--accent)', 'b-green': 'var(--green)', 'b-yellow': 'var(--yellow)', 'b-blue': 'var(--blue)', 'b-purple': 'var(--purple)', 'b-orange': 'var(--orange)' };
  const getEventColor = m => { const cls = meetType(m.type); for (const [k, v] of Object.entries(mColors)) if (cls === k) return v; return 'var(--accent)'; };

  let cells = '';
  for (let i = 0; i < firstDOW; i++) cells += `<div class="mcal-cell other-month"></div>`;
  for (let d = 1; d <= daysInMon; d++) {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = ds === todayStr;
    const isPast = ds < todayStr;
    const mtgs = byDate[ds] || [];
    cells += `<div class="mcal-cell${isToday ? ' today' : ''}${isPast ? ' other-month' : ''}">
      <div class="mcal-day-num">${d}</div>
      ${mtgs.map(m => { const c = getEventColor(m); return `<div class="mcal-event" style="background:${c}22;color:${c}" onclick="App.openDetail('meeting',${safeJSON(m)})" title="${m.name}${m.time ? ' @ ' + fmtTime(m.time) : ''}${m.duration ? ' · ' + m.duration : ''}${m.attendees ? ' · ' + m.attendees : ''}">${m.name}${m.time ? `<span style="opacity:.7;font-size:9px;margin-left:3px">${fmtTime(m.time)}${m.duration ? ' · ' + m.duration : ''}</span>` : ''}</div>`; }).join('')}
    </div>`;
  }
  const rem = (firstDOW + daysInMon) % 7;
  if (rem > 0) for (let i = 0; i < 7 - rem; i++) cells += `<div class="mcal-cell other-month"></div>`;

  return `<div class="table-card" style="margin-bottom:16px">${header}
    <div style="padding:14px 18px">
      ${nextNotice}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <button class="btn btn-ghost btn-sm" onclick="App.AppState.meetingCalMonth='${prevK}';App.openProjectBriefing('${pid}')">← Prev</button>
        <span style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700">${monthLabel}</span>
        <button class="btn btn-ghost btn-sm" onclick="App.AppState.meetingCalMonth='${nextK}';App.openProjectBriefing('${pid}')">Next →</button>
      </div>
      <div class="mcal-grid">
        ${DOW.map(d => `<div class="mcal-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
  </div>`;
}

/* ── MAIN BRIEFING RENDER ── */
export async function renderProjectBriefing(id) {
  const p = DATA.projects.find(x => x.id === id);
  if (!p) return `<div style="padding:40px;color:var(--text3)">Project not found.</div>`;

  const projTasks = DATA.tasks.filter(t => t.project === p.name);
  const projBudgets = DATA.budgets.filter(b => b.project === p.name);
  const projStk = DATA.stakeholders.filter(s => s.project === p.name);
  const projDocs = DATA.documents.filter(d => d.project === p.name);
  const tasksDone = projTasks.filter(t => t.status === 'Complete').length;
  const tasksTotal = projTasks.length;
  const tasksOverdue = projTasks.filter(t => isOverdue(t)).length;
  const tasksInProg = projTasks.filter(t => t.status === 'In Progress').length;
  const pct = tasksTotal ? Math.round(projTasks.reduce((s, t) => s + calcProgress(t), 0) / tasksTotal) : 0;
  const totalBudget = projBudgets.reduce((s, b) => s + b.target, 0);
  const totalSpend = projBudgets.reduce((s, b) => s + b.spend, 0);
  const ov = p.spend - p.target;

  // ── GANTT CHART ──
  let ganttHtml = '';
  if (projTasks.length) {
    const tasksWithDates = projTasks.filter(t => t.due || t.startDate);
    let autoStart, autoEnd;
    if (tasksWithDates.length) {
      const allTaskDates = [];
      tasksWithDates.forEach(t => { if (t.startDate) allTaskDates.push(new Date(t.startDate)); if (t.due) allTaskDates.push(new Date(t.due)); });
      autoStart = new Date(Math.min(...allTaskDates));
      autoEnd = new Date(Math.max(...allTaskDates));
      autoStart = new Date(autoStart.getFullYear(), autoStart.getMonth(), 1);
      autoEnd = new Date(autoEnd.getFullYear(), autoEnd.getMonth() + 2, 0);
    } else {
      autoStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      autoEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0);
    }

    let rangeStart = AppState.ganttRangeStart ? new Date(AppState.ganttRangeStart) : autoStart;
    let rangeEnd = AppState.ganttRangeEnd ? new Date(AppState.ganttRangeEnd) : autoEnd;
    if (rangeEnd <= rangeStart) { rangeEnd = new Date(rangeStart); rangeEnd.setMonth(rangeEnd.getMonth() + 1); }

    const toInputDate = d => d.toISOString().slice(0, 10);
    const totalDays = Math.max(1, (rangeEnd - rangeStart) / 86400000);
    const getISOWeek = d => { const dt = new Date(d); dt.setHours(0,0,0,0); dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7)); const yearStart = new Date(dt.getFullYear(), 0, 1); return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7); };

    const months = [];
    let cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const clampedEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
      const daysInRange = (clampedEnd - (monthStart < rangeStart ? rangeStart : monthStart)) / 86400000 + 1;
      const weeks = [];
      let wCursor = new Date(monthStart < rangeStart ? rangeStart : monthStart);
      let wNum = 1;
      while (wCursor <= clampedEnd) {
        const wEnd = new Date(wCursor); wEnd.setDate(wEnd.getDate() + 6);
        const wClamp = wEnd > clampedEnd ? clampedEnd : wEnd;
        const wDays = (wClamp - wCursor) / 86400000 + 1;
        weeks.push({ label: `W${getISOWeek(wCursor)}`, widthPct: wDays / totalDays * 100 });
        wCursor.setDate(wCursor.getDate() + 7); wNum++;
      }
      months.push({ label: cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }), widthPct: daysInRange / totalDays * 100, weeks });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const todayGantt = new Date();
    const todayPct = todayGantt >= rangeStart && todayGantt <= rangeEnd ? ((todayGantt - rangeStart) / 86400000) / totalDays * 100 : -1;

    const phaseColors = { 'Initiation': 'var(--purple)', 'Planning': 'var(--blue)', 'Execution': 'var(--yellow)', 'Review': 'var(--orange)', 'Launch': 'var(--accent)', 'Completed': 'var(--green)' };
    const phases = ['Initiation', 'Planning', 'Execution', 'Review', 'Launch', 'Completed'];
    const ungrouped = projTasks.filter(t => !t.phase);
    const grouped = phases.map(ph => ({ phase: ph, tasks: projTasks.filter(t => t.phase === ph) })).filter(g => g.tasks.length);
    if (ungrouped.length) grouped.push({ phase: 'Other', tasks: ungrouped });

    const minBarDays = 5;

    const getBar = t => {
      let s, e;
      if (t.startDate && t.due) { s = new Date(t.startDate); e = new Date(t.due); }
      else if (t.due && !t.startDate) { e = new Date(t.due); s = new Date(t.due); s.setDate(s.getDate() - 7); }
      else if (t.startDate && !t.due) { s = new Date(t.startDate); e = new Date(t.startDate); e.setDate(e.getDate() + 7); }
      else { s = new Date(rangeStart); e = new Date(rangeStart); e.setDate(e.getDate() + 7); }
      const durDays = (e - s) / 86400000;
      if (durDays < minBarDays) { e = new Date(s); e.setDate(e.getDate() + minBarDays); }
      const clampS = s < rangeStart ? rangeStart : s;
      const clampE = e > rangeEnd ? rangeEnd : e;
      const left = Math.max(0, (clampS - rangeStart) / 86400000 / totalDays * 100);
      const width = Math.max(2, (clampE - clampS) / 86400000 / totalDays * 100);
      const color = t.status === 'Complete' ? 'var(--green)' : isOverdue(t) ? 'var(--red)' : t.status === 'In Progress' ? 'var(--yellow)' : t.status === 'On Hold' ? 'var(--blue)' : 'var(--surface4)';
      return { left, width, color };
    };

    let rowsHtml = '';
    grouped.forEach(({ phase, tasks }) => {
      const pc = phaseColors[phase] || 'var(--accent)';
      if (!tasks.length) return;
      const phaseStarts = tasks.map(t => { const b = getBar(t); const s = new Date(rangeStart); s.setDate(s.getDate() + b.left / 100 * totalDays); return s; });
      const phaseEnds = tasks.map(t => { const b = getBar(t); const e = new Date(rangeStart); e.setDate(e.getDate() + (b.left + b.width) / 100 * totalDays); return e; });
      const phaseLeft = Math.max(0, ((Math.min(...phaseStarts) - rangeStart) / 86400000) / totalDays * 100);
      const phaseRight = Math.max(0, ((Math.max(...phaseEnds) - rangeStart) / 86400000) / totalDays * 100);
      const phaseWidth = Math.max(2, phaseRight - phaseLeft);

      rowsHtml += `<tr class="gantt-phase-row">
          <td class="gantt-label-cell" style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:${pc};padding:10px 14px">${phase} <span style="font-family:'DM Mono',monospace;font-size:9px;font-weight:400;opacity:.6">${tasks.length} task${tasks.length > 1 ? 's' : ''}</span></td>
          <td class="gantt-timeline-cell" colspan="${months.reduce((a,m)=>a+m.weeks.length,0)}"><div class="gantt-row-inner" style="position:relative">
            ${todayPct >= 0 ? `<div class="gantt-today" style="left:${todayPct}%"></div>` : ''}
            <div class="gantt-phase-bar" style="left:${phaseLeft}%;width:${phaseWidth}%;background:${pc};opacity:0.25"></div>
            <div class="gantt-phase-bracket-l" style="left:${phaseLeft}%;background:${pc}"></div>
            <div class="gantt-phase-bracket-r" style="left:${Math.min(phaseLeft + phaseWidth, 100)}%;background:${pc}"></div>
          </div></td></tr>`;

      tasks.sort((a, b) => (a.startDate || a.due || '9999') > (b.startDate || b.due || '9999') ? 1 : -1).forEach(t => {
        const bar = getBar(t);
        const hasNoDates = !t.startDate && !t.due;
        const isMilestone = t.startDate && t.due && t.startDate === t.due;
        const progress = calcProgress(t);
        rowsHtml += `<tr class="gantt-task-row" onclick="App.openDetail('task',${safeJSON(t)})">
            <td class="gantt-label-cell"><div style="display:flex;align-items:center;gap:6px;padding-left:16px">
              ${isMilestone ? `<span style="font-size:10px;color:${bar.color}">♦</span>` : `<span style="width:8px;height:8px;border-radius:50%;background:${bar.color};flex-shrink:0"></span>`}
              <span style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</span>
              ${hasNoDates ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);flex-shrink:0">no dates</span>` : ''}
              ${isMilestone ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);flex-shrink:0">milestone</span>` : ''}
            </div></td>
            <td class="gantt-timeline-cell" colspan="${months.reduce((a,m)=>a+m.weeks.length,0)}"><div class="gantt-row-inner" style="position:relative">
              ${todayPct >= 0 ? `<div class="gantt-today" style="left:${todayPct}%"></div>` : ''}
              ${isMilestone
                ? `<div class="gantt-milestone" style="left:calc(${bar.left}% - 6px);background:${bar.color}" title="♦ Milestone: ${t.name}${t.due ? ' · Due: ' + fmtDate(t.due) : ''}"></div>`
                : `<div class="gantt-task-bar" style="left:${bar.left}%;width:${bar.width}%;background:${bar.color};${hasNoDates ? 'opacity:0.4;border:1px dashed var(--border2)' : ''}"
                title="${t.name}${t.startDate ? ' · Start: ' + fmtDate(t.startDate) : ''}${t.due ? ' · Due: ' + fmtDate(t.due) : ''} · ${progress}% complete${hasNoDates ? ' · No dates set' : ''}">
                <div class="gantt-progress-fill" style="width:${progress}%"></div>
                <span class="gantt-task-label" style="position:relative;z-index:1"></span>
              </div>`}
            </div></td></tr>`;
      });
    });

    ganttHtml = `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-header table-title-sticky" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div class="table-title">📅 Task — Gantt Schedule</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)">
              <span>From</span>
              <input type="date" id="gantt-from" value="${toInputDate(rangeStart)}"
                style="background:var(--surface3);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:11px;padding:4px 8px;border-radius:var(--rs);outline:none"
                onchange="App.AppState.ganttRangeStart=this.value;App.openProjectBriefing('${p.id}')"/>
              <span>To</span>
              <input type="date" id="gantt-to" value="${toInputDate(rangeEnd)}"
                style="background:var(--surface3);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:11px;padding:4px 8px;border-radius:var(--rs);outline:none"
                onchange="App.AppState.ganttRangeEnd=this.value;App.openProjectBriefing('${p.id}')"/>
              <button class="btn btn-ghost btn-sm" onclick="App.AppState.ganttRangeStart=null;App.AppState.ganttRangeEnd=null;App.openProjectBriefing('${p.id}')">↺ Reset</button>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3)"><span style="width:10px;height:4px;border-radius:2px;background:var(--green);display:inline-block"></span>Complete</span>
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3)"><span style="width:10px;height:4px;border-radius:2px;background:var(--yellow);display:inline-block"></span>In Progress</span>
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3)"><span style="width:10px;height:4px;border-radius:2px;background:var(--red);display:inline-block"></span>Overdue</span>
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3)"><span style="width:10px;height:4px;border-radius:2px;background:var(--surface4);border:1px solid var(--border2);display:inline-block"></span>Not Started</span>
            </div>
          </div>
        </div>
        <div style="overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none">
          <table style="border-collapse:collapse;width:100%">
            <thead>
              <tr style="background:var(--surface2);border-bottom:1px solid var(--border)">
                <th style="width:200px;min-width:200px;padding:8px 14px;font-family:'DM Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);border-right:1px solid var(--border);text-align:left">Task</th>
                ${months.map(m => `<th colspan="${m.weeks.length}" style="padding:8px 6px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text);text-align:center;border-right:1px solid var(--border)">${m.label}</th>`).join('')}
              </tr>
              <tr style="background:var(--surface3);border-bottom:2px solid var(--border2)">
                <th style="width:200px;min-width:200px;border-right:1px solid var(--border)"></th>
                ${months.map(m => m.weeks.map((w, wi) => `<th style="padding:5px 4px;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-align:center;${wi === m.weeks.length - 1 ? 'border-right:1px solid var(--border)' : ''}">${w.label}</th>`).join('')).join('')}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
      <div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;align-items:flex-start;gap:32px;flex-wrap:wrap">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">How to read a bar</div>
          <div style="display:flex;align-items:center;gap:0;height:16px;border-radius:4px;overflow:hidden;width:140px;margin-bottom:6px">
            <div style="width:40%;height:100%;background:rgba(99,102,241,1);position:relative">
              <div style="position:absolute;inset:0;background:rgba(255,255,255,0.45);border-right:2px solid rgba(255,255,255,0.9)"></div>
            </div>
            <div style="width:60%;height:100%;background:rgba(99,102,241,0.5)"></div>
          </div>
          <div style="display:flex;gap:0;width:140px;margin-bottom:16px">
            <div style="width:40%;font-family:'DM Mono',monospace;font-size:9px;color:var(--text2)">Progress</div>
            <div style="width:60%;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3)">Remaining</div>
          </div>
          <span style="width:140px;height:16px;display:inline-flex;align-items:center;flex-shrink:0;position:relative;margin-bottom:6px"><span style="position:absolute;left:0;right:0;height:6px;top:50%;transform:translateY(-50%);background:var(--accent);opacity:0.25;border-radius:0"></span><span style="position:absolute;left:0;width:3px;height:14px;top:50%;transform:translateY(-50%);background:var(--accent);border-radius:2px 0 0 2px"></span><span style="position:absolute;right:0;width:3px;height:14px;top:50%;transform:translateY(-50%);background:var(--accent);border-radius:0 2px 2px 0"></span></span>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3)">Milestone (start = due date)</div>
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">Bar colour = status</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:7px"><span style="width:24px;height:10px;border-radius:3px;background:var(--green);display:inline-block"></span><span style="font-size:11px;color:var(--text2)">Complete</span></div>
            <div style="display:flex;align-items:center;gap:7px"><span style="width:24px;height:10px;border-radius:3px;background:var(--yellow);display:inline-block"></span><span style="font-size:11px;color:var(--text2)">In Progress</span></div>
            <div style="display:flex;align-items:center;gap:7px"><span style="width:24px;height:10px;border-radius:3px;background:var(--red);display:inline-block"></span><span style="font-size:11px;color:var(--text2)">Overdue</span></div>
            <div style="display:flex;align-items:center;gap:7px"><span style="width:24px;height:10px;border-radius:3px;background:var(--blue);display:inline-block"></span><span style="font-size:11px;color:var(--text2)">On Hold</span></div>
            <div style="display:flex;align-items:center;gap:7px"><span style="width:24px;height:10px;border-radius:3px;background:var(--surface4);border:1px solid var(--border2);display:inline-block"></span><span style="font-size:11px;color:var(--text2)">Not Started</span></div>
          </div>
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">Other</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:7px"><span style="width:2px;height:16px;background:var(--red);display:inline-block;opacity:.8"></span><span style="font-size:11px;color:var(--text2)">Today</span></div>
          </div>
        </div>
      </div>`;
  }

  return `<div style="padding:20px 24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <button class="pb-back" onclick="App.AppState.ganttRangeStart=null;App.AppState.ganttRangeEnd=null;App.AppState.currentBriefingId=null;App.renderContent()">← Back to Projects</button>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--yellow);letter-spacing:.6px;text-transform:uppercase">Project Briefing</div>
      <div style="width:120px"></div>
    </div>

    <div class="pb-hero">
      <div class="pb-hero-top">
        <div>
          <div class="pb-title">${p.name}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:70px;margin-top:10px">
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px">⊙ Project Status</div>
              <div>${projStatusBadge(p.status)}</div>
            </div>
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px">🏢 Company</div>
              <div style="font-size:13px;font-weight:500;color:var(--text)">${p.company || '—'}</div>
            </div>
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px">👥 Stakeholders</div>
              <div style="font-size:13px;font-weight:500;color:var(--text)">${projStk.length ? projStk[0].name + (projStk.length > 1 ? ` +${projStk.length - 1}` : '') : '—'}</div>
            </div>
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px">📅 Timeline</div>
              <div style="font-size:13px;font-weight:500;color:var(--text)">${p.timeline || '—'}</div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="App.openEditForm('project','${p.id}')">✎ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="App.openDeleteModal('project','${p.id}')">🗑 Delete</button>
        </div>
      </div>
      <div style="margin-bottom:4px;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.8px">Tasks Completed</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${pCol(pct)};margin-bottom:6px">${pct}%</div>
      <div class="pb-progress-bar"><div class="pb-progress-fill" style="width:${pct}%;background:${pCol(pct)}"></div></div>
      <div class="pb-meta-grid" style="margin-top:16px">
        <div class="pb-meta-cell"><div class="pb-meta-label">Total Tasks</div><div class="pb-meta-val">${tasksDone} / ${tasksTotal}</div></div>
        <div class="pb-meta-cell"><div class="pb-meta-label">In Progress</div><div class="pb-meta-val" style="color:var(--yellow)">${tasksInProg}</div></div>
        <div class="pb-meta-cell"><div class="pb-meta-label">Overdue</div><div class="pb-meta-val" style="color:${tasksOverdue ? 'var(--red)' : 'var(--green)'}">${tasksOverdue}</div></div>
        <div class="pb-meta-cell"><div class="pb-meta-label">Budget Variance</div><div class="pb-meta-val" style="color:${totalSpend > totalBudget ? 'var(--red)' : 'var(--green)'}">${totalSpend > totalBudget ? '−' : '+'}${fmtCur(Math.abs(totalBudget - totalSpend))}</div></div>
      </div>
    </div>

    ${renderMeetingsBox(p.name, p.id)}

    <div class="col-2" style="gap:16px;margin-bottom:16px">
      <div class="table-card" style="margin-bottom:0">
        <div class="table-header"><div class="table-title">📊 Project Statistics</div></div>
        <div style="padding:14px 18px">
          <div class="stat-row"><div class="stat-row-label">Status</div><div>${projStatusBadge(p.status)}</div></div>
          <div class="stat-row"><div class="stat-row-label">Tasks Complete</div><div class="stat-row-val">${tasksDone} / ${tasksTotal}</div></div>
          <div class="stat-row"><div class="stat-row-label">Completion %</div><div class="stat-row-val" style="color:${pCol(pct)}">${pct}%</div></div>
          <div class="stat-row"><div class="stat-row-label">Tasks In Progress</div><div class="stat-row-val" style="color:var(--yellow)">${tasksInProg}</div></div>
          <div class="stat-row"><div class="stat-row-label">Tasks Overdue</div><div class="stat-row-val" style="color:${tasksOverdue ? 'var(--red)' : 'var(--green)'}">${tasksOverdue}</div></div>
          <div class="stat-row"><div class="stat-row-label">Documents</div><div class="stat-row-val">${projDocs.length}</div></div>
          <div class="stat-row"><div class="stat-row-label">Team Members</div><div class="stat-row-val">${projStk.length}</div></div>
          <div class="stat-row"><div class="stat-row-label">Timeline</div><div class="stat-row-val" style="font-family:'DM Mono',monospace;font-size:11px">${p.timeline || '—'}</div></div>
        </div>
      </div>
      <div class="table-card" style="margin-bottom:0">
        <div class="table-header"><div class="table-title">💰 Budget Summary</div><button class="btn btn-ghost btn-sm" onclick="App.switchTab('budgets')">View all</button></div>
        <div style="padding:14px 18px">
          ${(() => {
            const projectTarget = p.target || 0;
            const projectSpend = p.spend || 0;
            const itemsTarget = totalBudget;
            const itemsSpend = totalSpend;
            const combinedSpend = projectSpend + itemsSpend;
            const unallocated = projectTarget - itemsTarget;
            const variance = projectTarget - combinedSpend;
            return `
          <div class="stat-row"><div class="stat-row-label">Project Budget</div><div class="stat-row-val">${fmtCur(projectTarget)}</div></div>
          <div class="stat-row"><div class="stat-row-label">Project Spend</div><div class="stat-row-val" style="color:var(--text2)">${fmtCur(projectSpend)}</div></div>
          <div class="stat-row"><div class="stat-row-label">Total Allocated (Sub-budgets)</div><div class="stat-row-val" style="color:${itemsTarget > projectTarget ? 'var(--red)' : 'var(--text)'}">${fmtCur(itemsTarget)}${itemsTarget > projectTarget ? ' <span style="font-size:10px;color:var(--red)">⚠ exceeds budget</span>' : ''}</div></div>
          <div class="stat-row"><div class="stat-row-label">Sub-budget Spend</div><div class="stat-row-val" style="color:var(--text2)">${fmtCur(itemsSpend)}</div></div>
          <div class="stat-row"><div class="stat-row-label">Total Spent</div><div class="stat-row-val" style="color:${combinedSpend > projectTarget ? 'var(--red)' : 'var(--green)'}"><strong>${fmtCur(combinedSpend)}</strong></div></div>
          <div class="stat-row"><div class="stat-row-label">Unallocated</div><div class="stat-row-val" style="color:${unallocated < 0 ? 'var(--red)' : 'var(--text2)'}">${fmtCur(Math.max(0, unallocated))}</div></div>
          <div class="stat-row"><div class="stat-row-label">Variance</div><div class="stat-row-val" style="color:${variance < 0 ? 'var(--red)' : 'var(--green)'}">${variance < 0 ? '−' : '+'}${fmtCur(Math.abs(variance))}</div></div>
          <div class="stat-row"><div class="stat-row-label">Budget Items</div><div class="stat-row-val">${projBudgets.length}</div></div>`;
          })()}
        </div>
        ${projBudgets.length ? `
        <table><thead class="table-thead-sticky"><tr><th>Item</th><th>Target</th><th>Spend</th><th>Status</th></tr></thead>
        <tbody>${projBudgets.map(b => `
          <tr>
            <td class="td-main"><span>${b.name}</span></td>
            <td class="td-mono">${fmtCur(b.target)}</td>
            <td class="td-mono" style="color:${b.spend > b.target ? 'var(--red)' : 'var(--green)'}">${fmtCur(b.spend)}</td>
            <td>${budget_status(b)}</td>
          </tr>`).join('')}</tbody></table>` : ''}
      </div>
    </div>

    ${projStk.length ? `
    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header table-title-sticky"><div class="table-title">👥 Project Team</div><button class="btn btn-ghost btn-sm" onclick="App.switchTab('stakeholders')">View all</button></div>
      <table><thead class="table-thead-sticky"><tr><th>Name</th><th>Role</th><th>Company</th><th>Category</th><th>Contact</th><th>Email</th></tr></thead>
      <tbody>${projStk.map(s => `
        <tr onclick="App.openDetail('stakeholder',${safeJSON(s)})">
          <td class="td-main"><span style="display:flex;align-items:center;gap:8px">
            <span style="width:26px;height:26px;border-radius:50%;background:${avatarColor(s.name)}22;color:${avatarColor(s.name)};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0">${initials(s.name)}</span>
            ${s.name}
          </span></td>
          <td style="font-size:12px">${s.title || '—'}</td>
          <td style="font-size:12px;color:var(--text2)">${s.company || '—'}</td>
          <td><span class="badge b-grey">${s.category || '—'}</span></td>
          <td><span class="badge b-blue" style="font-size:9.5px">${s.contact || '—'}</span></td>
          <td class="td-mono" style="font-size:10px;color:var(--text3)">${s.email || '—'}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>` : ''}

    ${ganttHtml}

    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header table-title-sticky">
        <div class="table-title">✅ Tasks <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${projTasks.length} tasks</span></div>
        <button class="btn btn-primary btn-sm" onclick="App.openAddTaskForProject('${p.name}')">+ Add Task</button>
      </div>
      ${projTasks.length ? `
      <table><thead class="table-thead-sticky"><tr><th>Task</th><th>Phase</th><th>Status</th><th>Priority</th><th>Progress</th><th>Due Date</th><th>Hours</th></tr></thead>
      <tbody>${projTasks.sort((a, b) => (a.due || '9999') > (b.due || '9999') ? 1 : -1).map(t => `
        <tr onclick="App.openDetail('task',${safeJSON(t)})" ${isOverdue(t) ? 'style="border-left:2px solid var(--red)"' : ''}>
          <td class="td-main"><span>${t.name}</span></td>
          <td><span class="badge b-purple" style="font-size:9px">${t.phase || '—'}</span></td>
          <td>${statusBadge(t)}</td>
          <td>${priBadge(t.priority)}</td>
          <td><div class="prog-wrap"><div class="prog-track"><div class="prog-fill" style="width:${calcProgress(t)}%;background:${pCol(calcProgress(t))}"></div></div><span class="prog-pct">${calcProgress(t)}%</span></div></td>
          <td class="td-mono">
            <div style="color:${taskDateStatus(t).color};font-weight:500">${t.due ? fmtDate(t.due) : '—'}</div>
            <div style="font-size:9.5px;color:${taskDateStatus(t).color};margin-top:2px">${taskDateStatus(t).icon} ${taskDateStatus(t).label}</div>
          </td>
          <td class="td-mono">${t.hours ? t.hours + 'h' : '—'}</td>
        </tr>`).join('')}
      </tbody></table>` : `<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">No tasks yet — add one above</div>`}
    </div>

  </div>`;
}