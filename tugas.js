/* Daftar tugas — pengganti tugas.php (+ aksi toggle/hapus dari tugas_action.php) */
(function () {
  'use strict';
  const { Util, Auth, Tasks, Flash } = window.Store;
  const esc = Util.esc;

  // Admin tidak memakai halaman ini (sama seperti tugas.php)
  if (Auth.isAdmin()) { location.replace('fitur.html?p=pengguna'); return; }

  const TABS = [['semua', 'Semua tugas'], ['belum', 'Belum dimulai'], ['proses', 'Sedang dikerjakan'], ['selesai', 'Selesai']];

  function render({ user }) {
    const status = Util.param('status', 'semua');
    const q = Util.param('q').trim();
    const tasks = Tasks.all(user.id, user.workspace_id, status, q || null);
    const all = Tasks.all(user.id, user.workspace_id);
    const now = Date.now();
    const overdue = all.filter((t) => t.status !== 'selesai' && t.deadline && new Date(t.deadline).getTime() < now);

    const tabs = TABS.map(([k, v]) => `<button type="button" data-status="${k}" class="tab ${status === k ? 'active' : ''}">${esc(v)}</button>`).join('');

    const warning = overdue.length
      ? `<div class="alert alert-warning"><b>${overdue.length} tugas melewati tenggat</b><br>Perbarui status atau atur ulang tenggat agar rencana tetap sinkron.</div>`
      : '';

    const rows = tasks.map((t) => `
      <tr>
        <td><button type="button" class="check ${t.status === 'selesai' ? 'checked' : ''}" data-toggle="${t.id}" aria-label="Ubah status"></button></td>
        <td><a class="task-name" href="tugas_detail.html?id=${t.id}">${esc(t.judul)}</a><small>${esc(t.deskripsi || 'Tugas workspace')}</small></td>
        <td>${esc(t.kategori_nama || '—')}</td>
        <td><span class="badge badge-${esc(t.prioritas)}">${esc(Util.prioritasLabel(t.prioritas))}</span></td>
        <td><div class="table-progress"><div class="progress"><span style="width:${Number(t.progress) || 0}%"></span></div> ${Number(t.progress) || 0}%</div></td>
        <td>${t.deadline ? Util.fmt(t.deadline, 'd M · H:i') : '—'}</td>
        <td class="task-actions"><a href="tugas_form.html?id=${t.id}">Edit</a>
          <button type="button" class="text-danger" data-delete="${t.id}">Hapus</button></td>
      </tr>`).join('');

    const body = tasks.length
      ? `<div class="table-scroll"><table class="task-table"><thead><tr>
          <th></th><th>Nama tugas</th><th>Kategori</th><th>Prioritas</th><th>Progress</th><th>Tenggat (WIB)</th><th>Aksi</th>
        </tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty"><div class="empty-icon">▤</div><p>Belum ada tugas untuk filter ini. <a href="tugas_form.html">Tambah tugas</a>.</p></div>`;

    return `
    <div class="toolbar">
      <form class="filter-tabs" id="filter-form">${tabs}<input class="search" name="q" value="${esc(q)}" placeholder="Cari tugas..."></form>
    </div>
    ${warning}
    <section class="card task-table-card">
      <div class="task-table-summary">${tasks.length} tugas · ${all.filter((t) => t.status !== 'selesai').length} aktif, ${all.filter((t) => t.status === 'selesai').length} selesai</div>
      ${body}
    </section>`;
  }

  function after({ user }) {
    const go = (status, q) => {
      const params = new URLSearchParams();
      if (status && status !== 'semua') params.set('status', status);
      if (q) params.set('q', q);
      const qs = params.toString();
      location.href = 'tugas.html' + (qs ? '?' + qs : '');
    };
    const form = document.getElementById('filter-form');
    const search = form.querySelector('input[name="q"]');

    form.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.status, search.value.trim())));
    form.addEventListener('submit', (event) => { event.preventDefault(); go(Util.param('status', 'semua'), search.value.trim()); });

    document.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', () => {
      Tasks.toggleStatus(Number(btn.dataset.toggle), user.workspace_id);
      Flash.add('success', 'Status tugas diperbarui.');
      location.reload();
    }));

    document.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => {
      if (!confirm('Hapus tugas ini?')) return;
      Tasks.remove(Number(btn.dataset.delete), user.workspace_id);
      Flash.add('success', 'Tugas dihapus.');
      location.reload();
    }));
  }

  Layout.mount({
    page: 'Tugas saya',
    subtitle: 'Prioritaskan yang penting. Selesaikan satu per satu.',
    pageAction: { href: 'tugas_form.html', label: '＋ Tambah tugas' },
    render,
    after,
  });
})();
