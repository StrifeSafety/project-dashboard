import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { pColor, avatarColor, initials, safeJSON, fmtLastContact } from '../utils.js';
import { openDetail, openAddForm } from '../components/modal.js';

/* ══════════════════════════════════════════════════
   RENDERER — Stakeholders
   ══════════════════════════════════════════════════ */

export async function renderStakeholders(sub) {
  let list = [...DATA.stakeholders];
  if (AppState.sbProject) list = list.filter(s => s.project === AppState.sbProject);
  if (AppState.sbStatus) list = list.filter(s => s.category === AppState.sbStatus);
  if (sub === 1) list = list.filter(s => s.category === 'Team');

  return `<div style="padding:20px 24px">
    <div class="page-banner"><div class="page-banner-icon">👥</div><div><h2>${sub === 0 ? 'All Stakeholders' : 'Team Members'}</h2><p>${sub === 0 ? 'Clients, team members, and all project stakeholders.' : 'Your internal project team.'}</p></div><div style="margin-left:auto"><button class="btn btn-primary" onclick="App.openAddForm('stakeholder')">+ Add Stakeholder</button></div></div>
    <div class="stk-grid">
      ${list.map(s => `
        <div class="stk-card" onclick="App.openDetail('stakeholder',${safeJSON(s)})">
          <div class="stk-avatar" style="background:${avatarColor(s.name)}22;color:${avatarColor(s.name)}">${initials(s.name)}</div>
          <div class="stk-info">
            <div class="stk-name">${s.name}</div>
            <div class="stk-title">${s.title} · ${s.company}</div>
            <div class="stk-tags">
              <span class="badge b-grey" style="font-size:9.5px">${s.category}</span>
              <span class="badge b-blue" style="font-size:9.5px">${s.industry}</span>
              ${s.project ? `<span class="ptag" style="font-size:10px"><span class="pdot" style="background:${pColor(s.project)}"></span>${s.project}</span>` : ''}
            </div>
            <div class="stk-contact">📧 ${s.email}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="table-card">
      <div class="table-header table-title-sticky"><div class="table-title">📋 Stakeholder List</div></div>
      <table><thead class="table-thead-sticky"><tr><th>Name</th><th>Role</th><th>Company</th><th>Category</th><th>Industry</th><th>Contact</th><th>Last Contact</th></tr></thead>
      <tbody>${list.map(s => `
        <tr onclick="openDetail('stakeholder',${safeJSON(s)})">
          <td class="td-main"><span style="display:flex;align-items:center;gap:8px"><span class="stk-avatar" style="width:24px;height:24px;font-size:10px;background:${avatarColor(s.name)}22;color:${avatarColor(s.name)};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${initials(s.name)}</span>${s.name}</span></td>
          <td style="font-size:12px">${s.title}</td>
          <td style="font-size:12px;color:var(--text2)">${s.company}</td>
          <td><span class="badge b-grey">${s.category}</span></td>
          <td style="font-size:12px;color:var(--text2)">${s.industry}</td>
          <td><span class="badge b-blue" style="font-size:9.5px">${s.contact}</span></td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${fmtLastContact(s)}</td>
        </tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}