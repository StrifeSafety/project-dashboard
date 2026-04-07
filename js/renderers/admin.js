import { AppState } from '../state.js';
import { supabase } from '../supabase.js';

/* ══════════════════════════════════════════════════
   RENDERER — Super Admin Panel
   ══════════════════════════════════════════════════ */

export async function renderAdmin(sub) {
  // Guard — only super admins can access this
  if (!AppState.currentProfile?.is_super_admin) {
    return `<div style="padding:40px;text-align:center;color:var(--text3)">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <div style="font-size:18px;font-weight:600;color:var(--text)">Access Denied</div>
      <div style="margin-top:8px;font-size:14px">You need super admin privileges to access this area.</div>
    </div>`;
  }

  if (sub === 0) return await renderAdminOverview();
  if (sub === 1) return await renderAdminWorkspaces();
  if (sub === 2) return await renderAdminUsers();
  return '';
}

async function renderAdminOverview() {
  const [workspaces, users, members] = await Promise.all([
    supabase.from('workspaces').select('*').order('created_at'),
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('workspace_members').select('*'),
  ]);

  const wsCount = workspaces.data?.length || 0;
  const userCount = users.data?.length || 0;
  const memberCount = members.data?.length || 0;

  return `<div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon">⚙️</div>
      <div><h2>Super Admin</h2><p>Full platform overview and control.</p></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
      <div class="table-card" style="padding:20px 24px;margin-bottom:0">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">Total Workspaces</div>
        <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--accent)">${wsCount}</div>
      </div>
      <div class="table-card" style="padding:20px 24px;margin-bottom:0">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">Total Users</div>
        <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--green)">${userCount}</div>
      </div>
      <div class="table-card" style="padding:20px 24px;margin-bottom:0">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px">Total Memberships</div>
        <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--yellow)">${memberCount}</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><div class="table-title">Recent Users</div></div>
      <table><thead class="table-thead-sticky"><tr><th>Name</th><th>Email</th><th>Role</th><th>Super Admin</th><th>Joined</th></tr></thead>
      <tbody>${(users.data || []).map(u => `
        <tr>
          <td class="td-main">${u.full_name || '—'}</td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${u.email}</td>
          <td><span class="badge ${u.role === 'owner' ? 'b-yellow' : 'b-grey'}">${u.role || 'member'}</span></td>
          <td>${u.is_super_admin ? '<span class="badge b-purple">✓ Super Admin</span>' : '—'}</td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU') : '—'}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>
  </div>`;
}

async function renderAdminWorkspaces() {
  const { data: workspaces } = await supabase.from('workspaces').select('*').order('created_at');
  const { data: members } = await supabase.from('workspace_members').select('*');

  const memberCountByWs = {};
  (members || []).forEach(m => {
    memberCountByWs[m.workspace_id] = (memberCountByWs[m.workspace_id] || 0) + 1;
  });

  return `<div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon">🏢</div>
      <div><h2>All Workspaces</h2><p>Every workspace across the platform.</p></div>
    </div>
    <div class="table-card">
      <div class="table-header table-title-sticky">
        <div class="table-title">Workspaces <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${workspaces?.length || 0}</span></div>
      </div>
      <table><thead class="table-thead-sticky"><tr><th>Workspace</th><th>Members</th><th>Created</th><th></th></tr></thead>
      <tbody>${(workspaces || []).map(w => `
        <tr>
          <td class="td-main">
            <span style="display:flex;align-items:center;gap:8px">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></span>
              ${w.name}
            </span>
          </td>
          <td class="td-mono" style="font-size:12px">${memberCountByWs[w.id] || 0}</td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${new Date(w.created_at).toLocaleDateString('en-AU')}</td>
          <td>
            <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="adminDeleteWorkspace('${w.id}','${w.name}')">🗑 Delete</button>
          </td>
        </tr>`).join('')}
      </tbody></table>
    </div>
  </div>`;
}

async function renderAdminUsers() {
  const { data: users } = await supabase.from('profiles').select('*').order('created_at');
  const { data: members } = await supabase.from('workspace_members').select('*, workspaces(name)');
  const { data: workspaces } = await supabase.from('workspaces').select('*').order('name');

  const membershipsByUser = {};
  (members || []).forEach(m => {
    if (!membershipsByUser[m.user_id]) membershipsByUser[m.user_id] = [];
    membershipsByUser[m.user_id].push({ wsId: m.workspace_id, wsName: m.workspaces?.name || 'Unknown', memberId: m.id });
  });

  const wsOptions = (workspaces || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('');

  return `<div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon">👤</div>
      <div><h2>All Users</h2><p>Every user registered on the platform.</p></div>
    </div>
    <div class="table-card">
      <div class="table-header table-title-sticky">
        <div class="table-title">Users <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${users?.length || 0}</span></div>
      </div>
      <table><thead class="table-thead-sticky"><tr><th>Name</th><th>Email</th><th>Workspaces</th><th>Super Admin</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${(users || []).map(u => {
        const userMemberships = membershipsByUser[u.id] || [];
        const isSelf = u.id === AppState.currentUser?.id;
        return `<tr>
          <td class="td-main">${u.full_name || '—'}</td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${u.email}</td>
          <td style="font-size:12px">
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
              ${userMemberships.map(m => `
                <span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--rs);padding:2px 8px;font-size:11px">
                  ${m.wsName}
                  ${!isSelf ? `<span style="cursor:pointer;color:var(--red);margin-left:2px;font-size:13px;line-height:1" onclick="adminRemoveFromWorkspace('${m.memberId}','${u.full_name || u.email}','${m.wsName}')">×</span>` : ''}
                </span>`).join('')}
            </div>
            ${!isSelf ? `<div style="display:flex;gap:6px;align-items:center">
              <select class="fs" id="ws-assign-${u.id}" style="font-size:11px;padding:3px 6px;height:28px">${wsOptions}</select>
              <button class="btn btn-ghost btn-sm" onclick="adminAssignWorkspace('${u.id}')">+ Add</button>
            </div>` : ''}
          </td>
          <td>${u.is_super_admin ? '<span class="badge b-purple">✓ Yes</span>' : '<span style="color:var(--text3);font-size:12px">—</span>'}</td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU') : '—'}</td>
          <td>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${!u.is_super_admin ? `<button class="btn btn-ghost btn-sm" onclick="adminToggleSuperAdmin('${u.id}',true)">Make Admin</button>` : `<button class="btn btn-ghost btn-sm" onclick="adminToggleSuperAdmin('${u.id}',false)">Revoke Admin</button>`}
              ${!isSelf ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="adminDeleteUser('${u.id}','${u.full_name || u.email}')">🗑 Delete User</button>` : ''}
            </div>
          </td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}