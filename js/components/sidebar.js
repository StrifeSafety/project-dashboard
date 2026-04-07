import { AppState, TABS } from '../state.js';
import { DATA } from '../storage.js';
import { pColor, statusIcon } from '../utils.js';
import { renderContent } from '../router.js';
import { openProjectBriefing } from '../renderers/projectBriefing.js';

/* ══════════════════════════════════════════════════
   SIDEBAR — Project/status filter sidebar
   ══════════════════════════════════════════════════ */

export function getCount(p) {
  if (AppState.currentTab === 'tasks') return DATA.tasks.filter(t => !p || t.project === p).length;
  if (AppState.currentTab === 'documents') return DATA.documents.filter(d => !p || d.project === p).length;
  if (AppState.currentTab === 'budgets') return DATA.budgets.filter(b => !p || b.project === p).length;
  if (AppState.currentTab === 'stakeholders') return DATA.stakeholders.filter(s => !p || s.project === p).length;
  if (AppState.currentTab === 'meetings') return DATA.meetings.filter(m => !p || m.project === p).length;
  if (AppState.currentTab === 'projects') return DATA.projects.filter(p2 => !p || p2.name === p).length;
  return DATA.tasks.filter(t => !p || t.project === p).length;
}

export function sbFilter(p) {
  // If we are in a project briefing, navigate directly to that project's briefing
  if (AppState.currentBriefingId && p) {
    const project = DATA.projects.find(proj => proj.name === p);
    if (project) {
      openProjectBriefing(project.id);
      return;
    }
  }
  AppState.sbProject = p;
  AppState.sbStatus = null;
  renderSidebar();
  renderContent();
}

export function sbStatusFilter(s) {
  AppState.sbStatus = s;
  AppState.sbProject = null;
  renderSidebar();
  renderContent();
}

export function renderSidebar() {
  const sb = document.getElementById('sidebar');
  if (!TABS[AppState.currentTab]?.sidebar) { sb.innerHTML = ''; return; }

  const projects = AppState.currentTab === 'projects'
    ? DATA.projects.map(p => p.name).filter(Boolean).sort()
    : [...new Set(DATA.tasks.map(t => t.project).filter(Boolean))].sort();

  const statusOptions = {
    tasks: ['Complete', 'In Progress', 'Not Started', 'On Hold'],
    documents: ['Draft', 'Current', 'Superseded'],
    projects: ['Initiation', 'Planning', 'Execution', 'Completed'],
    budgets: ['Under Budget', 'Meets Budget', 'Over Budget'],
    stakeholders: ['Team', 'Clients', 'Investors', 'Contractor', 'Consultant', 'Inspector', 'Government'],
    meetings: ['Online', 'Offline', 'Daily', 'Weekly', 'Training'],
  };
  const options = statusOptions[AppState.currentTab] || statusOptions.tasks;

  sb.innerHTML = `
    <div class="sb-section">
      <span class="sb-label">Projects</span>
      <button class="sb-item${!AppState.sbProject && !AppState.sbStatus ? ' active' : ''}" data-filter-project="">
        <span class="sb-icon">◈</span> All <span class="sb-count">${getCount(null)}</span>
      </button>
      ${projects.map(p => `
        <button class="sb-item${AppState.sbProject === p ? ' active' : ''}" data-filter-project="${p}">
          <span class="pdot" style="background:${pColor(p)}"></span>${p}
          <span class="sb-count">${getCount(p)}</span>
        </button>
      `).join('')}
    </div>
    <div class="sb-divider"></div>
    <div class="sb-section">
      <span class="sb-label">${AppState.currentTab === 'stakeholders' ? 'Category' : AppState.currentTab === 'meetings' ? 'Type' : 'Status'}</span>
      ${options.map(s => `
        <button class="sb-item${AppState.sbStatus === s ? ' active' : ''}" data-filter-status="${s}">
          <span class="sb-icon">${statusIcon(s)}</span>${s}
        </button>
      `).join('')}
    </div>
  `;

  /* Delegated event listener — replaces all inline onclick handlers on sidebar buttons */
  sb.addEventListener('click', e => {
    const btn = e.target.closest('.sb-item');
    if (!btn) return;
    if (btn.dataset.filterProject !== undefined) {
      sbFilter(btn.dataset.filterProject || null);
    } else if (btn.dataset.filterStatus !== undefined) {
      sbStatusFilter(btn.dataset.filterStatus);
    }
  });
}