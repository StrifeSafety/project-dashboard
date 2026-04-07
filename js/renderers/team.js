import { AppState } from '../state.js';
import { supabase, getInvites, createInvite, deleteInvite, getUserWorkspaces } from '../supabase.js';
import { avatarColor, initials } from '../utils.js';

/* ══════════════════════════════════════════════════
   RENDERER — Team & Invites
   ══════════════════════════════════════════════════ */

export async function renderTeam(sub) {
  const orgId = AppState.currentWorkspaceId;
  const profile = AppState.currentProfile;

  if (sub === 0) {
    // ── MEMBERS VIEW ──
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('*, profiles(*)')
      .eq('workspace_id', orgId)
      .order('created_at');
    const members = (memberRows || []).map(r => ({ ...r.profiles, role: r.role, memberId: r.id }));
    const currentMember = memberRows?.find(r => r.user_id === profile?.id);
    const isOwner = currentMember?.role === 'owner' || profile?.is_super_admin;

    return `<div style="padding:20px 24px">
      <div class="page-banner">
        <div class="page-banner-icon">👤</div>
        <div><h2>Team Members</h2><p>Everyone in this workspace.</p></div>
        <div style="margin-left:auto">
          <button class="btn btn-primary" onclick="switchSubtab(1)">+ Invite Member</button>
        </div>
      </div>
      <div class="table-card">
        <div class="table-header table-title-sticky">
          <div class="table-title">Members <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${members?.length || 0}</span></div>
        </div>
        <table><thead class="table-thead-sticky"><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>${(members || []).map(m => `
          <tr>
            <td class="td-main"><span style="display:flex;align-items:center;gap:8px">
              <span style="width:28px;height:28px;border-radius:50%;background:${avatarColor(m.full_name)}22;color:${avatarColor(m.full_name)};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${initials(m.full_name || m.email)}</span>
              ${m.full_name || '—'}
              ${m.id === profile?.id ? `<span class="badge b-accent" style="font-size:9px">You</span>` : ''}
              ${m.is_super_admin ? `<span class="badge b-purple" style="font-size:9px">Super Admin</span>` : ''}
            </span></td>
            <td class="td-mono" style="font-size:11px;color:var(--text3)">${m.email}</td>
            <td><span class="badge ${m.role === 'owner' ? 'b-yellow' : m.role === 'admin' ? 'b-accent' : 'b-grey'}">${m.role}</span></td>
            <td class="td-mono" style="font-size:11px;color:var(--text3)">${m.created_at ? new Date(m.created_at).toLocaleDateString('en-AU') : '—'}</td>
            <td>${isOwner && m.id !== profile?.id && m.role !== 'owner' ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="removeMember('${m.memberId}','${m.full_name || m.email}')">Remove</button>` : ''}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
  }

  // ── INVITES VIEW ──
  const { data: invites } = await getInvites(orgId);
  const pending = (invites || []).filter(i => !i.accepted);
  const accepted = (invites || []).filter(i => i.accepted);

  return `<div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon">✉️</div>
      <div><h2>Invites</h2><p>Invite people to join this workspace.</p></div>
    </div>

    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header"><div class="table-title">Send Invite</div></div>
      <div style="padding:16px 18px;display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:flex-end">
        <div>
          <label class="fl" style="margin-bottom:6px">Email Address</label>
          <input class="fi" id="invite-email" type="email" placeholder="colleague@example.com"/>
        </div>
        <div>
          <label class="fl" style="margin-bottom:6px">Workspace</label>
          <select class="fs" id="invite-workspace">
            ${AppState.workspaces.filter(w => w.role === 'owner' || w.role === 'admin').map(w => `
              <option value="${w.id}" ${w.id === AppState.currentWorkspaceId ? 'selected' : ''}>${w.name}</option>
            `).join('')}
          </select>
        </div>
        <button class="btn btn-primary" style="margin-bottom:1px" onclick="sendInvite()">Send Invite</button>
      </div>
      <div id="invite-feedback" style="padding:0 18px 16px;font-size:13px;display:none"></div>
    </div>

    ${pending.length ? `
    <div class="table-card" style="margin-bottom:16px">
      <div class="table-header table-title-sticky">
        <div class="table-title">Pending Invites <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${pending.length}</span></div>
      </div>
      <table><thead class="table-thead-sticky"><tr><th>Email</th><th>Workspace</th><th>Role</th><th>Invited</th><th>Expires</th><th>Invite Link</th><th></th></tr></thead>
      <tbody>${pending.map(i => {
        const link = `${window.location.origin}/#invite/${i.token}`;
        return `<tr>
          <td class="td-mono" style="font-size:12px">${i.email}</td>
          <td style="font-size:12px;color:var(--text2)">${i.workspaces?.name || '—'}</td>
          <td><span class="badge b-accent">${i.role}</span></td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${new Date(i.created_at).toLocaleDateString('en-AU')}</td>
          <td class="td-mono" style="font-size:11px;color:${i.expires_at && new Date(i.expires_at) < new Date(Date.now() + 3600000) ? 'var(--red)' : 'var(--yellow)'}">
            ${i.expires_at ? (() => { const h = Math.max(0, Math.round((new Date(i.expires_at) - new Date()) / 3600000)); return h < 1 ? 'Expiring soon' : h + 'h remaining'; })() : '48h'}
          </td>
          <td><input class="fi" style="font-size:10px;font-family:'DM Mono',monospace" value="${link}" readonly onclick="this.select()"/></td>
          <td><button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="cancelInvite('${i.id}')">Rescind</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>` : ''}

    ${accepted.length ? `
    <div class="table-card">
      <div class="table-header table-title-sticky">
        <div class="table-title">Accepted Invites <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:400;color:var(--text3)">${accepted.length}</span></div>
      </div>
      <table><thead class="table-thead-sticky"><tr><th>Email</th><th>Workspace</th><th>Role</th><th>Accepted</th></tr></thead>
      <tbody>${accepted.map(i => `
        <tr>
          <td class="td-mono" style="font-size:12px">${i.email}</td>
          <td style="font-size:12px;color:var(--text2)">${i.workspaces?.name || '—'}</td>
          <td><span class="badge b-green">${i.role}</span></td>
          <td class="td-mono" style="font-size:11px;color:var(--text3)">${new Date(i.created_at).toLocaleDateString('en-AU')}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>` : ''}
  </div>`;
}