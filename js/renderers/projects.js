import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { isOverdue, pCol, pColor, projStatusBadge, statusIcon, getProjectStats, fmtCur } from '../utils.js';
import { openProjectBriefing } from './projectBriefing.js';
import { openAddForm, openEditForm } from '../components/modal.js';

/* ══════════════════════════════════════════════════
   RENDERER — Projects
   ══════════════════════════════════════════════════ */

export function renderProjects(sub) {
  let list = AppState.sbProject ? DATA.projects.filter(p => p.name === AppState.sbProject) : [...DATA.projects];
  if (AppState.sbStatus) list = list.filter(p => p.status === AppState.sbStatus);
  if (sub === 0) list = list.filter(p => p.active && !p.completed);

  if (sub === 1) {
    const phases = ['Initiation', 'Planning', 'Execution', 'Review', 'Completed'];
    return `<div style="padding:16px 24px">
      <div class="page-banner"><div class="page-banner-icon">🔄</div><div><h2>Project Lifecycle</h2><p>Explore the full pipeline — from initiation to completion.</p></div></div>
      <div class="kanban-wrap">
        ${phases.map(ph => {
      const phProjects = DATA.projects.filter(p => p.status === ph);
      return `<div class="kb-col">
            <div class="kb-head"><span class="kb-title"><span style="color:${pCol(ph === 'Completed' ? 100 : ph === 'Execution' ? 70 : ph === 'Planning' ? 50 : ph === 'Review' ? 85 : 20)}">${statusIcon(ph)}</span>${ph}</span><span class="kb-cnt">${phProjects.length}</span></div>
            <div class="kb-cards">${phProjects.map(p => {
        const s = getProjectStats(p, DATA.tasks, DATA.budgets);
        return `<div class="kb-card">
                <div class="kb-card-title" style="display:flex;align-items:center;gap:7px"><span class="pdot" style="background:${pColor(p.name)}"></span>${p.name}</div>
                <div class="kb-card-meta">${projStatusBadge(p.status)}<span class="badge b-grey">${p.company || '—'}</span></div>
                <div class="prog-wrap" style="margin-top:6px"><div class="prog-track"><div class="prog-fill" style="width:${s.pct}%;background:${pCol(s.pct)}"></div></div><span class="prog-pct">${s.pct}%</span></div>
                <div class="kb-card-foot"><span>${s.tasksDone}/${s.tasksTotal} tasks</span><span>${s.tasksOverdue > 0 ? `<span style="color:var(--red)">⚠${s.tasksOverdue} overdue</span>` : '✓ On track'}</span></div>
              </div>`;
      }).join('') || '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">Empty</div>'}</div>
          </div>`;
    }).join('')}
      </div>
    </div>`;
  }

  return `<div style="padding:20px 24px">
    <div class="page-banner"><div class="page-banner-icon">📁</div><div><h2>${sub === 0 ? 'Active Projects' : 'All Projects'}</h2><p>${sub === 0 ? 'View all active projects that are either in progress or completed.' : 'Complete list of your project portfolio.'}</p></div><div style="margin-left:auto"><button class="btn btn-primary" onclick="openAddForm('project')">+ New Project</button></div></div>
    <div class="project-grid">
      ${list.map(p => {
    const ps = getProjectStats(p, DATA.tasks, DATA.budgets);
    const tasksDone = ps.tasksDone;
    const tasksTotal = ps.tasksTotal;
    const tasksOverdue = ps.tasksOverdue;
    const projStakeholders = DATA.stakeholders.filter(s => s.project === p.name);
    const pct = ps.pct;
    const ov = ps.ov;
    return `<div class="project-card" onclick="openProjectBriefing('${p.id}')">
          <div class="pc-body" style="padding:18px 20px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
              <div>
                <div class="pc-title" style="font-size:16px;margin-bottom:5px"><span class="pdot" style="background:${pColor(p.name)}"></span>${p.name}</div>
                ${projStatusBadge(p.status)}
              </div>
              <button onclick="event.stopPropagation();openEditForm('project','${p.id}')" style="background:var(--surface3);border:none;color:var(--text3);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">✎</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;font-size:12px;color:var(--text2)">
              ${p.company ? `<span style="display:flex;align-items:center;gap:4px">🏢 ${p.company}</span>` : ''}
              ${projStakeholders.length ? `<span style="display:flex;align-items:center;gap:4px">👤 ${projStakeholders[0]?.name}${projStakeholders.length > 1 ? ` +${projStakeholders.length - 1}` : ''}</span>` : ''}
              ${p.timeline ? `<span style="display:flex;align-items:center;gap:4px">📅 ${p.timeline}</span>` : ''}
            </div>
            <div style="margin-bottom:4px;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.8px">Tasks Completed</div>
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${pCol(pct)};margin-bottom:6px">${pct}%</div>
            <div class="prog-wrap" style="margin-bottom:12px"><div class="prog-track" style="height:5px"><div class="prog-fill" style="width:${pct}%;background:${pCol(pct)}"></div></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              <div style="background:var(--surface2);border-radius:var(--rs);padding:8px 10px">
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Tasks</div>
                <div style="font-size:13px;font-weight:600;color:var(--text)">${tasksDone}/${tasksTotal}</div>
              </div>
              <div style="background:var(--surface2);border-radius:var(--rs);padding:8px 10px">
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Budget</div>
                <div style="font-size:13px;font-weight:600;color:${ov > 0 ? 'var(--red)' : 'var(--green)'}">${ov > 0 ? 'Over' : 'Under'}</div>
              </div>
              <div style="background:var(--surface2);border-radius:var(--rs);padding:8px 10px">
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Overdue</div>
                <div style="font-size:13px;font-weight:600;color:${tasksOverdue ? 'var(--red)' : 'var(--green)'}">${tasksOverdue}</div>
              </div>
            </div>
          </div>
        </div>`;
  }).join('')}
      <div class="project-card" style="border-style:dashed;cursor:pointer;min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px" onclick="openAddForm('project')">
        <div style="font-size:28px;color:var(--text3)">+</div>
        <div style="font-size:13px;color:var(--text3)">New Project</div>
      </div>
    </div>
  </div>`;
}