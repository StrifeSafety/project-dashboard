import { AppState } from "../state.js";
import { supabase } from "../supabase.js";
import { DATA } from "../storage.js";
import { isOverdue, fmtDate, pCol, pColor, statusBadge, priBadge, projStatusBadge, docBadge, fmtCur, meetType, safeJSON, fmtLastContact, taskDateStatus } from "../utils.js";
import { openOverlay, closeOverlay } from "./modal.js";

/* ══════════════════════════════════════════════════
   MODAL — Detail view
   ══════════════════════════════════════════════════ */

export async function openDetail(type, obj) {
  AppState.detailId = { type, id: obj.id };
  document.getElementById('detailTitle').textContent = obj.name || 'Detail';

  let body = '', actions = '';

  if (type === 'task') {
    body = `
      <div class="fg-grid">
        <div class="fg"><div class="dk">Status</div><div class="dv">${statusBadge(obj)} ${priBadge(obj.priority)}</div></div>
        <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
        <div class="fg"><div class="dk">Phase</div><div class="dv"><span class="badge b-purple" style="font-size:10px">${obj.phase || '—'}</span></div></div>
        <div class="fg"><div class="dk">Due Date</div><div class="dv">
          <span style="color:${taskDateStatus(obj).color};font-weight:500">${obj.due ? fmtDate(obj.due) : '—'}</span>
          <span style="font-size:11px;color:${taskDateStatus(obj).color};margin-left:8px">${taskDateStatus(obj).icon} ${taskDateStatus(obj).label}</span>
        </div></div>
        <div class="fg"><div class="dk">Hours</div><div class="dv">${obj.hours ? obj.hours + 'h' : '—'}</div></div>
        <div class="fg"><div class="dk">Progress</div><div class="dv">
          <div class="prog-wrap" style="margin-bottom:3px"><div class="prog-track" style="flex:1"><div class="prog-fill" style="width:${obj.progress || 0}%;background:${pCol(obj.progress || 0)}"></div></div><span class="prog-pct">${obj.progress || 0}%</span></div>
        </div></div>
      </div>
      ${obj.desc ? `<div class="fg"><div class="dk">Description</div><div class="dv dv-desc">${obj.desc}</div></div>` : ''}
      ${obj.recommendation ? `<div class="fg"><div class="dk">Recommendation</div><div class="dv dv-desc">${obj.recommendation}</div></div>` : ''}
      ${obj.interimAction ? `<div class="fg"><div class="dk">Interim Action</div><div class="dv dv-desc">${obj.interimAction}</div></div>` : ''}
      ${obj.finalAction ? `<div class="fg"><div class="dk">Final Action</div><div class="dv dv-desc">${obj.finalAction}</div></div>` : ''}
      ${obj.responsible ? `<div class="fg"><div class="dk">Responsible Person</div><div class="dv">${obj.responsible}</div></div>` : ''}
      ${obj.actualCompletion ? `<div class="fg"><div class="dk">Actual Completion</div><div class="dv">${fmtDate(obj.actualCompletion)}</div></div>` : ''}
      ${obj.contractorEngaged === 'Yes' ? `<div class="fg"><div class="dk">Contractor Engaged</div><div class="dv">${obj.contractorEngaged}${obj.contractorName ? ` — ${obj.contractorName}` : ''}</div></div>` : ''}
      ${await (async () => {
        if (!obj.id) return '';
        const { data } = await supabase.from('documents').select('*').eq('linked_task_id', obj.id);
        if (!data || !data.length) return '';
        const docsWithUrls = await Promise.all(data.map(async d => {
          if (!d.file_name) return { ...d, signed_url: null };
          const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(d.file_name, 3600);
          return { ...d, signed_url: urlData?.signedUrl || null };
        }));
        return `<div class="fg"><div class="dk">Linked Documents</div><div class="dv">${docsWithUrls.map(d => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:16px">📄</span>
            <a href="${d.signed_url || d.file_url}" target="_blank" style="color:var(--accent);text-decoration:underline;font-size:13px;font-weight:500">${d.name}</a>
            ${d.revision ? `<span style="font-size:11px;color:var(--text3)">${d.revision}</span>` : ''}
            <span class="badge ${d.status === 'Current' ? 'b-green' : d.status === 'Superseded' ? 'b-grey' : 'b-yellow'}" style="font-size:9px">${d.status || 'Draft'}</span>
          </div>`).join('')}</div></div>`;
      })()}
      ${obj.linkedBudgetId ? `<div class="fg"><div class="dk">Linked Budget</div><div class="dv">${(() => {
        const b = DATA.budgets.find(x => x.id === obj.linkedBudgetId);
        if (!b) return '—';
        const ov = b.spend - b.target;
        return `<span onclick="App.closeOverlay('detailModal');App.switchTabFiltered('budgets','${b.project}');" style="cursor:pointer;color:var(--accent);text-decoration:underline;font-weight:500">${b.name}</span>
          <span style="font-size:11px;color:var(--text3);margin-left:6px">${b.project}</span>
          <div style="margin-top:4px;font-size:11px">
            <span style="color:var(--text3)">Target: </span><span style="color:var(--text2)">${fmtCur(b.target)}</span>
            <span class="badge ${ov > 0 ? 'b-red' : 'b-green'}" style="margin-left:6px;font-size:9px">${ov > 0 ? '⬆ Over' : '⬇ Under'} by ${fmtCur(Math.abs(ov))}</span>
          </div>`;
      })()}</div></div>` : ''}`;
    actions = `<button class="btn btn-ghost" onclick="App.openEditForm('task','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('task','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'project') {
    const projT = DATA.tasks.filter(t => t.project === obj.name);
    const pDone = projT.filter(t => t.status === 'Complete').length;
    const pTotal = projT.length;
    const pOv = projT.filter(t => isOverdue(t)).length;
    const pct = pTotal ? Math.round(pDone / pTotal * 100) : 0;
    const projBudgets = DATA.budgets.filter(b => b.project === obj.name);
    const totalSpend = projBudgets.reduce((s, b) => s + (b.spend || 0), 0);
    const totalTarget = projBudgets.reduce((s, b) => s + (b.target || 0), 0);
    const ov = totalSpend - totalTarget;
    body = `
      <div class="fg-grid">
        <div class="fg"><div class="dk">Status</div><div class="dv">${projStatusBadge(obj.status)}</div></div>
        <div class="fg"><div class="dk">Company</div><div class="dv">${obj.company || '—'}</div></div>
        <div class="fg"><div class="dk">Timeline</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${obj.timeline || '—'}</div></div>
        <div class="fg"><div class="dk">Tasks</div><div class="dv">${pDone}/${pTotal} complete · <span style="color:${pOv ? 'var(--red)' : 'var(--green)'}">${pOv} overdue</span></div></div>
        <div class="fg"><div class="dk">Total Spend</div><div class="dv" style="color:${ov > 0 ? 'var(--red)' : 'var(--green)'}">${fmtCur(totalSpend)} / ${fmtCur(totalTarget)}</div></div>
        <div class="fg"><div class="dk">Variance</div><div class="dv" style="color:${ov > 0 ? 'var(--red)' : 'var(--green)'}">${ov > 0 ? 'Over' : 'Under'} by ${fmtCur(Math.abs(ov))}</div></div>
      </div>
      <div class="fg"><div class="dk">Progress</div><div class="dv">
        <div class="prog-wrap"><div class="prog-track" style="flex:1"><div class="prog-fill" style="width:${pct}%;background:${pCol(pct)}"></div></div><span class="prog-pct">${pct}%</span></div>
      </div></div>`;
    actions = `<button class="btn btn-ghost" onclick="App.openProjectBriefing('${obj.id}');App.closeOverlay('detailModal')">📋 Open Briefing</button><button class="btn btn-ghost" onclick="App.openEditForm('project','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('project','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'doc') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Status</div><div class="dv">${docBadge(obj.status)}</div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || 'General'}</span></div></div>
      <div class="fg"><div class="dk">Phase</div><div class="dv"><span class="badge b-purple">${obj.phase || '—'}</span></div></div>
      <div class="fg"><div class="dk">Last Edited</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${obj.edited || '—'}</div></div>
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="App.openEditForm('doc','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('doc','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'budget') {
    const v = obj.spend - obj.target;
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project}</span></div></div>
      <div class="fg"><div class="dk">Milestone</div><div class="dv">${obj.milestone || '—'}</div></div>
      <div class="fg"><div class="dk">Type</div><div class="dv"><span class="badge b-grey">${obj.type}</span></div></div>
      <div class="fg"><div class="dk">Target Budget</div><div class="dv">${fmtCur(obj.target)}</div></div>
      <div class="fg"><div class="dk">Spend</div><div class="dv" style="color:${obj.spend > obj.target ? 'var(--red)' : 'var(--green)'}">${fmtCur(obj.spend)}</div></div>
      <div class="fg"><div class="dk">Variance</div><div class="dv" style="color:${v > 0 ? 'var(--red)' : 'var(--green)'}">${v > 0 ? '-' : '+'}${fmtCur(Math.abs(v))}</div></div>
      ${obj.hours ? `<div class="fg"><div class="dk">Hours</div><div class="dv">${obj.hours}h @ ${fmtCur(obj.rate)}/h</div></div>` : ''}
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="App.openEditForm('budget','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('budget','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'stakeholder') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Role</div><div class="dv">${obj.title}</div></div>
      <div class="fg"><div class="dk">Company</div><div class="dv">${obj.company}</div></div>
      <div class="fg"><div class="dk">Category</div><div class="dv"><span class="badge b-grey">${obj.category}</span></div></div>
      <div class="fg"><div class="dk">Industry</div><div class="dv">${obj.industry}</div></div>
      <div class="fg"><div class="dk">Email</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:11px">${obj.email}</div></div>
      <div class="fg"><div class="dk">Phone</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:11px">${obj.phone}</div></div>
      <div class="fg"><div class="dk">Contact Preference</div><div class="dv">${obj.contact}</div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
      <div class="fg"><div class="dk">Last Contact</div><div class="dv">${fmtLastContact(obj)}</div></div>
    </div>`;
    actions = `<button class="btn btn-ghost" onclick="App.openEditForm('stakeholder','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('stakeholder','${obj.id}')">🗑 Delete</button>`;

  } else if (type === 'meeting') {
    body = `<div class="fg-grid">
      <div class="fg"><div class="dk">Date</div><div class="dv" style="font-family:'DM Mono',monospace;font-size:12px">${fmtDate(obj.date)}${obj.time ? ` <span style="color:var(--text3)">@ ${obj.time}</span>` : ''}</div></div>
      ${obj.duration ? `<div class="fg"><div class="dk">Duration</div><div class="dv">${obj.duration}</div></div>` : ''}
      <div class="fg"><div class="dk">Type</div><div class="dv"><span class="badge ${meetType(obj.type)}">${obj.type}</span></div></div>
      <div class="fg"><div class="dk">Category</div><div class="dv"><span class="badge ${obj.project ? 'b-accent' : 'b-grey'}">${obj.project ? '📁 Project Meeting' : '🏢 Internal Meeting'}</span></div></div>
      <div class="fg"><div class="dk">Project</div><div class="dv"><span class="ptag"><span class="pdot" style="background:${pColor(obj.project)}"></span>${obj.project || '—'}</span></div></div>
      <div class="fg"><div class="dk">Attendees</div><div class="dv">${obj.attendees || '—'}</div></div>
    </div>
    ${obj.notes ? `<div class="fg"><div class="dk">Notes</div><div class="dv dv-desc">${obj.notes}</div></div>` : ''}
    ${obj.nextSteps ? `<div class="fg" style="margin-top:8px"><div class="dk">Next Steps</div><div class="dv dv-desc">${obj.nextSteps}</div></div>` : ''}`;
    actions = `<button class="btn btn-ghost" onclick="App.openEditForm('meeting','${obj.id}')">✎ Edit</button><button class="btn btn-ghost btn-danger" onclick="App.openDeleteModal('meeting','${obj.id}')">🗑 Delete</button>`;
  }

  document.getElementById('detailBody').innerHTML = await Promise.resolve(body);
  document.getElementById('detailActions').innerHTML = actions;
  openOverlay('detailModal');
}