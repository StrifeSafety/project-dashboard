import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { pColor, meetType, safeJSON } from '../utils.js';
import { openDetail, openAddForm } from '../components/modal.js';

/* ══════════════════════════════════════════════════
   RENDERER — Meetings
   ══════════════════════════════════════════════════ */

export async function renderMeetings(sub) {
  let list = [...DATA.meetings].sort((a, b) => a.date > b.date ? -1 : 1);
  if (AppState.sbProject) list = list.filter(m => m.project === AppState.sbProject);
  if (AppState.sbStatus) list = list.filter(m => m.type === AppState.sbStatus);
  if (sub === 0) list = list.slice(0, 4);
  if (sub === 1) list = list.filter(m => !m.project);
  if (sub === 2) list = list.filter(m => m.project);

  const fmtTime = t => { if (!t) return ''; const [h, mn] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:${String(mn).padStart(2,'0')} ${ampm}`; };
  const fmtMDate = d => {
    if (!d) return { day: '—', month: '—' };
    const dt = new Date(d + 'T00:00:00');
    return { day: dt.getDate(), month: dt.toLocaleDateString('en-AU', { month: 'short' }) };
  };

  return `<div style="padding:20px 24px">
    <div class="page-banner"><div class="page-banner-icon">📅</div><div><h2>${sub === 0 ? 'Last Meetings' : sub === 1 ? 'Internal Meetings' : 'Project Meetings'}</h2><p>${sub === 0 ? 'Your most recent meetings at a glance.' : sub === 1 ? 'Internal team standups, planning sessions, and training.' : 'Client and stakeholder project meetings.'}</p></div><div style="margin-left:auto"><button class="btn btn-primary" onclick="openAddForm('meeting')">+ New Meeting</button></div></div>
    <div class="meeting-list">
      ${list.map(m => {
    const dd = fmtMDate(m.date);
    return `<div class="meeting-card" onclick="openDetail('meeting',${safeJSON(m)})">
          <div class="meeting-date-box"><div class="mdb-day">${dd.day}</div><div class="mdb-month">${dd.month}</div></div>
          <div class="meeting-info">
            <div class="meeting-title">${m.name}</div>
            <div class="meeting-sub">
              ${m.project ? `<span class="ptag" style="font-size:11px"><span class="pdot" style="background:${pColor(m.project)}"></span>${m.project}</span>` : '<span style="color:var(--text3)">Internal</span>'}
              ${m.time ? `<span style="font-family:'DM Mono',monospace">· ${fmtTime(m.time)}${m.duration ? ` (${m.duration})` : ''}</span>` : ''}
              ${m.attendees ? `<span>· ${m.attendees}</span>` : ''}
            </div>
            ${m.nextSteps ? `<div style="margin-top:5px;font-size:11.5px;color:var(--text3)">Next: ${m.nextSteps}</div>` : ''}
          </div>
          <div class="meeting-tags"><span class="badge ${meetType(m.type)}">${m.type}</span></div>
        </div>`;
  }).join('') || '<div class="empty"><div class="empty-icon">📭</div><div class="empty-title">No meetings</div></div>'}
    </div>
  </div>`;
}