/* Detail tugas — pengganti tugas_detail.php */
(function () {
  'use strict';
  const { Util, Auth, Tasks, DB, Flash } = window.Store;
  const esc = Util.esc;
  if (Auth.isAdmin()) { location.replace('fitur.html?p=pengguna'); return; }
  const id = parseInt(Util.param('id', '0'), 10) || 0;

  function render({ user }) {
    const t = Tasks.find(id, user.workspace_id);
    if (!t) { location.replace('tugas.html'); return ''; }
    const subs = DB.where('subtasks', (s) => s.task_id === id);
    const comments = DB.where('task_comments', (c) => c.task_id === id);
    const files = DB.where('attachments', (a) => a.task_id === id);
    const done = subs.filter((s) => s.is_completed).length;
    const p = Number(t.progress) || 0;

    return `
    <p class="detail-back"><a href="tugas.html">← Semua tugas</a>
      <span class="badge badge-${esc(t.prioritas)}">${esc(Util.prioritasLabel(t.prioritas))}</span>
      <span class="chip">${esc(t.kategori_nama || 'Tanpa kategori')}</span>
      <span class="status-pill">${esc(Util.statusLabel(t.status))}</span></p>
    <h2 class="detail-title">${esc(t.judul)}</h2>
    <div class="detail-columns">
      <section>
        <article class="card"><h3>Ringkasan</h3>
          <p>${Util.nl2br(t.deskripsi || 'Belum ada deskripsi.')}</p>
          <div class="detail-progress">Progress keseluruhan <b>${p}%</b><div class="progress"><span style="width:${p}%"></span></div></div>
          <hr>
          <h3>Sub-tugas <small class="muted">${done} dari ${subs.length} selesai</small></h3>
          ${subs.map((s) => `<p>${s.is_completed ? '☑' : '☐'} ${esc(s.title)}</p>`).join('') || '<p class="muted">Belum ada sub-tugas.</p>'}
        </article>
        <article class="card"><h3>Lampiran</h3>
          ${files.map((f) => `<div class="simple-row"><div><b>${esc(f.file_name)}</b><small>${esc(f.file_type || 'File')} · ${(Number(f.file_size) / 1000).toFixed(1)} MB</small></div><a href="${esc(f.file_path)}" download>Unduh</a></div>`).join('') || '<p class="muted">Belum ada lampiran.</p>'}
        </article>
        <article class="card"><h3>Diskusi</h3>
          ${comments.map((c) => { const u = DB.find('users', (x) => x.id === c.user_id); return `<div class="comment"><b>${esc(u ? u.name : '—')}</b><time>${Util.fmt(c.created_at, 'd M Y · H:i')}</time><p>${esc(c.comment)}</p></div>`; }).join('') || '<p class="muted">Belum ada komentar.</p>'}
        </article>
      </section>
      <aside class="card task-detail-aside"><h3>Detail tugas</h3>
        <p><span>Penanggung jawab</span><b>${esc(user.nama)}</b></p>
        <p><span>Tenggat</span><b>${t.deadline ? Util.fmt(t.deadline, 'd M Y · H:i') : 'Tanpa tenggat'}</b></p>
        <p><span>Prioritas</span><b>${esc(Util.prioritasLabel(t.prioritas))}</b></p>
        <p><span>Status</span><b>${esc(Util.statusLabel(t.status))}</b></p>
        <button class="btn btn-primary btn-block" id="toggle-btn" type="button">${t.status === 'selesai' ? 'Tandai belum selesai' : 'Tandai selesai'}</button>
      </aside>
    </div>`;
  }

  Layout.mount({
    page: 'Detail tugas',
    subtitle: ({ user }) => (Tasks.find(id, user.workspace_id) || {}).judul || '',
    pageAction: { href: 'tugas_form.html?id=' + id, label: 'Edit tugas' },
    render,
    after: ({ user }) => document.getElementById('toggle-btn')?.addEventListener('click', () => {
      Tasks.toggleStatus(id, user.workspace_id);
      Flash.add('success', 'Status tugas diperbarui.');
      location.href = 'tugas.html';
    }),
  });
})();
