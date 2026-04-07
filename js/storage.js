/* ══════════════════════════════════════════════════
   STORAGE — Supabase persistence
   ══════════════════════════════════════════════════ */

import { supabase, getProfile, getUserWorkspaces } from './supabase.js';
import { AppState } from './state.js';

export let DATA = {
  projects: [],
  tasks: [],
  budgets: [],
  stakeholders: [],
  meetings: [],
  documents: [],
};

/* ── Map Supabase row → app object ── */
const mapProject = r => ({
  id: r.id, name: r.name, status: r.status, active: r.active,
  completed: r.completed, spend: r.spend, target: r.target,
  timeline: r.timeline, startDate: r.start_date, endDate: r.end_date,
  company: r.company
});

const mapTask = r => ({
  id: r.id, name: r.name, project: r.project, phase: r.phase,
  status: r.status, priority: r.priority, progress: r.progress,
  hours: r.hours, startDate: r.start_date, due: r.due,
  actualCompletion: r.actual_completion, responsible: r.responsible,
  desc: r.description, recommendation: r.recommendation,
  interimAction: r.interim_action, finalAction: r.final_action,
  linkedBudgetId: r.linked_budget_id,
  contractorEngaged: r.contractor_engaged, contractorName: r.contractor_name
});

const mapBudget = r => ({
  id: r.id, name: r.name, project: r.project, milestone: r.milestone,
  type: r.type, target: r.target, spend: r.spend,
  hours: r.hours, rate: r.rate, linkedTaskId: r.linked_task_id
});

const mapStakeholder = r => ({
  id: r.id, name: r.name, title: r.title, company: r.company,
  category: r.category, industry: r.industry, email: r.email,
  phone: r.phone, contact: r.contact, project: r.project,
  lastContactDate: r.last_contact_date
});

const mapMeeting = r => ({
  id: r.id, name: r.name, project: r.project, date: r.date,
  time: r.time, duration: r.duration, type: r.type,
  attendees: r.attendees, notes: r.notes, nextSteps: r.next_steps
});

/* ── Load workspaces for current user ── */
export async function loadWorkspaces() {
  const memberships = await getUserWorkspaces();
  AppState.workspaces = memberships.map(m => ({
    id: m.workspace_id,
    name: m.workspaces?.name || 'Unnamed',
    role: m.role
  }));
  if (!AppState.currentWorkspaceId && AppState.workspaces.length > 0) {
    AppState.currentWorkspaceId = AppState.workspaces[0].id;
    AppState.organisationId = AppState.workspaces[0].id;
  }
}

/* ── Load all data from Supabase ── */
export async function loadData() {
  let wsId = AppState.currentWorkspaceId;
  if (!wsId) {
    // Try to get it from workspaces list
    if (AppState.workspaces?.length > 0) {
      wsId = AppState.workspaces[0].id;
      AppState.currentWorkspaceId = wsId;
      AppState.organisationId = wsId;
    } else {
      return;
    }
  }

  const [projects, tasks, budgets, stakeholders, meetings, documents] = await Promise.all([
    supabase.from('projects').select('*').eq('workspace_id', wsId).order('created_at'),
    supabase.from('tasks').select('*').eq('workspace_id', wsId).order('created_at'),
    supabase.from('budgets').select('*').eq('workspace_id', wsId).order('created_at'),
    supabase.from('stakeholders').select('*').eq('workspace_id', wsId).order('created_at'),
    supabase.from('meetings').select('*').eq('workspace_id', wsId).order('created_at'),
    supabase.from('documents').select('*').eq('workspace_id', wsId).order('uploaded_at', { ascending: false }),
  ]);

  DATA.projects = (projects.data || []).map(mapProject);
  DATA.tasks = (tasks.data || []).map(mapTask);
  DATA.budgets = (budgets.data || []).map(mapBudget);
  DATA.stakeholders = (stakeholders.data || []).map(mapStakeholder);
  DATA.meetings = (meetings.data || []).map(mapMeeting);
  DATA.documents = documents.data || [];
}

/* ── Save helpers ── */
function getWsId() {
  return AppState.currentWorkspaceId;
}

export async function saveProject(obj, isEdit = false) {
  const wsId = getWsId();
  const row = {
    id: obj.id, workspace_id: wsId, name: obj.name,
    status: obj.status, active: obj.active, completed: obj.completed,
    spend: obj.spend, target: obj.target, timeline: obj.timeline,
    start_date: obj.startDate, end_date: obj.endDate, company: obj.company
  };
  if (isEdit) return supabase.from('projects').update(row).eq('id', obj.id);
  return supabase.from('projects').insert(row);
}

export async function saveTask(obj, isEdit = false) {
  const wsId = getWsId();
  const row = {
    id: obj.id, workspace_id: wsId, name: obj.name,
    project: obj.project, phase: obj.phase, status: obj.status,
    priority: obj.priority, progress: obj.progress, hours: obj.hours,
    start_date: obj.startDate, due: obj.due,
    actual_completion: obj.actualCompletion, responsible: obj.responsible,
    description: obj.desc, recommendation: obj.recommendation,
    interim_action: obj.interimAction, final_action: obj.finalAction,
    linked_budget_id: obj.linkedBudgetId,
    contractor_engaged: obj.contractorEngaged, contractor_name: obj.contractorName
  };
  if (isEdit) return supabase.from('tasks').update(row).eq('id', obj.id);
  return supabase.from('tasks').insert(row);
}

export async function saveBudget(obj, isEdit = false) {
  const wsId = getWsId();
  const row = {
    id: obj.id, workspace_id: wsId, name: obj.name,
    project: obj.project, milestone: obj.milestone, type: obj.type,
    target: obj.target, spend: obj.spend, hours: obj.hours,
    rate: obj.rate, linked_task_id: obj.linkedTaskId
  };
  if (isEdit) return supabase.from('budgets').update(row).eq('id', obj.id);
  return supabase.from('budgets').insert(row);
}

export async function saveStakeholder(obj, isEdit = false) {
  const wsId = getWsId();
  const row = {
    id: obj.id, workspace_id: wsId, name: obj.name,
    title: obj.title, company: obj.company, category: obj.category,
    industry: obj.industry, email: obj.email, phone: obj.phone,
    contact: obj.contact, project: obj.project,
    last_contact_date: obj.lastContactDate
  };
  if (isEdit) return supabase.from('stakeholders').update(row).eq('id', obj.id);
  return supabase.from('stakeholders').insert(row);
}

export async function saveMeeting(obj, isEdit = false) {
  const wsId = getWsId();
  const row = {
    id: obj.id, workspace_id: wsId, name: obj.name,
    project: obj.project, date: obj.date, time: obj.time,
    duration: obj.duration, type: obj.type, attendees: obj.attendees,
    notes: obj.notes, next_steps: obj.nextSteps
  };
  if (isEdit) return supabase.from('meetings').update(row).eq('id', obj.id);
  return supabase.from('meetings').insert(row);
}

export async function deleteRecord(table, id) {
  return supabase.from(table).delete().eq('id', id);
}

export function saveData() {}

export function validateData() {
  const projectNames = new Set(DATA.projects.map(p => p.name));
  const orphaned = DATA.tasks.filter(t => t.project && !projectNames.has(t.project));
  if (orphaned.length) console.warn(`[Dashboard] ${orphaned.length} task(s) reference missing projects`);
}