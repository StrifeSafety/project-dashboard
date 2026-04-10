import { AppState, TABS, pColor } from './state.js';
import { initAuth, renderAuthScreen, handleSignOut } from './auth.js';
import { createInvite, deleteInvite, createWorkspace, supabase } from './supabase.js';
import { loadData, loadWorkspaces, validateData, DATA } from './storage.js';
import { openExportModal, closeExportModal, generateExport } from './components/toolbar.js';
window.App = {};
window.App.closeExportModal = closeExportModal;
window.App.generateExport = generateExport;
window.App.openExportModal = openExportModal;
import { openAdd, closeOverlay, openDetail, openEditForm, openAddForm, saveForm, deleteItem, rebuildTaskBudgetList, rebuildBudgetTaskList } from './components/modal.js';
import { renderSidebar } from './components/sidebar.js';
import { renderSubnav } from './components/subnav.js';
import { renderContent, switchTab, switchSubtab, switchToBriefing, switchTabFiltered } from './router.js';
import { openProjectBriefing, openAddTaskForProject, openAddMeetingForProject } from './renderers/projectBriefing.js';
import { filterTasks } from './renderers/tasks.js';
import { toast } from './components/toast.js';

/* ══════════════════════════════════════════════════
   APP — Bootstrap & event binding
   ══════════════════════════════════════════════════ */

/* ── Expose functions to global scope for inline onclick handlers ── */
window.App.switchTab = switchTab;
window.App.switchSubtab = switchSubtab;
window.App.openDetail = openDetail;
window.App.openEditForm = openEditForm;
window.App.openAddForm = openAddForm;
window.App.saveForm = saveForm;
window.App.deleteItem = deleteItem;
window.App.openProjectBriefing = openProjectBriefing;
window.App.openAddTaskForProject = openAddTaskForProject;
window.App.openAddMeetingForProject = openAddMeetingForProject;
window.App.closeOverlay = closeOverlay;
window.App.filterTasks = filterTasks;
window.App.AppState = AppState;
window.App.renderContent = renderContent;
window.App.switchToBriefing = switchToBriefing;
window.App.switchTabFiltered = switchTabFiltered;
window.App.rebuildTaskBudgetList = rebuildTaskBudgetList;
window.App.rebuildBudgetTaskList = rebuildBudgetTaskList;
window.App.sendInvite = async () => {
  const email = document.getElementById('invite-email')?.value?.trim();
  const feedback = document.getElementById('invite-feedback');
  if (!email) { feedback.style.display='block'; feedback.style.color='var(--red)'; feedback.textContent='Please enter an email address.'; return; }
  feedback.style.display='block'; feedback.style.color='var(--text3)'; feedback.textContent='Sending…';
  const wsId = document.getElementById('invite-workspace')?.value || AppState.currentWorkspaceId;
  const { data, error } = await createInvite(email, wsId, AppState.currentUser.id);
  if (error) { feedback.style.color='var(--red)'; feedback.textContent='Error: ' + error.message; return; }
  feedback.style.color='var(--green)'; feedback.textContent=`✓ Invite created for ${email}. Copy the link below and share it with them.`;
  document.getElementById('invite-email').value = '';
  renderContent();
};
window.App.cancelInvite = async (id) => {
  document.getElementById('deleteModalMsg').textContent = 'Are you sure you want to rescind this invite? The invite link will no longer work.';
  document.getElementById('deleteModalConfirmBtn').onclick = async () => {
    window.App.closeDeleteModal();
    await deleteInvite(id);
    toast('✓ Invite rescinded');
    renderContent();
  };
  document.getElementById('deleteModal').classList.add('open');
};
window.App.switchWorkspace = async (wsId) => {
  AppState.currentWorkspaceId = wsId;
  AppState.organisationId = wsId;
  AppState.currentTab = 'dashboard';
  AppState.currentSubtab = 0;
  AppState.currentBriefingId = null;
  AppState.sbProject = null;
  AppState.sbStatus = null;
  history.replaceState({ tab: 'dashboard', sub: 0, briefingId: null }, '', '#dashboard');
  await loadData();
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const tabBtn = document.querySelector('.nav-tab[data-tab="dashboard"]');
  if (tabBtn) tabBtn.classList.add('active');
  renderContent();
  renderSidebar();
  renderSubnav();
  window.App.renderWorkspaceSwitcher();
  const dd = document.getElementById('wsDropdown');
  if (dd) dd.style.display = 'none';
};

window.App.createNewWorkspace = () => {
  const dd = document.getElementById('wsDropdown');
  if (dd) dd.style.display = 'none';
  document.getElementById('ws-name-input').value = '';
  document.getElementById('createWorkspaceModal').classList.add('open');
};

window.App.submitCreateWorkspace = async () => {
  const name = document.getElementById('ws-name-input').value.trim();
  if (!name) { toast('⚠ Please enter a workspace name'); return; }
  document.getElementById('createWorkspaceModal').classList.remove('open');
  const { data, error } = await createWorkspace(name);
  if (error) { toast('⚠ Error creating workspace: ' + error.message); return; }
  await loadWorkspaces();
  AppState.currentWorkspaceId = data.id;
  AppState.organisationId = data.id;
  await loadData();
  renderContent();
  renderSidebar();
  window.App.renderWorkspaceSwitcher();
  toast('✓ Workspace "' + name + '" created');
};

window.App.renderWorkspaceSwitcher = function() {
  const el = document.getElementById('workspaceSwitcher');
  if (!el) return;
  const current = AppState.workspaces.find(w => w.id === AppState.currentWorkspaceId);
  el.innerHTML = `
    <div class="ws-switcher" id="wsSwitcherBtn" onclick="App.toggleWsDropdown()">
      <span class="ws-dot"></span>
      <span class="ws-name">${current?.name || 'Select Workspace'}</span>
      <span style="font-size:10px;opacity:.6">▾</span>
    </div>
    <div class="ws-dropdown" id="wsDropdown" style="display:none">
      ${AppState.workspaces.map(w => `
        <div class="ws-option${w.id === AppState.currentWorkspaceId ? ' active' : ''}" onclick="App.switchWorkspace('${w.id}')">
          <span class="ws-dot"></span>
          <span>${w.name}</span>
          ${w.role === 'owner' ? `<span style="font-family:'DM Mono',monospace;font-size:9px;opacity:.5">owner</span><span onclick="event.stopPropagation();App.adminDeleteWorkspace('${w.id}','${w.name}')" style="font-size:11px;color:var(--red);margin-left:auto;cursor:pointer;padding:2px 6px;border-radius:4px;opacity:.7" title="Delete workspace">🗑</span>` : ''}
        </div>`).join('')}
      <div class="ws-divider"></div>
      <div class="ws-option" onclick="App.createNewWorkspace()">
        <span style="font-size:13px">＋</span>
        <span>New Workspace</span>
      </div>
    </div>
  `;
};

window.App.removeMember = async (memberId, memberName) => {
  document.getElementById('deleteModalMsg').textContent = `Are you sure you want to remove ${memberName} from this workspace? They will lose access to all projects in this workspace.`;
  document.getElementById('deleteModalConfirmBtn').onclick = async () => {
    window.App.closeDeleteModal();
    await supabase.from('workspace_members').delete().eq('id', memberId);
    toast(`✓ ${memberName} removed from workspace`);
    renderContent();
  };
  document.getElementById('deleteModal').classList.add('open');
};

window.App.adminDeleteUser = async (userId, userName) => {
  document.getElementById('deleteModalMsg').textContent = `Are you sure you want to permanently delete ${userName}? This will remove them from all workspaces and cannot be undone.`;
  document.getElementById('deleteModalConfirmBtn').onclick = async () => {
    window.App.closeDeleteModal();
    await supabase.rpc('admin_delete_user', { target_user_id: userId });
    toast(`🗑 ${userName} deleted`);
    renderContent();
  };
  document.getElementById('deleteModal').classList.add('open');
};

window.App.adminAssignWorkspace = async (userId) => {
  const wsId = document.getElementById(`ws-assign-${userId}`)?.value;
  if (!wsId) return;
  const { error } = await supabase.rpc('admin_add_to_workspace', {
    target_user_id: userId,
    target_workspace_id: wsId,
    member_role: 'admin'
  });
  if (error) { toast('⚠ ' + error.message); return; }
  toast('✓ User added to workspace');
  renderContent();
};

window.App.adminRemoveFromWorkspace = async (memberId, userName, wsName) => {
  document.getElementById('deleteModalMsg').textContent = `Remove ${userName} from "${wsName}"? They will lose access to all projects in that workspace.`;
  document.getElementById('deleteModalConfirmBtn').onclick = async () => {
    window.App.closeDeleteModal();
    await supabase.from('workspace_members').delete().eq('id', memberId);
    toast(`✓ ${userName} removed from ${wsName}`);
    renderContent();
  };
  document.getElementById('deleteModal').classList.add('open');
};
window.App.adminDeleteWorkspace = async (id, name) => {
  document.getElementById('deleteModalMsg').textContent = `Are you sure you want to delete the workspace "${name}" and ALL its data? This cannot be undone.`;
  document.getElementById('deleteModalConfirmBtn').onclick = async () => {
    window.App.closeDeleteModal();
    await supabase.from('profiles').update({ organisation_id: null }).eq('organisation_id', id);
    await supabase.from('invites').delete().eq('workspace_id', id);
    await supabase.from('workspace_members').delete().eq('workspace_id', id);
    await supabase.from('workspaces').delete().eq('id', id);
    toast('🗑 Workspace deleted');
    await loadWorkspaces();
    renderContent();
    window.App.renderWorkspaceSwitcher();
  };
  document.getElementById('deleteModal').classList.add('open');
};

window.App.adminToggleSuperAdmin = async (userId, value) => {
  await supabase.from('profiles').update({ is_super_admin: value }).eq('id', userId);
  toast(value ? '✓ Super admin granted' : '✓ Super admin revoked');
  renderContent();
};
window.App.closeDeleteModal = function() {
  document.getElementById('deleteModal').classList.remove('open');
};
window.App.openDeleteModal = function(type, id, label) {
  const labels = {
    task: 'this task',
    project: 'this project and ALL linked tasks, documents, budgets, meetings and stakeholders',
    doc: 'this document',
    budget: 'this budget item',
    stakeholder: 'this stakeholder',
    meeting: 'this meeting'
  };
  document.getElementById('deleteModalMsg').textContent = `Are you sure you want to delete ${labels[type] || 'this item'}? This cannot be undone.`;
  document.getElementById('deleteModalConfirmBtn').onclick = () => {
    window.App.closeDeleteModal();
    deleteItem(type, id);
  };
  document.getElementById('deleteModal').classList.add('open');
};

window.App.toggleWsDropdown = function() {
  const dd = document.getElementById('wsDropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? '' : 'none';
};

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#workspaceSwitcher')) {
    const dd = document.getElementById('wsDropdown');
    if (dd) dd.style.display = 'none';
  }
});

function initApp() {
  // ── Render nav tabs ──
  const navTabsEl = document.getElementById('navTabs');
  const isSuperAdmin = AppState.currentProfile?.is_super_admin;
  const tabOrder = ['dashboard', 'projects', 'documents', 'tasks', 'budgets', 'stakeholders', 'meetings', 'statistics', 'team', ...(isSuperAdmin ? ['admin'] : [])];

  // Mobile menu toggle (inserted before tabs)
  const mobileToggle = document.createElement('button');
  mobileToggle.className = 'mobile-nav-toggle';
  mobileToggle.textContent = '☰';
  mobileToggle.addEventListener('click', () => {
    navTabsEl.classList.toggle('mobile-open');
  });
  navTabsEl.parentNode.insertBefore(mobileToggle, navTabsEl);

  navTabsEl.innerHTML = tabOrder.map(key => {
    const t = TABS[key];
    return `<button class="nav-tab${key === 'dashboard' ? ' active' : ''}" data-tab="${key}">${t.icon} ${t.label}</button>`;
  }).join('');

  // ── Nav tab click events ──
  navTabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.nav-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (tab) switchTab(tab);
  });

  // ── Theme toggle ──
  const themeBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('pd_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeBtn.textContent = '☀️';
  }
  themeBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    themeBtn.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('pd_theme', isLight ? 'light' : 'dark');
  });

  // ── Top-right buttons ──
  document.getElementById('exportBtn').addEventListener('click', openExportModal);
  document.getElementById('logoutBtn').addEventListener('click', handleSignOut);
  document.getElementById('newBtn').addEventListener('click', openAdd);

  // ── Modal close buttons ──
  document.getElementById('addModalClose').addEventListener('click', () => closeOverlay('addModal'));
  document.getElementById('detailModalClose').addEventListener('click', () => closeOverlay('detailModal'));

  // ── Overlay backdrop click ──
  document.addEventListener('click', e => {
    if (e.target.classList.contains('overlay')) {
      closeOverlay('addModal');
      closeOverlay('detailModal');
    }
  });

  // ── Escape key ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeOverlay('addModal');
      closeOverlay('detailModal');
    }
  });

  // ── Sidebar toggle (mobile) ──
  const sidebarToggle = document.getElementById('sidebarToggle');
  sidebarToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar when clicking content area on mobile
  document.getElementById('contentArea').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  // ── Initial render — check URL hash first ──
  validateData();
  const _hash = window.location.hash;
  if (_hash && _hash.length > 1) {
    const { tab, sub, briefingId } = (() => {
      const h = _hash.replace('#', '');
      const parts = h.split('/');
      const tab = parts[0] || 'dashboard';
      const isBriefing = parts[1] === 'briefing';
      const briefingId = isBriefing ? parts[2] : null;
      const sub = !isBriefing && parts[1] ? parseInt(parts[1]) || 0 : 0;
      return { tab, sub, briefingId };
    })();
    AppState.currentTab = tab;
    AppState.currentSubtab = sub;
    AppState.currentBriefingId = briefingId || null;
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const tabBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
  } else {
    history.replaceState({ tab: 'dashboard', sub: 0, briefingId: null }, '', '#dashboard');
  }
  renderSubnav();
  renderSidebar();
  renderContent();
  window.App.renderWorkspaceSwitcher();
}
window.App.__initApp = initApp;

/* ── Bootstrap — check auth first ── */
(async () => {
  // Check for password recovery token before anything else
  const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
  const isRecovery = hashParams.get('type') === 'recovery';

  if (isRecovery) {
    // Set the session from the recovery token first
    await supabase.auth.getSession();
    renderAuthScreen('login');
    return;
  }

  const authed = await initAuth();
  if (!authed) {
    renderAuthScreen('login');
  } else {
    await loadWorkspaces();
    await loadData();
    window.App.__initApp();
  }
})();