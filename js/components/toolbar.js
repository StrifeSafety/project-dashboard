import { DATA } from '../storage.js';
import { toast } from './toast.js';

/* ══════════════════════════════════════════════════
   TOOLBAR — Export modal and Excel generation
   ══════════════════════════════════════════════════ */

export function openExportModal() {
  // Populate project dropdown
  const sel = document.getElementById('exp-project');
  sel.innerHTML = '<option value="">All Projects</option>' +
    DATA.projects.map(p => `<option value="${p.name}">${p.name}</option>`).join('');

  // Update preview on change
  const updatePreview = () => {
    const project = sel.value;
    const sections = getSelectedSections();
    const counts = [];
    if (sections.projects) {
      const d = project ? DATA.projects.filter(p => p.name === project) : DATA.projects;
      counts.push(`${d.length} project${d.length !== 1 ? 's' : ''}`);
    }
    if (sections.tasks) {
      const d = project ? DATA.tasks.filter(t => t.project === project) : DATA.tasks;
      counts.push(`${d.length} task${d.length !== 1 ? 's' : ''}`);
    }
    if (sections.budgets) {
      const d = project ? DATA.budgets.filter(b => b.project === project) : DATA.budgets;
      counts.push(`${d.length} budget item${d.length !== 1 ? 's' : ''}`);
    }
    if (sections.meetings) {
      const d = project ? DATA.meetings.filter(m => m.project === project) : DATA.meetings;
      counts.push(`${d.length} meeting${d.length !== 1 ? 's' : ''}`);
    }
    if (sections.stakeholders) {
      const d = project ? DATA.stakeholders.filter(s => s.project === project) : DATA.stakeholders;
      counts.push(`${d.length} stakeholder${d.length !== 1 ? 's' : ''}`);
    }
    if (sections.documents) {
      const d = project ? DATA.documents.filter(d => d.project === project) : DATA.documents;
      counts.push(`${d.length} document${d.length !== 1 ? 's' : ''}`);
    }
    document.getElementById('exp-preview').innerHTML = counts.length
      ? `<span style="color:var(--text2)">Will export: </span>${counts.join(', ')}`
      : `<span style="color:var(--red)">Please select at least one section.</span>`;
  };

  sel.onchange = updatePreview;
  ['exp-projects','exp-tasks','exp-budgets','exp-meetings','exp-stakeholders','exp-documents']
    .forEach(id => { document.getElementById(id).onchange = updatePreview; });

  updatePreview();
  document.getElementById('exportModal').classList.add('open');
}

export function closeExportModal() {
  document.getElementById('exportModal').classList.remove('open');
}

export function getSelectedSections() {
  return {
    projects:     document.getElementById('exp-projects').checked,
    tasks:        document.getElementById('exp-tasks').checked,
    budgets:      document.getElementById('exp-budgets').checked,
    meetings:     document.getElementById('exp-meetings').checked,
    stakeholders: document.getElementById('exp-stakeholders').checked,
    documents:    document.getElementById('exp-documents').checked,
  };
}

export function generateExport() {
  const project = document.getElementById('exp-project').value;
  const sections = getSelectedSections();
  const wb = XLSX.utils.book_new();
  const allRows = [];
  const fmtDate = d => { if (!d) return ''; const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const blank = ['', '', '', '', '', '', '', '', '', ''];

  if (sections.projects) {
    const data = project ? DATA.projects.filter(p => p.name === project) : DATA.projects;
    allRows.push(['PROJECTS', '', '', '', '', '', '', '']);
    allRows.push(['Name', 'Status', 'Company', 'Timeline', 'Target Budget', 'Spend', 'Variance', 'Active']);
    data.forEach(p => {
      const variance = (p.spend || 0) - (p.target || 0);
      allRows.push([p.name, p.status, p.company || '', p.timeline || '', p.target || 0, p.spend || 0, variance, p.active ? 'Yes' : 'No']);
    });
    allRows.push(blank);
  }

  if (sections.tasks) {
    const data = project ? DATA.tasks.filter(t => t.project === project) : DATA.tasks;
    allRows.push(['TASKS', '', '', '', '', '', '', '', '', '']);
    allRows.push(['Name', 'Project', 'Phase', 'Status', 'Priority', 'Progress %', 'Start Date', 'Due Date', 'Actual Completion', 'Responsible', 'Hours', 'Contractor', 'Notes']);
    data.forEach(t => {
      allRows.push([t.name, t.project, t.phase || '', t.status, t.priority || '', t.progress || 0, fmtDate(t.startDate), fmtDate(t.due), fmtDate(t.actualCompletion), t.responsible || '', t.hours || '', t.contractorEngaged === 'Yes' ? (t.contractorName || 'Yes') : 'No', t.desc || '']);
    });
    allRows.push(blank);
  }

  if (sections.budgets) {
    const data = project ? DATA.budgets.filter(b => b.project === project) : DATA.budgets;
    allRows.push(['BUDGETS', '', '', '', '', '', '']);
    allRows.push(['Name', 'Project', 'Milestone', 'Type', 'Target ($)', 'Spend ($)', 'Variance ($)']);
    data.forEach(b => {
      const variance = (b.spend || 0) - (b.target || 0);
      allRows.push([b.name, b.project, b.milestone || '', b.type, b.target || 0, b.spend || 0, variance]);
    });
    allRows.push(blank);
  }

  if (sections.meetings) {
    const data = project ? DATA.meetings.filter(m => m.project === project) : DATA.meetings;
    allRows.push(['MEETINGS', '', '', '', '', '', '']);
    allRows.push(['Title', 'Project', 'Date', 'Time', 'Duration', 'Type', 'Attendees', 'Notes', 'Next Steps']);
    data.forEach(m => {
      allRows.push([m.name, m.project || 'Internal', fmtDate(m.date), m.time || '', m.duration || '', m.type, m.attendees || '', m.notes || '', m.nextSteps || '']);
    });
    allRows.push(blank);
  }

  if (sections.stakeholders) {
    const data = project ? DATA.stakeholders.filter(s => s.project === project) : DATA.stakeholders;
    allRows.push(['STAKEHOLDERS', '', '', '', '', '', '', '']);
    allRows.push(['Name', 'Title', 'Company', 'Category', 'Industry', 'Email', 'Phone', 'Project', 'Contact Preference']);
    data.forEach(s => {
      allRows.push([s.name, s.title || '', s.company || '', s.category || '', s.industry || '', s.email || '', s.phone || '', s.project || '', s.contact || '']);
    });
    allRows.push(blank);
  }

  if (sections.documents) {
    const data = project ? DATA.documents.filter(d => d.project === project) : DATA.documents;
    allRows.push(['DOCUMENTS', '', '', '', '']);
    allRows.push(['Name', 'Project', 'Phase', 'Status', 'Last Edited']);
    data.forEach(d => {
      allRows.push([d.name, d.project || '', d.phase || '', d.status || '', d.edited || '']);
    });
  }

  if (allRows.length === 0) {
    toast('⚠ Please select at least one section');
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Style section header rows bold by finding them
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (cell && typeof cell.v === 'string' && ['PROJECTS','TASKS','BUDGETS','MEETINGS','STAKEHOLDERS','DOCUMENTS'].includes(cell.v)) {
      if (!cell.s) cell.s = {};
      cell.s.font = { bold: true, sz: 13 };
      cell.s.fill = { fgColor: { rgb: '1e1e2e' } };
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 40 }
  ];

  const projectLabel = project ? `_${project.replace(/\s+/g, '_')}` : '';
  const date = new Date().toISOString().slice(0, 10);
  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Export');
  XLSX.writeFile(wb, `ProjectDashboard${projectLabel}_${date}.xlsx`);

  toast('✓ Excel file downloaded');
  closeExportModal();
}