import { DATA, loadData, deleteRecord } from "../storage.js";
import { AppState } from "../state.js";
import { toast } from "./toast.js";
import { renderContent } from "../router.js";
import { renderSidebar } from "./sidebar.js";
import { closeOverlay } from "./modal.js";

/* ══════════════════════════════════════════════════
   MODAL — Delete item
   ══════════════════════════════════════════════════ */

export function deleteItem(type, id) {
  if (type === 'project') {
    const p = DATA.projects.find(x => x.id === id);
    if (p) {
      const name = p.name;
      DATA.tasks = DATA.tasks.filter(x => x.project !== name);
      DATA.documents = DATA.documents.filter(x => x.project !== name);
      DATA.budgets = DATA.budgets.filter(x => x.project !== name);
      DATA.meetings = DATA.meetings.filter(x => x.project !== name);
      DATA.stakeholders = DATA.stakeholders.filter(x => x.project !== name);
    }
  }

  const tableMap = { task: 'tasks', project: 'projects', doc: 'documents', budget: 'budgets', stakeholder: 'stakeholders', meeting: 'meetings' };
  const map = { task: DATA.tasks, project: DATA.projects, doc: DATA.documents, budget: DATA.budgets, stakeholder: DATA.stakeholders, meeting: DATA.meetings };
  map[type] = map[type].filter(x => x.id !== id);
  Object.assign(DATA, map);
  closeOverlay('detailModal');
  if (type === 'project' && AppState.currentBriefingId) { AppState.currentBriefingId = null; }
  renderContent();
  renderSidebar();
  toast('🗑 Deleted');
  if (type !== 'doc') {
    deleteRecord(tableMap[type], id).then(() => {
      loadData().then(() => { renderContent(); renderSidebar(); });
    });
  }
}