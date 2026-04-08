import { AppState } from '../state.js';
import { DATA } from '../storage.js';
import { pColor } from '../utils.js';
import { supabase } from '../supabase.js';

/* ══════════════════════════════════════════════════
   RENDERER — Documents (Supabase backed)
   ══════════════════════════════════════════════════ */

const ACCEPTED_TYPES = [
  '.pdf',
  '.doc','.docx',
  '.xls','.xlsx',
  '.ppt','.pptx',
  '.dwg','.dxf','.dwf',
  '.jpg','.jpeg','.png','.gif','.webp','.svg','.tiff','.tif'
].join(',');

const IMAGE_TYPES = ['jpg','jpeg','png','gif','webp','svg','tiff','tif'];
const PDF_TYPES = ['pdf'];

const fmtSize = bytes => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getExt = name => (name || '').split('.').pop().toLowerCase();

const fileIcon = name => {
  if (!name) return '📄';
  const ext = getExt(name);
  if (IMAGE_TYPES.includes(ext)) return '🖼';
  if (PDF_TYPES.includes(ext)) return '📕';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (['ppt','pptx'].includes(ext)) return '📊';
  if (['dwg','dxf','dwf'].includes(ext)) return '📐';
  return '📄';
};

const statusBadgeDoc = s => {
  if (s === 'Current') return `<span class="badge b-green">📗 Current</span>`;
  if (s === 'Superseded') return `<span class="badge b-grey">📕 Superseded</span>`;
  return `<span class="badge b-yellow">📙 Draft</span>`;
};

const isPreviewable = name => {
  const ext = getExt(name);
  return IMAGE_TYPES.includes(ext) || PDF_TYPES.includes(ext);
};

async function loadDocuments() {
  const wsId = AppState.currentWorkspaceId;
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', wsId)
    .order('uploaded_at', { ascending: false });
  if (error) { console.error('Error loading documents:', error); return []; }
  return data || [];
}

async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return { fileName, fileUrl: fileName };
}

async function getSignedUrl(fileName) {
  if (!fileName) return null;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileName, 3600);
  if (error) return null;
  return data.signedUrl;
}

async function getSignedUrls(docs) {
  return Promise.all(docs.map(async d => {
    if (!d.file_name) return d;
    const signedUrl = await getSignedUrl(d.file_name);
    return { ...d, signed_url: signedUrl };
  }));
}

async function deleteFile(fileName) {
  if (!fileName) return;
  await supabase.storage.from('documents').remove([fileName]);
}

async function saveDocument(docData) {
  const { data, error } = await supabase.from('documents').insert([docData]).select();
  if (error) throw error;
  return data[0];
}

async function deleteDocument(id, fileName) {
  await deleteFile(fileName);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

async function updateDocument(id, updates) {
  const { error } = await supabase.from('documents').update(updates).eq('id', id);
  if (error) throw error;
}

export async function renderDocuments(sub) {
  const ca = document.getElementById('contentArea');

  ca.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text3);font-size:13px">
    <div style="font-size:24px;margin-bottom:10px">⏳</div>Loading documents...
  </div>`;

  const rawDocs = await loadDocuments();
  const docs = await getSignedUrls(rawDocs);

  let list = docs;
  if (AppState.sbProject) list = list.filter(d => d.project === AppState.sbProject);
  if (AppState.sbStatus) list = list.filter(d => d.status === AppState.sbStatus);

  ca.innerHTML = `<div style="padding:20px 24px">
    <div class="page-banner">
      <div class="page-banner-icon">📄</div>
      <div>
        <h2>Documents</h2>
        <p>Upload and manage project documents, reports, drawings and files.</p>
      </div>
      <div style="margin-left:auto">
        <button class="btn btn-primary" id="uploadDocBtn">+ Upload New Document</button>
      </div>
    </div>

    <!-- UPLOAD FORM -->
    <div id="uploadForm" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
        <span>📎 Upload New Document</span>
        <button class="btn btn-ghost btn-sm" id="cancelUploadBtn">✕ Cancel</button>
      </div>
      <div class="fg-grid">
        <div class="fg"><label class="fl">Document Name *</label><input class="fi" id="doc-name" placeholder="e.g. Site Risk Assessment"/></div>
        <div class="fg"><label class="fl">Project</label><select class="fs" id="doc-project"><option value="">— No Project —</option>${DATA.projects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}</select></div>
        <div class="fg"><label class="fl">Document Type</label><input class="fi" id="doc-type" placeholder="e.g. Risk Assessment, Quote, Drawing"/></div>
        <div class="fg"><label class="fl">Revision</label><input class="fi" id="doc-revision" placeholder="e.g. Rev A, Rev 1, 001"/></div>
        <div class="fg"><label class="fl">Status</label><select class="fs" id="doc-status"><option>Draft</option><option>Current</option><option>Superseded</option></select></div>
        <div class="fg"><label class="fl">Linked Task</label><select class="fs" id="doc-linked-task"><option value="">— No Task —</option></select></div>
      </div>
      <div class="fg"><label class="fl">Notes</label><textarea class="fta" id="doc-notes" placeholder="Any additional notes about this document…"></textarea></div>
      <div class="fg">
        <label class="fl">Attach File *</label>
        <div style="border:2px dashed var(--border);border-radius:var(--rs);padding:28px;text-align:center;cursor:pointer;transition:border-color .15s" id="dropZone">
          <div style="font-size:32px;margin-bottom:8px">📁</div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:6px">Drag and drop a file here or <span style="color:var(--accent);text-decoration:underline">click to browse</span></div>
          <div style="font-size:11px;color:var(--text3)">PDF · Word · Excel · PowerPoint · CAD · Images — max 30MB</div>
          <input type="file" id="doc-file" accept="${ACCEPTED_TYPES}" style="display:none"/>
        </div>
        <div id="filePreview" style="display:none;margin-top:10px;padding:12px 16px;background:var(--surface2);border-radius:var(--rs);font-size:13px;color:var(--text2);align-items:center;gap:12px"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <button class="btn btn-ghost" id="cancelUploadBtn2">Cancel</button>
        <button class="btn btn-primary" id="saveDocBtn">⬆ Upload & Save Document</button>
      </div>
    </div>

    <!-- SEARCH BAR -->
    <div class="table-card" style="margin-bottom:16px">
      <div style="padding:12px 18px;display:flex;align-items:center;gap:10px">
        <div class="search-wrap" style="max-width:600px;flex:1">
          <span class="search-icon">🔍</span>
          <input placeholder="Search documents by name, type, project or notes…" id="docSearch" style="width:100%;background:var(--surface3);border:1px solid var(--border);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;padding:6px 10px 6px 30px;border-radius:var(--rs);outline:none"/>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3)" id="docCount">${list.length} document${list.length !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <!-- DOCUMENTS TABLE -->
    <div class="table-card">
      <div class="table-header table-title-sticky">
        <div class="table-title">📄 Document Register</div>
      </div>
      ${list.length ? `
      <table>
        <thead class="table-thead-sticky">
          <tr>
            <th>Document Name</th>
            <th>Project</th>
            <th>Type</th>
            <th>Revision</th>
            <th>Linked Task</th>
            <th>Status</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="docTableBody">
          ${renderDocRows(list)}
        </tbody>
      </table>` : `
      <div class="empty" id="docEmpty">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No documents yet</div>
        <div style="font-size:13px;color:var(--text3);margin-top:6px">Click <strong>+ Upload New Document</strong> to add your first file</div>
      </div>`}
    </div>
  </div>`;

  /* ── SEARCH FILTER ── */
  document.getElementById('docSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = list.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.doc_type || '').toLowerCase().includes(q) ||
      (d.project || '').toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q) ||
      (d.linked_task_name || '').toLowerCase().includes(q)
    );
    const tbody = document.getElementById('docTableBody');
    if (tbody) tbody.innerHTML = renderDocRows(filtered);
    const count = document.getElementById('docCount');
    if (count) count.textContent = `${filtered.length} document${filtered.length !== 1 ? 's' : ''}`;
    bindDocActions();
  });

  /* ── UPLOAD FORM ── */
  document.getElementById('uploadDocBtn').addEventListener('click', () => {
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('uploadDocBtn').style.display = 'none';
    document.getElementById('uploadForm').scrollIntoView({ behavior: 'smooth' });
  });

  const cancelUpload = () => {
    document.getElementById('uploadForm').style.display = 'none';
    document.getElementById('uploadDocBtn').style.display = 'inline-flex';
    dropZone._selectedFile = null;
  };

  document.getElementById('cancelUploadBtn').addEventListener('click', cancelUpload);
  document.getElementById('cancelUploadBtn2').addEventListener('click', cancelUpload);

  /* ── PROJECT CHANGE → UPDATE TASK DROPDOWN ── */
  document.getElementById('doc-project').addEventListener('change', e => {
    const projectName = e.target.value;
    const taskSelect = document.getElementById('doc-linked-task');
    const tasks = projectName ? DATA.tasks.filter(t => t.project === projectName) : [];
    taskSelect.innerHTML = `<option value="">— No Task —</option>` +
      tasks.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('');
  });

  /* ── DROP ZONE ── */
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('click', () => document.getElementById('doc-file').click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border)';
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  document.getElementById('doc-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  });

  function handleFileSelect(file) {
    if (file.size > 30 * 1024 * 1024) {
      alert('File is too large. Maximum size is 30MB.');
      return;
    }
    const preview = document.getElementById('filePreview');
    preview.style.display = 'flex';
    preview.innerHTML = `
      <span style="font-size:24px">${fileIcon(file.name)}</span>
      <div>
        <div style="font-weight:500;color:var(--text)">${file.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${fmtSize(file.size)}</div>
      </div>`;
    dropZone.style.borderColor = 'var(--green)';
    dropZone._selectedFile = file;
    const nameInput = document.getElementById('doc-name');
    if (!nameInput.value) {
      nameInput.value = file.name.replace(/\.[^/.]+$/, '');
    }
  }

  /* ── SAVE DOCUMENT ── */
  document.getElementById('saveDocBtn').addEventListener('click', async () => {
    const name = document.getElementById('doc-name').value.trim();
    const file = dropZone._selectedFile;
    if (!name) { alert('Please enter a document name.'); return; }
    if (!file) { alert('Please attach a file before saving.'); return; }

    const saveBtn = document.getElementById('saveDocBtn');
    saveBtn.textContent = '⏳ Uploading...';
    saveBtn.disabled = true;

    try {
      const { fileName, fileUrl } = await uploadFile(file);
      const taskSelect = document.getElementById('doc-linked-task');
      const taskId = taskSelect.value || null;
      const taskName = taskId ? taskSelect.options[taskSelect.selectedIndex].dataset.name : null;

      await saveDocument({
        name,
        project: document.getElementById('doc-project').value || null,
        doc_type: document.getElementById('doc-type').value.trim() || null,
        revision: document.getElementById('doc-revision').value.trim() || null,
        status: document.getElementById('doc-status').value,
        notes: document.getElementById('doc-notes').value.trim() || null,
        linked_task_id: taskId,
        linked_task_name: taskName,
        file_name: fileName,
        file_url: fileUrl,
        file_size: file.size,
        workspace_id: AppState.currentWorkspaceId,
      });
      await renderDocuments(sub);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
      saveBtn.textContent = '⬆ Upload & Save Document';
      saveBtn.disabled = false;
    }
  });

  bindDocActions();
}

/* ── RENDER DOCUMENT ROWS ── */
function renderDocRows(list) {
  if (!list.length) return `<tr><td colspan="10" style="padding:24px;text-align:center;color:var(--text3)">No documents match your search.</td></tr>`;
  return list.map(d => {
    const ext = getExt(d.file_name);
    const canPreview = isPreviewable(d.file_name);
    return `<tr>
      <td class="td-main">
        <span style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px;flex-shrink:0">${fileIcon(d.file_name)}</span>
          <span>${d.name}</span>
        </span>
      </td>
      <td>${d.project ? `<span class="ptag"><span class="pdot" style="background:${pColor(d.project)}"></span>${d.project}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="font-size:12px;color:var(--text2)">${d.doc_type || '—'}</td>
      <td class="td-mono" style="font-size:11px">${d.revision || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${d.linked_task_name ? `<span style="display:flex;align-items:center;gap:4px">✅ ${d.linked_task_name}</span>` : '—'}</td>
      <td>${statusBadgeDoc(d.status)}</td>
      <td class="td-mono">${fmtSize(d.file_size)}</td>
      <td class="td-mono">${d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : '—'}</td>
      <td style="font-size:12px;color:var(--text3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.notes || ''}">${d.notes || '—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          ${canPreview ? `<button class="btn btn-ghost btn-sm" data-preview-url="${d.signed_url || ''}" data-preview-ext="${ext}" data-preview-name="${d.name}">🔎 Preview</button>` : ''}
          ${d.signed_url ? `<a href="${d.signed_url}" target="_blank" class="btn btn-ghost btn-sm">📖 Open</a>` : ''}
          <button class="btn btn-ghost btn-sm" data-edit-id="${d.id}">✎ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" data-delete-id="${d.id}" data-delete-file="${d.file_name || ''}">🗑️</button>
        </div>
      </td>
    </tr>
    ${d._preview ? `<tr><td colspan="10" style="padding:0;background:var(--surface2)">
      <div style="padding:16px 20px">
        ${IMAGE_TYPES.includes(ext) ? `<img src="${d.signed_url || ''}" style="max-width:100%;max-height:500px;border-radius:var(--rs);object-fit:contain"/>` :
          `<iframe src="${d.signed_url || ''}" style="width:100%;height:500px;border:none;border-radius:var(--rs)"></iframe>`}
      </div>
    </td></tr>` : ''}`;
  }).join('');
}

/* ── BIND DELETE AND PREVIEW ACTIONS ── */
function bindDocActions() {
  /* Preview toggle */
  document.querySelectorAll('[data-preview-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.previewUrl;
      const ext = btn.dataset.previewExt;
      const name = btn.dataset.previewName;
      const row = btn.closest('tr');

      /* Check if preview row already exists */
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.dataset.previewRow) {
        nextRow.remove();
        btn.textContent = '🔎 Preview';
        return;
      }

      /* Create preview row */
      const previewRow = document.createElement('tr');
      previewRow.dataset.previewRow = '1';
      previewRow.innerHTML = `<td colspan="10" style="padding:0;background:var(--surface2)">
        <div style="padding:16px 20px">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text2)">${name}</div>
          ${IMAGE_TYPES.includes(ext)
            ? `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:var(--rs);object-fit:contain;display:block"/>`
            : `<iframe src="${url}" style="width:100%;height:500px;border:none;border-radius:var(--rs)"></iframe>`}
        </div>
      </td>`;
      row.after(previewRow);
      btn.textContent = '✕ Close';
    });
  });

  /* Edit */
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editId;
      // Find doc in current list
      const row = btn.closest('tr');
      // Check if edit form row already exists
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.dataset.editRow) {
        nextRow.remove();
        btn.textContent = '✎ Edit';
        return;
      }
      // Remove any other open edit rows
      document.querySelectorAll('[data-edit-row]').forEach(r => r.remove());
      document.querySelectorAll('[data-edit-id]').forEach(b => { if (b !== btn) b.textContent = '✎ Edit'; });

      // Find doc data from the row
      const docName = row.querySelector('.td-main span span:last-child')?.textContent || '';
      const editRow = document.createElement('tr');
      editRow.dataset.editRow = '1';
      editRow.innerHTML = `<td colspan="10" style="padding:0;background:var(--surface2);border-bottom:2px solid var(--accent)">
        <div style="padding:20px 24px" id="editForm-${id}">
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:16px;color:var(--accent)">✎ Edit Document</div>
          <div class="fg-grid">
            <div class="fg"><label class="fl">Document Name *</label><input class="fi" id="edit-name-${id}" value=""/></div>
            <div class="fg"><label class="fl">Project</label><select class="fs" id="edit-project-${id}"><option value="">— No Project —</option>${DATA.projects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}</select></div>
            <div class="fg"><label class="fl">Document Type</label><input class="fi" id="edit-type-${id}" value=""/></div>
            <div class="fg"><label class="fl">Revision</label><input class="fi" id="edit-revision-${id}" value=""/></div>
            <div class="fg"><label class="fl">Status</label><select class="fs" id="edit-status-${id}"><option>Draft</option><option>Current</option><option>Superseded</option></select></div>
            <div class="fg"><label class="fl">Linked Task</label><select class="fs" id="edit-linked-task-${id}"><option value="">— No Task —</option></select></div>
          </div>
          <div class="fg"><label class="fl">Notes</label><textarea class="fta" id="edit-notes-${id}"></textarea></div>
          <div class="fg" style="margin-top:8px">
            <label class="fl">Replace File <span style="font-size:10px;color:var(--text3)">(optional — leave blank to keep existing file)</span></label>
            <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
              <input type="file" id="edit-file-${id}" accept="${ACCEPTED_TYPES}" style="font-size:12px;color:var(--text2);background:var(--surface3);border:1px solid var(--border);padding:6px 10px;border-radius:var(--rs);flex:1"/>
              <span id="edit-file-status-${id}" style="font-size:11px;color:var(--text3)">No file selected</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
            <button class="btn btn-ghost" id="edit-cancel-${id}">Cancel</button>
            <button class="btn btn-primary" id="edit-save-${id}">💾 Save Changes</button>
          </div>
        </div>
      </td>`;
      row.after(editRow);
      btn.textContent = '✕ Close';

      // Load doc data from Supabase and populate form
      supabase.from('documents').select('*').eq('id', id).single().then(({ data: d }) => {
        if (!d) return;
        document.getElementById(`edit-name-${id}`).value = d.name || '';
        document.getElementById(`edit-type-${id}`).value = d.doc_type || '';
        document.getElementById(`edit-revision-${id}`).value = d.revision || '';
        document.getElementById(`edit-notes-${id}`).value = d.notes || '';
        const projSel = document.getElementById(`edit-project-${id}`);
        if (d.project) projSel.value = d.project;
        const statusSel = document.getElementById(`edit-status-${id}`);
        if (d.status) statusSel.value = d.status;
        // Load tasks for selected project
        const tasks = d.project ? DATA.tasks.filter(t => t.project === d.project) : DATA.tasks;
        const taskSel = document.getElementById(`edit-linked-task-${id}`);
        taskSel.innerHTML = `<option value="">— No Task —</option>` +
          tasks.map(t => `<option value="${t.id}" data-name="${t.name}"${t.id === d.linked_task_id ? ' selected' : ''}>${t.name}</option>`).join('');
        // Project change updates task list
        projSel.addEventListener('change', () => {
          const pts = projSel.value ? DATA.tasks.filter(t => t.project === projSel.value) : DATA.tasks;
          taskSel.innerHTML = `<option value="">— No Task —</option>` +
            pts.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('');
        });
      });

      // File input feedback
      document.getElementById(`edit-file-${id}`).addEventListener('change', e => {
        const f = e.target.files[0];
        const status = document.getElementById(`edit-file-status-${id}`);
        if (f) {
          if (f.size > 30 * 1024 * 1024) { alert('File too large. Max 30MB.'); e.target.value = ''; return; }
          status.textContent = `${f.name} (${fmtSize(f.size)})`;
          status.style.color = 'var(--green)';
        } else {
          status.textContent = 'No file selected';
          status.style.color = 'var(--text3)';
        }
      });

      // Cancel
      document.getElementById(`edit-cancel-${id}`).addEventListener('click', () => {
        editRow.remove();
        btn.textContent = '✎ Edit';
      });

      // Save
      document.getElementById(`edit-save-${id}`).addEventListener('click', async () => {
        const saveBtn = document.getElementById(`edit-save-${id}`);
        const name = document.getElementById(`edit-name-${id}`).value.trim();
        if (!name) { alert('Document name is required.'); return; }
        saveBtn.textContent = '⏳ Saving...';
        saveBtn.disabled = true;
        try {
          const taskSel = document.getElementById(`edit-linked-task-${id}`);
          const taskId = taskSel.value || null;
          const taskName = taskId ? taskSel.options[taskSel.selectedIndex].dataset.name : null;
          const projSel = document.getElementById(`edit-project-${id}`);
          const updates = {
            name,
            project: projSel.value || null,
            doc_type: document.getElementById(`edit-type-${id}`).value.trim() || null,
            revision: document.getElementById(`edit-revision-${id}`).value.trim() || null,
            status: document.getElementById(`edit-status-${id}`).value,
            notes: document.getElementById(`edit-notes-${id}`).value.trim() || null,
            linked_task_id: taskId,
            linked_task_name: taskName,
          };
          // If new file selected, upload it and delete old one
          const fileInput = document.getElementById(`edit-file-${id}`);
          if (fileInput.files[0]) {
            // Get old file name first
            const { data: oldDoc } = await supabase.from('documents').select('file_name,file_size').eq('id', id).single();
            const { fileName, fileUrl } = await uploadFile(fileInput.files[0]);
            updates.file_name = fileName;
            updates.file_url = fileUrl;
            updates.file_size = fileInput.files[0].size;
            if (oldDoc?.file_name) await deleteFile(oldDoc.file_name);
          }
          await updateDocument(id, updates);
          editRow.remove();
          await renderDocuments(sub);
        } catch (err) {
          console.error('Save error:', err);
          alert('Save failed: ' + err.message);
          saveBtn.textContent = '💾 Save Changes';
          saveBtn.disabled = false;
        }
      });
    });
  });

  /* Delete */
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteId;
      const fileName = btn.dataset.deleteFile;
      App.openDeleteModal('doc', id, 'this document');
      // Override the confirm button to also delete from Supabase storage
      const confirmBtn = document.getElementById('deleteModalConfirmBtn');
      confirmBtn.onclick = async () => {
        App.closeDeleteModal();
        try {
          await deleteDocument(id, fileName);
          const row = btn.closest('tr');
          const nextRow = row.nextElementSibling;
          if (nextRow && nextRow.dataset.previewRow) nextRow.remove();
          row.remove();
        } catch (err) {
          console.error('Delete error:', err);
          alert('Delete failed: ' + err.message);
        }
      };
    });
  });
}