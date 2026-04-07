/* ══════════════════════════════════════════════════
   APP STATE — Central state management
   ══════════════════════════════════════════════════ */

export const AppState = {
  currentUser: null,
  currentProfile: null,
  organisationId: null,
  currentWorkspaceId: null,
  workspaces: [],
  currentTab: 'dashboard',
  currentSubtab: 0,
  detailId: null,
  editId: null,
  currentBriefingId: null,
  ganttRangeStart: null,
  ganttRangeEnd: null,
  meetingViewMode: 'list',
  meetingCalMonth: null,
  pastMeetingsOpen: false,
  sbProject: null,
  sbStatus: null,
};

/* Tab config */
export const TABS = {
  dashboard:    { label:'Dashboard',     icon:'🏠', subnav:['Overview'], sidebar:false },
  projects:     { label:'Projects',      icon:'📁', subnav:['Active Projects','Project Lifecycle','All Projects'], sidebar:true },
  documents:    { label:'Documents',     icon:'📄', subnav:['Quick Guides','Documentation','All Documents'], sidebar:true },
  tasks:        { label:'Tasks',         icon:'✅', subnav:['Task Planner','Milestones','By Status'], sidebar:true },
  budgets:      { label:'Budgets',       icon:'💰', subnav:['Active Budgets','Closed Budgets','All Budgets'], sidebar:true },
  stakeholders: { label:'Stakeholders',  icon:'👥', subnav:['All Stakeholders','Team Members'], sidebar:true },
  meetings:     { label:'Meetings',      icon:'📅', subnav:['Last Meetings','Internal Meetings','Project Meetings'], sidebar:true },
  statistics:   { label:'Statistics',    icon:'📊', subnav:['Main KPIs'], sidebar:false },
  admin:        { label:'Admin',         icon:'⚙️', subnav:['Overview','Workspaces','Users'], sidebar:false },
  team:         { label:'Team',          icon:'👤', subnav:['Members','Invites'], sidebar:false },
};

/* Project color palette */
const PC = ['#7c6fff','#3ecf8e','#f5a623','#f05252','#60a5fa','#a78bfa','#fb923c','#22d3ee','#e879f9','#34d399'];
const pcMap = {};
let pci = 0;
export function pColor(n) {
  if (!n) return '#55556a';
  if (!pcMap[n]) { pcMap[n] = PC[pci % PC.length]; pci++; }
  return pcMap[n];
}