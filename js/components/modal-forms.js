import { AppState } from "../state.js";
import { DATA, loadData, saveProject, saveTask, saveBudget, saveStakeholder, saveMeeting } from "../storage.js";
import { fmtDate, gv, gn } from "../utils.js";
import { toast } from "./toast.js";
import { renderContent } from "../router.js";
import { renderSidebar } from "./sidebar.js";
import { openOverlay, closeOverlay } from "./modal.js";

/* ══════════════════════════════════════════════════
   MODAL — Add / Edit forms and Save
   ══════════════════════════════════════════════════ */

export function openAdd() {
  const tab = AppState.currentTab;
  if (tab === 'tasks') openAddForm('task');
  else if (tab === 'dashboard') openAddForm('project');
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
      <div class="fg"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p" onchange="App.rebuildTaskBudgetList(this.value)"/><datalist id="dl-p">${projOpts}</datalist></div>
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
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('task')">Save Task</button></div>`;
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
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('project')">Save Project</button></div>`;

  if (type === 'doc') return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Document Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Project Charter"/></div>
      <div class="fg"><label class="fl">Project</label><input class="fi" id="f-project" value="${d.project || ''}" list="dl-p"/><datalist id="dl-p">${projOpts}</datalist></div>
      <div class="fg"><label class="fl">Phase</label><select class="fs" id="f-phase"><option value="">— Select —</option>${phOpts}</select></div>
      <div class="fg"><label class="fl">Status</label><select class="fs" id="f-status"><option${d.status === 'Draft' ? ' selected' : ''}>Draft</option><option${d.status === 'Current' ? ' selected' : ''}>Current</option><option${d.status === 'Superseded' ? ' selected' : ''}>Superseded</option></select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('doc')">Save Document</button></div>`;

  if (type === 'budget') {
    const budgetProject = d.project || DATA.projects[0]?.name || '';
    const projTasks = budgetProject ? DATA.tasks.filter(t => t.project === budgetProject) : DATA.tasks;
    const taskOpts = projTasks.map(t => `<option value="${t.id}"${d.linkedTaskId === t.id ? ' selected' : ''}>${t.name}</option>`).join('');
    return `
    <div class="fg-grid">
      <div class="fg"><label class="fl">Budget Name *</label><input class="fi" id="f-name" value="${d.name || ''}" placeholder="e.g. Budget #1"/></div>
      <div class="fg"><label class="fl">Project</label><select class="fs" id="f-project" onchange="App.rebuildBudgetTaskList(this.value)">${DATA.projects.map(p => `<option value="${p.name}"${d.project === p.name ? ' selected' : ''}>${p.name}</option>`).join('')}</select></div>
      <div class="fg"><label class="fl">Linked Task</label><select class="fs" id="f-linkedTask"><option value="">— None —</option>${taskOpts}</select></div>
      <div class="fg"><label class="fl">Milestone</label><input class="fi" id="f-milestone" value="${d.milestone || ''}" placeholder="e.g. Milestone #1"/></div>
      <div class="fg"><label class="fl">Type</label><select class="fs" id="f-type"><option${d.type === 'Fixed' ? ' selected' : ''}>Fixed</option><option${d.type === 'Hourly' ? ' selected' : ''}>Hourly</option></select></div>
      <div class="fg"><label class="fl">Target Budget ($)</label><input class="fi" type="number" id="f-target" value="${d.target || ''}" placeholder="0"/></div>
      <div class="fg"><label class="fl">Spend ($)</label><input class="fi" type="number" id="f-spend" value="${d.spend || ''}" placeholder="0"/></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('budget')">Save Budget</button></div>`;
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
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('stakeholder')">Save Stakeholder</button></div>`;

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
    <div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button><button class="btn btn-primary" onclick="App.saveForm('meeting')">Save Meeting</button></div>`;
  }

  return `<div class="modal-foot"><button class="btn btn-ghost" onclick="App.closeOverlay('addModal')">Cancel</button></div>`;
}

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