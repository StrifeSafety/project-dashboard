/* ══════════════════════════════════════════════════
   TOAST — Notification component
   ══════════════════════════════════════════════════ */

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
