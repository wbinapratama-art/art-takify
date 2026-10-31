/* Kategori — pengganti kategori.php + kategori_action.php */
(function () {
  'use strict';
  const { Util, Auth, Categories, Flash } = window.Store;
  const esc = Util.esc;
  if (Auth.isAdmin()) { location.replace('fitur.html?p=pengguna'); return; }

  function render({ user }) {
    const cats = Categories.all(user.workspace_id);
    const selected = parseInt(Util.param('id', String((cats[0] || {}).id || 0)), 10);
    const active = cats.find((c) => c.id === selected) || null;
    const count = (c) => Categories.countTasks(c.id);

    const list = cats.map((c) => `
      <a class="card category-card ${c.id === selected ? 'selected' : ''}" href="kategori.html?id=${c.id}">
        <span class="category-icon" style="color:${esc(c.warna)}">▱</span><b>${esc(c.nama)}</b>
        <small>${esc(c.description || 'Kategori workspace')}</small><span>${count(c)} tugas aktif</span></a>`).join('');

    const detail = active ? `
      <section class="card category-detail">
        <div class="category-head"><span class="category-icon" style="color:${esc(active.warna)}">▱</span>
          <div><h2>${esc(active.nama)}</h2><small class="muted">Kategori workspace</small></div><span class="chip">Dibagikan</span></div>
        <form class="form" onsubmit="return false"><label>Nama kategori<input value="${esc(active.nama)}" readonly></label>
          <label>Deskripsi<textarea rows="3" readonly>${esc(active.description || '')}</textarea></label>
          <div class="color-options"><b>Warna</b><span style="background:${esc(active.warna)}"></span></div></form>
      </section>
      <section class="card"><h3>Berbagi kategori</h3>
        <div class="info-box">Akses kategori mengikuti anggota workspace dan izin yang tersimpan.</div>
        <p class="muted">Belum ada pengaturan anggota spesifik untuk kategori ini.</p></section>
      <section class="card category-bottom"><a class="btn" href="tugas.html">Lihat ${count(active)} tugas</a>
        <button class="btn btn-danger" type="button" id="del-cat" data-id="${active.id}">Hapus kategori</button></section>`
      : '<section class="card empty">Pilih kategori untuk melihat detailnya.</section>';

    return `
    <div class="category-layout"><div class="category-column">
      <form class="card form" id="new-category"><h3>Tambah kategori</h3>
        <label>Nama kategori<input name="nama" required maxlength="50" placeholder="Contoh: Produk"></label>
        <label>Warna<input type="color" name="warna" value="#5b55e7"></label>
        <button class="btn btn-primary" type="submit">Simpan kategori</button></form>
      <section class="category-list">${list}</section></div>
      <div>${detail}</div></div>`;
  }

  function after({ user }) {
    document.getElementById('new-category').addEventListener('submit', (e) => {
      e.preventDefault();
      const nama = e.target.elements.nama.value.trim();
      if (!nama) Flash.add('error', 'Nama kategori wajib diisi.');
      else { Categories.create(user.id, user.workspace_id, { nama, warna: e.target.elements.warna.value }); Flash.add('success', 'Kategori ditambahkan.'); }
      location.href = 'kategori.html';
    });
    document.getElementById('del-cat')?.addEventListener('click', (e) => {
      if (!confirm('Hapus kategori ini?')) return;
      Categories.remove(Number(e.target.dataset.id), user.workspace_id);
      Flash.add('success', 'Kategori dihapus.');
      location.href = 'kategori.html';
    });
  }

  Layout.mount({
    page: 'Kategori',
    subtitle: 'Berikan ruang yang jelas untuk setiap jenis pekerjaan.',
    pageAction: { href: '#new-category', label: '＋ Tambah kategori' },
    render, after,
  });
})();
