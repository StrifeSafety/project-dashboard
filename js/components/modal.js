import { AppState } from "../state.js";
import { supabase } from "../supabase.js";
import { DATA, saveData, loadData, saveProject, saveTask, saveBudget, saveStakeholder, saveMeeting, deleteRecord } from "../storage.js";
import { isOverdue, fmtDate, pBar, pCol, pColor, statusBadge, priBadge, projStatusBadge, docBadge, fmtCur, budget_status, meetType, avatarColor, initials, safeJSON, gv, gn, fmtLastContact, taskDateStatus } from "../utils.js";
import { toast } from "./toast.js";
import { renderContent } from "../router.js";
import { renderSidebar } from "./sidebar.js";
import { openProjectBriefing } from "../renderers/projectBriefing.js";

/* ══════════════════════════════════════════════════
   MODAL — Overlays, detail view, forms, CRUD
   ══════════════════════════════════════════════════ */

export function openOverlay(id) { document.getElementById(id).classList.add('open'); }
export function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

/* ── DETAIL MODAL ── */
export async function openDetail(type, obj) {
  AppState.detailId = { type, id: obj.id };
  document.getElementById('detailTitle').textContent = obj.name || 'Detail';

  let body = '', actions = '';

  if (type === 'task') {
    body = `
      <div class="fg-grid">
        <div class="fg"><div class="dk">Status</div><div class="dv">${statusBadge(obj)} ${priBadge(obj.priority)}</div></div>
        <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
        <div class="fg"><div class="dk">Phase</div><div class="dv"><span class="badge b-purple" style="font-size:10px">${obj.phase || '—'}</span></div></div>
        <div class="fg"><div class="dk">Due Date</div><div class="dv">
          <span style="color:${taskDateStatus(obj).color};font-weight:500">${obj.due ? fmtDate(obj.due) : '—'}</span>
          <span style="font-size:11px;color:${taskDateStatus(obj).color};margin-left:8px">${taskDateStatus(obj).icon} ${taskDateStatus(obj).label}</span>
        </div></div>
        <div class="fg"><div class="dk">Hours</div><div class="dv">${obj.hours ? obj.hours + 'h' : '—'}</div></div>
        <div class="fg"><div class="dk">Progress</div><div class="dv">
          <div class="prog-wrap" style="margin-bottom:3px"><div class="prog-track" style="flex:1"><div class="prog-fill" style="width:${obj.progress || 0}%;background:${pCol(obj.progress || 0)}"></div></div><span class="prog-pct">${obj.progress || 0}%</span></div>
        </div></div>
      </div>
      ${obj.desc ? `<div class="fg"><div class="dk">Description</div><div class="dv dv-desc">${obj.desc}</div></div>` : ''}
      ${obj.recommendation ? `<div class="fg"><div class="dk">Recommendation</div><div class="dv dv-desc">${obj.recommendation}</div></div>` : ''}
      ${obj.interimAction ? `<div class="fg"><div class="dk">Interim Action</div><div class="dv dv-desc">${obj.interimAction}</div></div>` : ''}
      ${obj.finalAction ? `<div class="fg"><div class="dk">Final Action</div><div class="dv dv-desc">${obj.finalAction}</div></div>` : ''}
      ${obj.responsible ? `<div class="fg"><div class="dk">Responsible Person</div><div class="dv">${obj.responsible}</div></div>` : ''}
      ${obj.actualCompletion ? `<div class="fg"><div class="dk">Actual Completion</div><div class="dv">${fmtDate(obj.actualCompletion)}</div></div>` : ''}
      ${obj.contractorEngaged === 'Yes' ? `<div class="fg"><div class="dk">Contractor Engaged</div><div class="dv">${obj.contractorEngaged}${obj.contractorName ? ` — ${obj.contractorName}` : ''}</div></div>` : ''}
      ${await (async () => {
        if (!obj.id) return '';
        const { data } = await supabase.from('documents').select('*').eq('linked_task_id', obj.id);
        if (!data || !data.length) return '';
        return `<div class="fg"><div class="dk">Linked Documents</div><div class="dv">${data.map(d => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:16px">📄</span>
            <a href="${d.file_url}" target="_blank" style="color:var(--accent);text-decoration:underline;font-size:13px;font-weight:500">${d.name}</a>
            ${d.revision ? `<span style="font-size:11px;color:var(--text3)">${d.revision}</span>` : ''}
            <span class="badge ${d.status === 'Current' ? 'b-green' : d.status === 'Superseded' ? 'b-grey' : 'b-yellow'}" style="font-size:9px">${d.status || 'Draft'}</span>
          </div>`).join('')}</div></div>`;
      })()}
      ${obj.linkedBudgetId ? `<div class="fg"><div class="dk">Linked Budget</div><div class="dv">${(() => {
        const b = DATA.budgets.find(x => x.id === obj.linkedBudgetId);
        if (!b) return '—';
        const ov = b.spend - b.target;
        return `<span onclick="closeOverlay('detailModal');switchTabFiltered('budgets','${b.project}');" style="cursor:pointer;color:var(--accent);text-decoration:underline;font-weight:500">${b.name}</span>
          <span style="font-size:11px;color:var(--text3);margin-left:6px">${b.project}</span>
          <div style="margin-top:4px;font-size:11px">
            <span style="color:var(--text3)">Target: </span><span style="color:var(--text2)">${fmtCur(b.target)}</span>
            <span class="badge ${ov > 0 ? 'b-red' : 'b-green'}" style="margin-left:6px;font-size:9px">${ov > 0 ? '⬆ Over' : '⬇ Under'} by ${fmtCur(Math.abs(ov))}</span>
          </div>`;
      })()}</div></div>` : ''}`;
    actions = `<button class="btn btn-ghost" onclick="openEditForm('task','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('task','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'project') {
    const projT = DATA.tasks.filter(t => t.project === obj.name);
    const pDone = projT.filter(t => t.status === 'Complete').length;
    const pTotal = projT.length;
    const pOv = projT.filter(t => isOverdue(t)).length;
    const pct = pTotal ? Math.round(pDone / pTotal * 100) : 0;
    const projBudgets = DATA.budgets.filter(b => b.project === obj.name);
    const totalSpend = projBudgets.reduce((s, b) => s + (b.spend || 0), 0);
    const totalTarget = projBudgets.reduce((s, b) => s + (b.target || 0), 0);
    const ov = totalSpend - totalTarget;
    body = `
      <div class="fg-grid">
        <div class="fg"><div class="dk">Status</div><div class="dv">${projStatusBadge(obj.status)}</div></div>
        <div class="fg"><div class="dk">Company</div><div class="dv">${obj.company || '—'}</div></div>
        <div class="fg"><div class="dk">Timeline</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${obj.timeline || '—'}</div></div>
        <div class="fg"><div class="dk">Tasks</div><div class="dv">${pDone}/${pTotal} complete · <span style="color:${pOv ? 'var(--red)' : 'var(--green)'}">${pOv} overdue</span></div></div>
        <div class="fg"><div class="dk">Total Spend</div><div class="dv" style="color:${ov > 0 ? 'var(--red)' : 'var(--green)'}">${fmtCur(totalSpend)} / ${fmtCur(totalTarget)}</div></div>
        <div class="fg"><div class="dk">Variance</div><div class="dv" style="color:${ov > 0 ? 'var(--red)' : 'var(--green)'}">${ov > 0 ? 'Over' : 'Under'} by ${fmtCur(Math.abs(ov))}</div></div>
      </div>
      <div class="fg"><div class="dk">Progress</div><div class="dv">
        <div class="prog-wrap"><div class="prog-track" style="flex:1"><div class="prog-fill" style="width:${pct}%;background:${pCol(pct)}"></div></div><span class="prog-pct">${pct}%</span></div>
      </div></div>`;
    actions = `<button class="btn btn-ghost" onclick="openProjectBriefing('${obj.id}');closeOverlay('detailModal')">📋 Open Briefing</button><button class="btn btn-ghost" onclick="openEditForm('project','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('project','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'doc') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Status</div><div class="dv">${docBadge(obj.status)}</div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || 'General'}</span></div></div>
      <div class="fg"><div class="dk">Phase</div><div class="dv"><span class="badge b-purple">${obj.phase || '—'}</span></div></div>
      <div class="fg"><div class="dk">Last Edited</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${obj.edited || '—'}</div></div>
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="openEditForm('doc','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('doc','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'budget') {
    const v = obj.spend - obj.target;
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project}</span></div></div>
      <div class="fg"><div class="dk">Milestone</div><div class="dv">${obj.milestone || '—'}</div></div>
      <div class="fg"><div class="dk">Type</div><div class="dv"><span class="badge b-grey">${obj.type}</span></div></div>
      <div class="fg"><div class="dk">Target Budget</div><div class="dv">${fmtCur(obj.target)}</div></div>
      <div class="fg"><div class="dk">Spend</div><div class="dv" style="color:${obj.spend > obj.target ? 'var(--red)' : 'var(--green)'}">${fmtCur(obj.spend)}</div></div>
      <div class="fg"><div class="dk">Variance</div><div class="dv" style="color:${v > 0 ? 'var(--red)' : 'var(--green)'}">${v > 0 ? '-' : '+'}${fmtCur(Math.abs(v))}</div></div>
      ${obj.hours ? `<div class="fg"><div class="dk">Hours</div><div class="dv">${obj.hours}h @ ${fmtCur(obj.rate)}/h</div></div>` : ''}
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="openEditForm('budget','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('budget','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'stakeholder') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Role</div><div class="dv">${obj.title}</div></div>
      <div class="fg"><div class="dk">Company</div><div class="dv">${obj.company}</div></div>
      <div class="fg"><div class="dk">Category</div><div class="dv"><span class="badge b-grey">${obj.category}</span></div></div>
      <div class="fg"><div class="dk">Industry</div><div class="dv">${obj.industry}</div></div>
      <div class="fg"><div class="dk">Email</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:11px">${obj.email}</div></div>
      <div class="fg"><div class="dk">Phone</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:11px">${obj.phone}</div></div>
      <div class="fg"><div class="dk">Contact Preference</div><div class="dv">${obj.contact}</div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
      <div class="fg"><div class="dk">Last Contact</div><div class="dv">${fmtLastContact(obj)}</div></div>
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="openEditForm('stakeholder','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('stakeholder','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'meeting') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Date</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${fmtDate(obj.date)}${obj.time ? ` <span style="color:var(--text3)">@ ${obj.time}</span>` : ''}</div></div>
      ${obj.duration ? `<div class="fg"><div class="dk">Duration</div><div class="dv">${obj.duration}</div></div>` : ''}
      <div class="fg"><div class="dk">Type</div><div class="dv"><span class="badge ${meetType(obj.type)}">${obj.type}</span></div></div>
      <div class="fg"><div class="dk">Category</div><div class="dv"><span class="badge ${obj.project ? 'b-accent' : 'b-grey'}">${obj.project ? '📁 Project Meeting' : '🏢 Internal Meeting'}</span></div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
      <div class="fg"><div class="dk">Attendees</div><div class="dv">${obj.attendees || '—'}</div></div>
    </div>
    ${obj.notes ? `<div class="fg"><div class="dk">Notes</div><div class="dv dv-desc">${obj.notes}</div></div>` : ''}
    ${obj.nextSteps ? `<div class="fg" style="margin-top:8px"><div class="dk">Next Steps</div><div class="dv dv-desc">${obj.nextSteps}</div></div>` : ''}`;
    actions = `<button class="btn btn-ghost" onclick="openEditForm('meeting','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="openDeleteModal('meeting','${obj.id}')">🗑 Delete</button>`;
  }

  document.getElementById('detailBody').innerHTML = await Promise.resolve(body);
  document.getElementById('detailActions').innerHTML = actions;
  openOverlay('detailModal');
}

/* ── ADD / EDIT FORMS ── */
export function openAdd() {
  const tab = AppState.currentTab;
  if (tab === 'tasks' || tab === 'dashboard') openAddForm('task');
  else if (tab === 'projects') openAddForm('project');
  else if (tab === 'documents') openAddForm('doc');
  else if (tab === 'budgets') openAddForm('budget');
  else if (tab === 'stakeholders') openAddForm('stakeholder');
  else if (tab === 'meetings') openAddForm('meeting');
  else openAddForm('task');
}

export function openAddForm(type, prefill = {}) {
  AppState.editId = null;
  document.getElementById('addModalTitle').textContent = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  document.getElementById('addModalBody').innerHTML = buildForm(type, prefill);
  openOverlay('addModal');
}

export function openEditForm(type, id) {
  const map = { task: DATA.tasks, project: DATA.projects, doc: DATA.documents, budget: DATA.budgets, stakeholder: DATA.stakeholders, meeting: DATA.meetings };
  const obj = map[type]?.find(x => x.id === id);
  if (!obj) return;
  AppState.editId = { type, id };
  document.getElementById('addModalTitle').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  document.getElementById('addModalBody').innerHTML = buildForm(type, obj);
  closeOverlay('detailModal');
  openOverlay('addModal');
}

function buildForm(type, d = {}) {
  const projects = DATA.projects.map(p => p.name);
  const projOpts = projects.map(p => `<option${d.project === p ? ' selected' : ''}>${p}</option>`).join('');
  const phases = ['Initiation', 'Planning', 'Execution', 'Review', 'Launch', 'Completed'];
  const phOpts = phases.map(p => `<option${d.phase === p ? ' selected' : ''}>${p}</option>`).join('');

  if (type === 'task') {
    const taskProject = d.project || '';
    const projBudgets = taskProject ? DATA.budgets.filter(b => b.project === taskProject) : DATA.budgets;
    const budgetOpts = projBudgets.map(b => `<option value="${b.id}"${d.linkedBudgetId === b.id ? ' selected' : ''}>${b.name} — ${b.project}</option>`).join('');
    return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Task Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Draft project proposal"/></div>
      <div class="fg"><label class="fl">Responsible Person</label><input class="fi" id="f-responsible" value="${d.responsible || ''}" placeholder="e.g. Jane Smith"/></div>
    </div>
    <div class="fg"><label class="fl">Description</label><textarea class="fta" id="f-desc" placeholder="What needs to be done…">${d.desc || ''}</textarea></div>
    <div class="fg"><label class="fl">Recommendation</label><textarea class="fta" id="f-recommendation" placeholder="Recommended approach or action…">${d.recommendation || ''}</textarea></div>
    <div class="fg"><label class="fl">Interim Action</label><textarea class="fta" id="f-interimAction" placeholder="Short term or temporary action…">${d.interimAction || ''}</textarea></div>
    <div class="fg"><label class="fl">Final Action</label><textarea class="fta" id="f-finalAction" placeholder="Permanent or long term action…">${d.finalAction || ''}</textarea></div>
    <div class="fg-grid">
      <div class="fg"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p" onchange="rebuildTaskBudgetList(this.value)"/><datalist id="dl-p">${projOpts}</datalist></div>
      <div class="fg"><label class="fl">Phase</label><select class="fs" id="f-phase"><option value="">— Select —</option>${phOpts}</select></div>
      <div class="fg"><label class="fl">Status</label><select class="fs" id="f-status"><option${d.status === 'Not Started' ? ' selected' : ''}>Not Started</option><option${d.status === 'In Progress' ? ' selected' : ''}>In Progress</option><option${d.status === 'Complete' ? ' selected' : ''}>Complete</option><option${d.status === 'On Hold' ? ' selected' : ''}>On Hold</option></select></div>
      <div class="fg"><label class="fl">Priority</label><select class="fs" id="f-priority"><option value="">— None —</option><option${d.priority === 'High' ? ' selected' : ''}>High</option><option${d.priority === 'Medium' ? ' selected' : ''}>Medium</option><option${d.priority === 'Low' ? ' selected' : ''}>Low</option></select></div>
      <div class="fg"><label class="fl">Start Date</label><input class="fi" type="date" id="f-startdate" value="${d.startDate || ''}"/></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" type="date" id="f-due" value="${d.due || ''}"/></div>
      <div class="fg"><label class="fl">Actual Completion Date</label><input class="fi" type="date" id="f-actualCompletion" value="${d.actualCompletion || ''}"/></div>
      <div class="fg"><label class="fl">Progress %</label><input class="fi" type="text" id="f-progress" value="Auto calculated from Phase &amp; Status" disabled style="color:var(--text3);cursor:not-allowed;"/></div>
      <div class="fg"><label class="fl">Est. Hours</label><input class="fi" type="number" id="f-hours" min="0" value="${d.hours || ''}" placeholder="0"/></div>
      <div class="fg"><label class="fl">Linked Budget</label><select class="fs" id="f-linkedBudget"><option value="">— None —</option>${budgetOpts}</select></div>
      <div class="fg"><label class="fl">Contractor Engaged</label><select class="fs" id="f-contractorEngaged"><option value="No"${d.contractorEngaged !== 'Yes' ? ' selected' : ''}>No</option><option value="Yes"${d.contractorEngaged === 'Yes' ? ' selected' : ''}>Yes</option></select></div>
      <div class="fg"><label class="fl">Contractor Name</label><input class="fi" id="f-contractorName" value="${d.contractorName || ''}" placeholder="e.g. ABC Contractors Pty Ltd"/></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('task')">Save Task</button></div>`;
  }

  if (type === 'project') return `
    <div class="fg"><label class="fl">Project Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Website Redesign"/></div>
    <div class="fg-grid">
      <div class="fg"><label class="fl">Status</label><select class="fs" id="f-status"><option${d.status === 'Initiation' ? ' selected' : ''}>Initiation</option><option${d.status === 'Planning' ? ' selected' : ''}>Planning</option><option${d.status === 'Execution' ? ' selected' : ''}>Execution</option><option${d.status === 'Review' ? ' selected' : ''}>Review</option><option${d.status === 'Completed' ? ' selected' : ''}>Completed</option></select></div>
      <div class="fg"><label class="fl">Company / Client</label><input class="fi" id="f-company" value="${d.company || ''}" placeholder="Client company"/></div>
      <div class="fg"><label class="fl">Target Budget ($)</label><input class="fi" type="number" id="f-target" value="${d.target || ''}" placeholder="0"/></div>
      <div class="fg"><label class="fl">Current Spend ($)</label><input class="fi" type="number" id="f-spend" value="${d.spend || ''}" placeholder="0"/></div>
      <div class="fg"><label class="fl">Start Date</label><input class="fi" type="date" id="f-start" value="${d.startDate || ''}"/></div>
      <div class="fg"><label class="fl">End Date</label><input class="fi" type="date" id="f-end" value="${d.endDate || ''}"/></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('project')">Save Project</button></div>`;

  if (type === 'doc') return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Document Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Project Charter"/></div>
      <div class="fg"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p"/><datalist id="dl-p">${projOpts}</datalist></div>
      <div class="fg"><label class="fl">Phase</label><select class="fs" id="f-phase"><option value="">— Select —</option>${phOpts}</select></div>
      <div class="fg"><label class="fl">Status</label><select class="fs" id="f-status"><option${d.status === 'Draft' ? ' selected' : ''}>Draft</option><option${d.status === 'Current' ? ' selected' : ''}>Current</option><option${d.status === 'Superseded' ? ' selected' : ''}>Superseded</option></select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('doc')">Save Document</button></div>`;

  if (type === 'budget') {
    const budgetProject = d.project || DATA.projects[0]?.name || '';
    const projTasks = budgetProject ? DATA.tasks.filter(t => t.project === budgetProject) : DATA.tasks;
    const taskOpts = projTasks.map(t => `<option value="${t.id}"${d.linkedTaskId === t.id ? ' selected' : ''}>${t.name}</option>`).join('');
    return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Budget Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Budget #1"/></div>
      <div class="fg"><label class="fl">Project</label><select class="fs" id="f-project" onchange="rebuildBudgetTaskList(this.value)">${DATA.projects.map(p => `<option value="${p.name}"${d.project === p.name ? ' selected' : ''}>${p.name}</option>`).join('')}</select></div>
      <div class="fg"><label class="fl">Linked Task</label><select class="fs" id="f-linkedTask"><option value="">— None —</option>${taskOpts}</select></div>
      <div class="fg"><label class="fl">Milestone</label><input class="fi" id="f-milestone" value="${d.milestone || ''}" placeholder="e.g. Milestone #1"/></div>
      <div class="fg"><label class="fl">Type</label><select class="fs" id="f-type"><option${d.type === 'Fixed' ? ' selected' : ''}>Fixed</option><option${d.type === 'Hourly' ? ' selected' : ''}>Hourly</option></select></div>
      <div class="fg"><label class="fl">Target Budget ($)</label><input class="fi" type="number" id="f-target" value="${d.target || ''}" placeholder="0"/></div>
      <div class="fg"><label class="fl">Spend ($)</label><input class="fi" type="number" id="f-spend" value="${d.spend || ''}" placeholder="0"/></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('budget')">Save Budget</button></div>`;
  }

  if (type === 'stakeholder') return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="Full name"/></div>
      <div class="fg"><label class="fl">Job Title</label><input class="fi" id="f-title" value="${d.title || ''}" placeholder="e.g. CFO"/></div>
      <div class="fg"><label class="fl">Company</label><input class="fi" id="f-company" value="${d.company || ''}" placeholder="Company name"/></div>
      <div class="fg"><label class="fl">Category</label><select class="fs" id="f-category"><option${d.category === 'Team' ? ' selected' : ''}>Team</option><option${d.category === 'Clients' ? ' selected' : ''}>Clients</option><option${d.category === 'Investors' ? ' selected' : ''}>Investors</option><option${d.category === 'Contractor' ? ' selected' : ''}>Contractor</option><option${d.category === 'Consultant' ? ' selected' : ''}>Consultant</option><option${d.category === 'Inspector' ? ' selected' : ''}>Inspector</option><option${d.category === 'Government' ? ' selected' : ''}>Government</option></select></div>
      <div class="fg"><label class="fl">Industry</label><input class="fi" id="f-industry" value="${d.industry || ''}" placeholder="e.g. Finance"/></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" type="email" id="f-email" value="${d.email || ''}" placeholder="email@domain.com"/></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="f-phone" value="${d.phone || ''}" placeholder="000-000-0000"/></div>
      <div class="fg"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p"/><datalist id="dl-p">${projOpts}</datalist></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('stakeholder')">Save Stakeholder</button></div>`;

  if (type === 'meeting') {
    const isProject = d.project !== undefined ? !!d.project : true;
    return `
    <div class="fg"><label class="fl">Meeting Title *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Project Kickoff"/></div>
    <div class="fg-grid">
      <div class="fg"><label class="fl">Meeting Category</label><select class="fs" id="f-meeting-category" onchange="
        const isInternal = this.value === 'internal';
        document.getElementById('f-project-wrap').style.display = isInternal ? 'none' : '';
        if (isInternal) document.getElementById('f-project').value = '';
      "><option value="project"${isProject ? ' selected' : ''}>Project Meeting</option><option value="internal"${!isProject ? ' selected' : ''}>Internal Meeting</option></select></div>
      <div class="fg" id="f-project-wrap" style="${!isProject ? 'display:none' : ''}"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p" placeholder="Select a project"/><datalist id="dl-p">${projOpts}</datalist></div>
      <div class="fg"><label class="fl">Date</label><input class="fi" type="date" id="f-date" value="${d.date || ''}"/></div>
      <div class="fg"><label class="fl">Time</label><input class="fi" type="time" id="f-time" value="${d.time || ''}"/></div>
      <div class="fg"><label class="fl">Duration</label><select class="fs" id="f-duration"><option value="">— None —</option><option value="15 min"${d.duration === '15 min' ? ' selected' : ''}>15 min</option><option value="30 min"${d.duration === '30 min' ? ' selected' : ''}>30 min</option><option value="45 min"${d.duration === '45 min' ? ' selected' : ''}>45 min</option><option value="1 hour"${d.duration === '1 hour' ? ' selected' : ''}>1 hour</option><option value="1.5 hours"${d.duration === '1.5 hours' ? ' selected' : ''}>1.5 hours</option><option value="2 hours"${d.duration === '2 hours' ? ' selected' : ''}>2 hours</option><option value="3 hours"${d.duration === '3 hours' ? ' selected' : ''}>3 hours</option><option value="Half day"${d.duration === 'Half day' ? ' selected' : ''}>Half day</option><option value="Full day"${d.duration === 'Full day' ? ' selected' : ''}>Full day</option></select></div>
      <div class="fg"><label class="fl">Type</label><select class="fs" id="f-type"><option${d.type === 'Offline' ? ' selected' : ''}>Offline</option><option${d.type === 'Online' ? ' selected' : ''}>Online</option><option${d.type === 'Daily' ? ' selected' : ''}>Daily</option><option${d.type === 'Weekly' ? ' selected' : ''}>Weekly</option><option${d.type === 'Monthly' ? ' selected' : ''}>Monthly</option><option${d.type === 'Training' ? ' selected' : ''}>Training</option></select></div>
      <div class="fg"><label class="fl">Attendees</label><input class="fi" id="f-attendees" value="${d.attendees || ''}" placeholder="e.g. Jane Smith, John Doe"/></div>
    </div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fta" id="f-notes" placeholder="Meeting notes…">${d.notes || ''}</textarea></div>
    <div class="fg"><label class="fl">Next Steps</label><textarea class="fta" id="f-nextSteps" placeholder="Action items from this meeting…">${d.nextSteps || ''}</textarea></div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="saveForm('meeting')">Save Meeting</button></div>`;
  }

  return `<div class="modal-foot"><button class="btn btn-ghost" onclick="closeOverlay('addModal')">Cancel</button></div>`;
}

/* ── Rebuild budget dropdown when project changes in task form ── */
export function rebuildTaskBudgetList(projectName) {
  const select = document.getElementById('f-linkedBudget');
  if (!select) return;
  const budgets = projectName ? DATA.budgets.filter(b => b.project === projectName) : DATA.budgets;
  select.innerHTML = `<option value="">— None —</option>` +
    budgets.map(b => `<option value="${b.id}">${b.name} — ${b.project}</option>`).join('');
}

export function rebuildBudgetTaskList(projectName) {
  const select = document.getElementById('f-linkedTask');
  if (!select) return;
  const tasks = projectName ? DATA.tasks.filter(t => t.project === projectName) : [];
  select.innerHTML = `<option value="">— None —</option>` +
    tasks.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

/* ── SAVE FORM ── */
export function saveForm(type) {
  const name = gv('f-name');
  if (!name) { toast('⚠ Name is required'); return; }

  const newId = AppState.editId?.id || (type[0] + Date.now());
  let obj = { id: newId };

  if (type === 'task') {
    obj = {
      ...obj, name,
      desc: gv('f-desc'),
      recommendation: gv('f-recommendation'),
      interimAction: gv('f-interimAction'),
      finalAction: gv('f-finalAction'),
      responsible: gv('f-responsible'),
      project: gv('f-project'),
      phase: gv('f-phase'),
      status: gv('f-status') || 'Not Started',
      priority: gv('f-priority'),
      startDate: gv('f-startdate'),
      due: gv('f-due'),
      actualCompletion: gv('f-actualCompletion'),
      progress: gn('f-progress'),
      hours: gn('f-hours') || null,
      linkedBudgetId: gv('f-linkedBudget') || null,
      contractorEngaged: gv('f-contractorEngaged') || 'No',
      contractorName: gv('f-contractorName')
    };
  } else if (type === 'project') {
    const start = gv('f-start'), end = gv('f-end');
    const tl = start && end ? `${fmtDate(start)} → ${fmtDate(end)}` : start ? `From ${fmtDate(start)}` : end ? `Until ${fmtDate(end)}` : '';
    obj = { ...obj, name, status: gv('f-status') || 'Initiation', company: gv('f-company'), target: gn('f-target'), spend: gn('f-spend'), timeline: tl, startDate: start, endDate: end, active: true, completed: false };
  } else if (type === 'doc') {
    obj = { ...obj, name, project: gv('f-project'), phase: gv('f-phase'), status: gv('f-status') || 'Draft', edited: 'Today' };
  } else if (type === 'budget') {
    obj = { ...obj, name, project: gv('f-project'), milestone: gv('f-milestone'), type: gv('f-type') || 'Fixed', target: gn('f-target'), spend: gn('f-spend'), linkedTaskId: gv('f-linkedTask') || null };
  } else if (type === 'stakeholder') {
    obj = { ...obj, name, title: gv('f-title'), company: gv('f-company'), category: gv('f-category') || 'Team', industry: gv('f-industry'), email: gv('f-email'), phone: gv('f-phone'), project: gv('f-project'), contact: 'Email', lastContactDate: new Date().toISOString().slice(0, 10) };
  } else if (type === 'meeting') {
    obj = { ...obj, name, project: gv('f-project') || '', date: gv('f-date'), time: gv('f-time') || '', duration: gv('f-duration') || '', type: gv('f-type') || 'Offline', attendees: gv('f-attendees'), notes: gv('f-notes') || '', nextSteps: gv('f-nextSteps') };
  }

  const isEdit = !!AppState.editId;
  const map = { task: DATA.tasks, project: DATA.projects, doc: DATA.documents, budget: DATA.budgets, stakeholder: DATA.stakeholders, meeting: DATA.meetings };
  const arr = map[type];
  if (isEdit) {
    const i = arr.findIndex(x => x.id === AppState.editId.id);
    if (i >= 0) arr[i] = obj;
  } else {
    arr.push(obj);
  }

  closeOverlay('addModal');
  renderContent();
  renderSidebar();
  toast(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} ${isEdit ? 'updated' : 'saved'}`);
  AppState.editId = null;

  // Persist to Supabase then reload data
  const reload = async () => {
    const briefingId = AppState.currentBriefingId;
    if (type === 'project') await saveProject(obj, isEdit);
    else if (type === 'task') await saveTask(obj, isEdit);
    else if (type === 'budget') await saveBudget(obj, isEdit);
    else if (type === 'stakeholder') await saveStakeholder(obj, isEdit);
    else if (type === 'meeting') await saveMeeting(obj, isEdit);
    await loadData();
    if (briefingId) AppState.currentBriefingId = briefingId;
    renderContent();
    renderSidebar();
  };
  reload();
}

/* ── DELETE ── */
export function deleteItem(type, id) {
  const labels = { task: 'task', project: 'project and ALL linked tasks, documents, budgets, meetings and stakeholders', doc: 'document', budget: 'budget item', stakeholder: 'stakeholder', meeting: 'meeting' };

  if (type === 'project') {
    const p = DATA.projects.find(x => x.id === id);
    if (p) {
      const name = p.name;
      DATA.tasks = DATA.tasks.filter(x => x.project !== name);
      DATA.documents = DATA.documents.filter(x => x.project !== name);
      DATA.budgets = DATA.budgets.filter(x => x.project !== name);
      DATA.meetings = DATA.meetings.filter(x => x.project !== name);
      DATA.stakeholders = DATA.stakeholders.filter(x => x.project !== name);
    }
  }

  const tableMap = { task: 'tasks', project: 'projects', doc: 'documents', budget: 'budgets', stakeholder: 'stakeholders', meeting: 'meetings' };
  const map = { task: DATA.tasks, project: DATA.projects, doc: DATA.documents, budget: DATA.budgets, stakeholder: DATA.stakeholders, meeting: DATA.meetings };
  map[type] = map[type].filter(x => x.id !== id);
  Object.assign(DATA, map);
  closeOverlay('detailModal');
  if (type === 'project' && AppState.currentBriefingId) { AppState.currentBriefingId = null; }
  renderContent();
  renderSidebar();
  toast('🗑 Deleted');
  if (type !== 'doc') {
    deleteRecord(tableMap[type], id).then(() => {
      loadData().then(() => { renderContent(); renderSidebar(); });
    });
  }
}