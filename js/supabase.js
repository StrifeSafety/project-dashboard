/* ══════════════════════════════════════════════════
   SUPABASE — Client configuration & auth helpers
   ══════════════════════════════════════════════════ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vyywqghyzyjefbdwiyob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5eXdxZ2h5enlqZWZiZHdpeW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODY4OTcsImV4cCI6MjA5MDg2Mjg5N30.dhT_2tpbeQHytBTl992rMTKHz1e43bMHWKy3Rh8r4dI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit'
  }
});

/* ── Auth helpers ── */
export async function getSession() {
  return new Promise((resolve) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { resolve(session); return; }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        subscription.unsubscribe();
        resolve(session);
      });
      setTimeout(() => { subscription.unsubscribe(); resolve(null); }, 3000);
    });
  });
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email, password, fullName, workspaceName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  if (error) return { data, error };

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName })
    .select()
    .single();
  if (wsError) return { data, error: wsError };

  // Add user as owner of workspace
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: data.user.id,
    role: 'owner'
  });

  // Update profile
  await supabase.from('profiles').update({
    full_name: fullName,
    organisation_id: workspace.id,
    role: 'owner'
  }).eq('id', data.user.id);

  return { data, error: null };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/* ── Workspace helpers ── */
export async function getUserWorkspaces() {
  const session = await getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('workspace_members')
    .select('*, workspaces(*)')
    .eq('user_id', session.user.id)
    .order('created_at');
  return data || [];
}

export async function createWorkspace(name) {
  const { data, error } = await supabase.rpc('create_workspace', { workspace_name: name });
  if (error) return { error };
  const { data: workspace } = await supabase.from('workspaces').select('*').eq('id', data).single();
  return { data: workspace, error: null };
}

/* ── Invite helpers ── */
export async function createInvite(email, workspaceId, invitedBy) {
  const { data, error } = await supabase
    .from('invites')
    .insert({ email, workspace_id: workspaceId, invited_by: invitedBy, role: 'admin' })
    .select()
    .single();
  return { data, error };
}

export async function getInvites(workspaceId) {
  // Clean up expired invites first
  await supabase.rpc('delete_expired_invites');
  // Only return invites sent by the current user
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('invites')
    .select('*, workspaces(name)')
    .eq('invited_by', user.id)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function deleteInvite(id) {
  return supabase.from('invites').delete().eq('id', id);
}

export async function getInviteByToken(token) {
  const { data, error } = await supabase
    .from('invites')
    .select('*, workspaces(*)')
    .eq('token', token)
    .eq('accepted', false)
    .single();
  return { data, error };
}

export async function acceptInvite(token, userId) {
  const { data: invite } = await getInviteByToken(token);
  if (!invite) return { error: 'Invalid or expired invite' };
  await supabase.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id: userId,
    role: 'admin'
  });
  await supabase.from('profiles').update({
    organisation_id: invite.workspace_id,
    role: 'admin'
  }).eq('id', userId);
  await supabase.from('invites').update({ accepted: true }).eq('token', token);
  return { error: null };
}