/* ══════════════════════════════════════════════════
   MODAL — Entry point
   Splits into: modal-detail.js, modal-forms.js, modal-delete.js
   ══════════════════════════════════════════════════ */

export function openOverlay(id) { document.getElementById(id).classList.add('open'); }
export function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

export { openDetail } from './modal-detail.js';
export { openAdd, openAddForm, openEditForm, saveForm, rebuildTaskBudgetList, rebuildBudgetTaskList } from './modal-forms.js';
export { deleteItem } from './modal-delete.js';