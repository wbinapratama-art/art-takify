/* Dashboard — pengganti dashboard.php */
(function () {
  'use strict';
  const { Util, Auth, Tasks } = window.Store;
  const esc = Util.esc;

  function render({ user, isAdmin }) {
    const stats = Tasks.stats(user.workspace_id);
    const tasks = Tasks.all(user.id, user.workspace_id);
    const today = Util.todayKey();
    const dueToday = tasks.filter((t) => t.status !== 'selesai' && t.deadline && t.deadline.slice(0, 10) <= today);
    const shown = tasks.filter((t) => t.status !== 'selesai').slice(0, 5);

    const cards = isAdmin
      ? [['Lagi dikerjain tim', stats.total - stats.selesai, 'accent-blue'], ['Kelarin bareng', stats.selesai, 'accent-green'], ['Deadline hari ini', dueToday.length, 'accent-blue'], ['Waktunya gas', stats.terlambat, 'accent-red']]
      : [['Lagi kamu kerjain', stats.total - stats.selesai, 'accent-blue'], ['Udah kelar', stats.selesai, 'accent-green'], ['Deadline hari ini', dueToday.length, 'accent-blue'], ['Jangan ditunda', stats.terlambat, 'accent-red']];

    const taskRows = shown.map((t) => `
      <a class="dashboard-task" href="tugas_detail.html?id=${t.id}"><span class="check-static">○</span>
        <div class="task-main"><strong>${esc(t.judul)}</strong>
          <div class="muted small">${esc(t.kategori_nama || 'Tanpa kategori')} · ${t.deadline ? Util.fmt(t.deadline, 'd M, H:i') : 'Tanpa tenggat'}</div>
          <div class="progress"><span style="width:${Number(t.progress) || 0}%"></span></div>
        </div>
        <span class="badge badge-${esc(t.prioritas)}">${esc(Util.prioritasLabel(t.prioritas))}</span>
      </a>`).join('');

    const empty = shown.length ? '' : `<p class="muted">${isAdmin ? 'Wih, kerjaan tim udah kelar semua. Keren!' : 'Wih, tugasmu udah kelar semua. Keren!'}</p>`;

    return `
    <section class="stats-grid">
      ${cards.map(([label, value, color]) => `
        <article class="stat-card ${color}"><div class="stat-label">${esc(label)}</div><div class="stat-value">${value}</div></article>`).join('')}
    </section>
    <div class="dashboard-columns">
      <section class="card">
        <div class="panel-head">
          <h3>${isAdmin ? 'Cek kerjaan tim hari ini' : 'Gas tugas hari ini'}</h3>
          <a href="tugas.html">${isAdmin ? 'Intip semua tugas →' : 'Lihat semua tugas →'}</a>
        </div>
        ${empty}${taskRows}
      </section>
      <aside class="card weekly-card">
        <h3>${isAdmin ? 'Performa tim' : 'Progress kamu'}</h3>
        <p><strong>${stats.selesai}</strong> tugas selesai</p>
        <div class="muted small">${isAdmin ? 'Jaga tim tetap kompak, target beres bareng.' : 'Santai, cicil aja. Lama-lama kelar juga.'}</div>
        <div class="weekly-bars"><i style="height:32%"></i><i style="height:55%"></i><i style="height:41%"></i><i style="height:75%"></i><i style="height:25%"></i><i style="height:12%"></i><i style="height:8%"></i></div>
        <div class="week-labels"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div>
        <a href="fitur.html?p=reminder">${isAdmin ? 'Kepo reminder tim →' : 'Cek reminder kamu →'}</a>
      </aside>
    </div>`;
  }

  Layout.mount({
    page: 'Dashboard',
    subtitle: ({ isAdmin }) => (isAdmin
      ? 'Yo, Admin! Cek progres tim, biar kerjaan nggak ada yang kelewat.'
      : 'Gaskeun! Pilih satu tugas, beresin, lanjut lagi.'),
    pageAction: { href: 'tugas_form.html', label: '＋ Tambah tugas' },
    render,
  });
})();
