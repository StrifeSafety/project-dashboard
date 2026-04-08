import { AppState, TABS } from './state.js';
import { renderSubnav } from './components/subnav.js';
import { renderSidebar } from './components/sidebar.js';
import { renderDashboard, initCompletionChart, initBudgetChart, initDonutChart } from './renderers/dashboard.js';
import { renderProjects } from './renderers/projects.js';
import { renderDocuments } from './renderers/documents.js';
import { renderTasks } from './renderers/tasks.js';
import { renderBudgets } from './renderers/budgets.js';
import { renderStakeholders } from './renderers/stakeholders.js';
import { renderMeetings } from './renderers/meetings.js';
import { renderStatistics } from './renderers/statistics.js';
import { renderTeam } from './renderers/team.js';
import { renderAdmin } from './renderers/admin.js';
import { renderProjectBriefing } from './renderers/projectBriefing.js';

/* ══════════════════════════════════════════════════
   ROUTER — Tab switching & content rendering
   ══════════════════════════════════════════════════ */

/* ── URL hash helpers ── */
function buildHash(tab, sub, briefingId) {
  if (briefingId) return `#${tab}/briefing/${briefingId}`;
  if (sub && sub > 0) return `#${tab}/${sub}`;
  return `#${tab}`;
}

function parseHash(hash) {
  const h = hash.replace('#', '');
  const parts = h.split('/');
  const tab = parts[0] || 'dashboard';
  const isBriefing = parts[1] === 'briefing';
  const briefingId = isBriefing ? parts[2] : null;
  const sub = !isBriefing && parts[1] ? parseInt(parts[1]) || 0 : 0;
  return { tab, sub, briefingId };
}

function applyState(tab, sub, briefingId, pushHistory = true) {
  AppState.currentTab = tab;
  AppState.currentSubtab = sub;
  AppState.currentBriefingId = briefingId || null;
  AppState.sbProject = null;
  AppState.sbStatus = null;

  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  document.getElementById('navTabs')?.classList.remove('mobile-open');

  if (pushHistory) {
    const hash = buildHash(tab, sub, briefingId);
    history.pushState({ tab, sub, briefingId }, '', hash);
  }

  renderSubnav();
  renderSidebar();
  renderContent();
}

export function switchTab(tab) {
  applyState(tab, 0, null, true);
}

export function switchTabFiltered(tab, project) {
  AppState.currentTab = tab;
  AppState.currentSubtab = 0;
  AppState.currentBriefingId = null;
  AppState.sbProject = project || null;
  AppState.sbStatus = null;

  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  document.getElementById('navTabs')?.classList.remove('mobile-open');

  const hash = buildHash(tab, 0, null);
  history.pushState({ tab, sub: 0, briefingId: null }, '', hash);

  renderSubnav();
  renderSidebar();
  renderContent();
}

export function switchSubtab(i) {
  AppState.currentSubtab = i;
  document.querySelectorAll('.subnav-tab').forEach((b, j) => b.classList.toggle('active', j === i));
  const hash = buildHash(AppState.currentTab, i, null);
  history.pushState({ tab: AppState.currentTab, sub: i, briefingId: null }, '', hash);
  renderContent();
}

export function switchToBriefing(id) {
  applyState('projects', 0, id, true);
}

export async function renderContent() {
  const ca = document.getElementById('contentArea');
  const tab = AppState.currentTab;
  const sub = AppState.currentSubtab;

  if (tab === 'projects' && AppState.currentBriefingId) {
    ca.innerHTML = await renderProjectBriefing(AppState.currentBriefingId);
    return;
  }
  if (tab === 'dashboard') ca.innerHTML = await renderDashboard();
  else if (tab === 'projects') ca.innerHTML = await renderProjects(sub);
  else if (tab === 'documents') await renderDocuments(sub);
  else if (tab === 'tasks') ca.innerHTML = await renderTasks(sub);
  else if (tab === 'budgets') ca.innerHTML = await renderBudgets(sub);
  else if (tab === 'stakeholders') ca.innerHTML = await renderStakeholders(sub);
  else if (tab === 'meetings') ca.innerHTML = await renderMeetings(sub);
  else if (tab === 'statistics') ca.innerHTML = await renderStatistics(sub);
  else if (tab === 'team') ca.innerHTML = await renderTeam(sub);
  else if (tab === 'admin') ca.innerHTML = await renderAdmin(sub);

  if (tab === 'dashboard' || tab === 'statistics') {
    initCompletionChart();
    initBudgetChart();
    initDonutChart();
  }
}

/* ── Handle browser back/forward ── */
window.addEventListener('popstate', e => {
  if (e.state) {
    const { tab, sub, briefingId } = e.state;
    AppState.currentTab = tab;
    AppState.currentSubtab = sub || 0;
    AppState.currentBriefingId = briefingId || null;
    AppState.sbProject = null;
    AppState.sbStatus = null;

    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const tabBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    renderSubnav();
    renderSidebar();
    renderContent();
  } else {
    const { tab, sub, briefingId } = parseHash(window.location.hash);
    applyState(tab, sub, briefingId, false);
  }
});