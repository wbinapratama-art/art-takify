/* Form tambah/edit tugas — pengganti tugas_form.php + aksi "save" di tugas_action.php */
(function () {
  'use strict';
  const { Util, Auth, Tasks, Categories, DB, Flash } = window.Store;
  const esc = Util.esc;
  if (Auth.isAdmin()) { location.replace('fitur.html?p=pengguna'); return; }

  const id = parseInt(Util.param('id', '0'), 10) || 0;
  const isEdit = id > 0;

  function render({ user }) {
    let v = {};
    if (isEdit) {
      v = Tasks.find(id, user.workspace_id);
      if (!v) { Flash.add('error', 'Tugas tidak ditemukan.'); location.replace('tugas.html'); return ''; }
    } else if (Util.param('template')) {
      const t = DB.find('templates', (x) => x.id === parseInt(Util.param('template'), 10));
      if (t) v = { judul: t.title, deskripsi: t.description, kategori_id: t.category_id, prioritas: t.default_priority.toLowerCase() };
    }
    const cats = Categories.all(user.workspace_id);
    const deadline = v.deadline ? Util.toLocalInput(v.deadline) : Util.toLocalInput(new Date(Date.now() + 86400000));
    const sel = (a, b) => (String(a ?? '') === String(b) ? 'selected' : '');

    return `
    <form id="task-form" class="task-editor" novalidate>
      <div class="editor-main">
        <section class="card form"><h3>Informasi tugas</h3>
          <label>Judul tugas *<input name="judul" value="${esc(v.judul || '')}" required maxlength="200" placeholder="Tulis nama tugas"></label>
          <label>Deskripsi<textarea name="deskripsi" rows="4" placeholder="Tambahkan konteks atau detail tugas">${esc(v.deskripsi || '')}</textarea></label>
          <div class="form-row">
            <label>Kategori<select name="kategori_id"><option value="">Tanpa kategori</option>
              ${cats.map((k) => `<option value="${k.id}" ${sel(v.kategori_id, k.id)}>${esc(k.nama)}</option>`).join('')}</select></label>
            <label>Penanggung jawab<input value="${esc(user.nama)}" disabled></label>
          </div>
          <div class="form-row">
            <label>Prioritas<select name="prioritas">${['rendah', 'sedang', 'tinggi'].map((p) => `<option value="${p}" ${sel(v.prioritas || 'sedang', p)}>${Util.prioritasLabel(p)}</option>`).join('')}</select></label>
            <label>Progress (%)<input type="number" name="progress" min="0" max="100" value="${Number(v.progress) || 0}"></label>
          </div>
          <label>Status<select name="status">${['belum', 'proses', 'selesai'].map((s) => `<option value="${s}" ${sel(v.status || 'belum', s)}>${Util.statusLabel(s)}</option>`).join('')}</select></label>
        </section>
        <section class="card form"><h3>Jadwal & pengulangan</h3>
          <label>Tanggal dan waktu tenggat *<input type="datetime-local" name="deadline" required value="${esc(deadline)}"></label>
          <label class="check-label"><input type="checkbox" name="is_recurring" ${v.is_recurring ? 'checked' : ''}> Jadikan tugas berulang</label>
          <label>Ulangi setiap<select name="recurrence_rule">
            ${[['daily', 'Setiap hari'], ['weekly', 'Setiap minggu'], ['monthly', 'Setiap bulan']].map(([k, l]) => `<option value="${k}" ${sel(v.recurrence_rule || 'weekly', k)}>${l}</option>`).join('')}</select></label>
        </section>
      </div>
      <aside class="editor-side">
        <section class="card form"><h3>Reminder</h3><p class="muted small">Pengingat dijadwalkan sebelum tenggat.</p>
          <label>Pengingat pertama<select name="reminder_minutes">
            ${[[10, '10 menit sebelumnya'], [30, '30 menit sebelumnya'], [60, '1 jam sebelumnya'], [1440, '1 hari sebelumnya']].map(([m, l]) => `<option value="${m}" ${m === 30 ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="check-label"><input type="checkbox" name="reminder_email"> Kirim salinan melalui email</label>
          <div class="info-box">Jam tenang workspace tetap berlaku. Reminder dijadwalkan sesuai tenggat tugas.</div>
        </section>
        <section class="card"><h3>Ringkasan</h3><p class="muted small">Tugas akan tersimpan di workspace dan dapat diperbarui kapan saja.</p>
          <button class="btn btn-primary btn-block" type="submit">${isEdit ? 'Simpan perubahan' : '✓ Simpan tugas'}</button>
          <a class="btn btn-block" href="tugas.html">Batal</a></section>
      </aside>
    </form>`;
  }

  function after({ user }) {
    document.getElementById('task-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const f = event.target;
      const g = (n) => f.elements[n];
      const data = {
        judul: g('judul').value.trim(),
        deskripsi: g('deskripsi').value.trim(),
        kategori_id: parseInt(g('kategori_id').value, 10) || 0,
        deadline: g('deadline').value,
        prioritas: g('prioritas').value,
        status: g('status').value,
        progress: Math.min(100, Math.max(0, parseInt(g('progress').value, 10) || 0)),
        is_recurring: g('is_recurring').checked,
        recurrence_rule: g('recurrence_rule').value,
        reminder_minutes: parseInt(g('reminder_minutes').value, 10) || 30,
        reminder_email: g('reminder_email').checked,
      };
      if (!data.judul || !data.deadline) {
        const box = document.createElement('div');
        box.className = 'alert alert-error';
        box.textContent = 'Judul & deadline wajib diisi.';
        document.querySelector('.page-heading').after(box);
        return;
      }
      if (isEdit) { Tasks.update(id, user.id, user.workspace_id, data); Flash.add('success', 'Tugas diperbarui.'); }
      else { Tasks.create(user.id, user.workspace_id, data); Flash.add('success', 'Tugas ditambahkan.'); }
      location.href = 'tugas.html';
    });
  }

  Layout.mount({
    page: isEdit ? 'Edit tugas' : 'Tambah tugas',
    subtitle: 'Rencanakan pekerjaan berikutnya dengan detail yang tepat.',
    pageAction: { href: 'tugas.html', label: 'Batal' },
    render, after,
  });
})();
