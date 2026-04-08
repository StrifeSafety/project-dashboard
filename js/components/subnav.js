import { AppState, TABS } from '../state.js';
import { switchSubtab } from '../router.js';

/* ══════════════════════════════════════════════════
   SUBNAV — Sub-tab navigation
   ══════════════════════════════════════════════════ */

export function renderSubnav() {
  const sn = TABS[AppState.currentTab]?.subnav || [];
  document.getElementById('subnav').innerHTML = sn.map((s, i) =>
    `<button class="subnav-tab${i === AppState.currentSubtab ? ' active' : ''}" onclick="App.switchSubtab(${i})">${s}</button>`
  ).join('');
}