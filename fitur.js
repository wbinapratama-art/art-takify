/* Fitur: template, reminder, masukan, + panel admin — pengganti fitur.php */
(function () {
  'use strict';
  const { Util, Auth, DB, Flash, Categories } = window.Store;
  const esc = Util.esc;
  const view = Util.param('p', 'template');
  const ADMIN_VIEWS = ['pengguna', 'log', 'admin-masukan'];

  const NAMES = { template: 'Pustaka template', reminder: 'Reminder & notifikasi', masukan: 'Masukan', pengguna: 'Pengguna & akses', log: 'Log & backup', 'admin-masukan': 'Kelola masukan' };
  const SUBS = {
    template: 'Bangun kebiasaan kerja yang konsisten dengan template siap pakai.',
    reminder: 'Pengingat tepat waktu, tanpa mengganggu waktu istirahat.',
    masukan: 'Punya ide atau menemukan kendala? Bantu kami membuat Takify lebih baik.',
    pengguna: 'Kelola user dan batas tanggung jawabnya.',
    log: 'Pantau aktivitas workspace dan riwayat backup.',
    'admin-masukan': 'Baca masukan anggota, berikan tanggapan, dan pantau tindak lanjutnya.',
  };
  const flashErr = (m) => { Flash.add('error', m); };

  /* ---------- Template ---------- */
  function vTemplate() {
    const list = DB.all('templates').slice().sort((a, b) => b.id - a.id);
    if (!list.length) return '<div class="template-grid"><div class="card empty">Belum ada template. Template dapat ditambahkan oleh admin workspace.</div></div>';
    return `<div class="template-grid" id="template-list">${list.map((t) => {
      const cat = DB.find('categories', (c) => c.id === t.category_id);
      return `<article class="card template-card"><div class="template-icon">▤</div><h3>${esc(t.title)}</h3>
        <p class="muted">${esc(t.description || 'Template workspace untuk membantu tim memulai tugas.')}</p>
        <div class="template-meta"><span class="chip">${esc(cat ? cat.name : 'Umum')}</span><span>${esc(t.default_priority)}</span></div>
        <hr><a class="btn btn-primary" href="tugas_form.html?template=${t.id}">＋ Gunakan template</a></article>`;
    }).join('')}</div>`;
  }

  /* ---------- Reminder ---------- */
  function vReminder(user) {
    const prefs = DB.find('user_preferences', (p) => p.user_id === user.id) || {};
    const rem = DB.where('reminders', (r) => r.user_id === user.id).sort((a, b) => b.remind_at.localeCompare(a.remind_at)).slice(0, 8);
    const label = (m) => (m < 60 ? m + ' menit' : m === 60 ? '1 jam' : '1 hari');
    const ck = (v, def) => ((v === undefined ? def : v) ? 'checked' : '');
    return `<div class="detail-columns">
      <form id="pref-form" class="card form"><h3>Preferensi pribadi</h3>
        <label class="check-label"><input type="checkbox" name="app_notification" ${ck(prefs.app_notification, true)}> Notifikasi aplikasi</label>
        <label class="check-label"><input type="checkbox" name="email_notification" ${ck(prefs.email_notification, true)}> Email</label>
        <label class="check-label"><input type="checkbox" name="daily_summary" ${ck(prefs.daily_summary, false)}> Ringkasan harian</label>
        <label>Pengingat default<select name="minutes">${[10, 30, 60, 1440].map((m) => `<option value="${m}" ${(prefs.default_reminder_minutes || 30) === m ? 'selected' : ''}>${label(m)} sebelum tenggat</option>`).join('')}</select></label>
        <h3>Jam tenang</h3>
        <div class="form-row"><label>Mulai<input type="time" name="quiet_start" value="${esc(prefs.quiet_hours_start || '22:00')}"></label>
        <label>Selesai<input type="time" name="quiet_end" value="${esc(prefs.quiet_hours_end || '07:00')}"></label></div>
        <button class="btn btn-primary" type="submit">Simpan preferensi</button></form>
      <section class="card"><h3>Reminder terjadwal</h3>
        ${rem.map((r) => { const t = DB.find('tasks', (x) => x.id === r.task_id); return `<div class="simple-row"><div><b>${esc(t ? t.title : 'Pengingat umum')}</b><small>${Util.fmt(r.remind_at, 'd M Y · H:i')} · ${esc(r.channel)}</small></div><span class="badge badge-sedang">${esc(r.status)}</span></div>`; }).join('') || '<p class="muted">Belum ada reminder terjadwal.</p>'}
      </section></div>`;
  }

  /* ---------- Masukan (user) ---------- */
  function vMasukan(user) {
    const fb = DB.where('feedbacks', (f) => f.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return `<div class="detail-columns">
      <form id="fb-form" class="card form"><h3>Sampaikan masukan</h3><p class="muted small">Masukan ini dikirim langsung kepada admin workspace.</p>
        <label>Subjek *<input name="subject" maxlength="150" required></label>
        <label>Jenis masukan<select name="type"><option>Saran</option><option>Kendala</option><option>Lainnya</option></select></label>
        <label>Isi masukan *<textarea name="content" rows="6" required></textarea></label>
        <button class="btn btn-primary" type="submit">Kirim masukan</button></form>
      <section class="card"><h3>Riwayat masukan saya <small class="muted">${fb.length} masukan</small></h3>
        ${fb.map((f) => `<article class="feedback-item"><span class="badge status-${esc(f.status.toLowerCase())}">${esc(f.status)}</span>
          <small>${esc(f.type)} · ${Util.fmt(f.created_at, 'd M Y · H:i')}</small><h4>${esc(f.subject)}</h4><p>${esc(f.content)}</p>
          ${f.admin_response ? `<blockquote><b>Tanggapan admin</b><p>${esc(f.admin_response)}</p></blockquote>` : ''}</article>`).join('') || '<p class="muted">Belum ada masukan yang dikirim.</p>'}
      </section></div>`;
  }

  /* ---------- Admin: kelola masukan ---------- */
  function vAdminMasukan() {
    const fb = DB.all('feedbacks').slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    const wantId = parseInt(Util.param('id', String((fb[0] || {}).id || 0)), 10);
    const sel = fb.find((f) => f.id === wantId) || null;
    const who = (f) => DB.find('users', (u) => u.id === f.user_id) || { name: '—', email: '' };
    const stats = ['Baru', 'Diproses', 'Selesai'].map((s) => `<article class="stat-card"><div class="stat-label">${s}</div><div class="stat-value">${fb.filter((f) => f.status === s).length}</div></article>`).join('');
    const form = sel ? `<form id="reply-form" class="card form" data-id="${sel.id}"><small>${esc(sel.type)} · ${esc(who(sel).email)}</small>
        <h2>${esc(sel.subject)}</h2><p>${esc(sel.content)}</p>
        ${sel.admin_response ? `<blockquote>${esc(sel.admin_response)}</blockquote>` : ''}
        <label>Tanggapan admin<textarea name="response" rows="5">${esc(sel.admin_response || '')}</textarea></label>
        <label>Ubah status<select name="status">${['Baru', 'Diproses', 'Selesai'].map((s) => `<option ${sel.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <button class="btn btn-primary" type="submit">Simpan tanggapan</button></form>` : '';
    return `<section class="stats-grid">${stats}</section>
      <div class="detail-columns"><section class="card"><h3>Masukan diterima</h3>
        ${fb.map((f) => `<a class="feedback-list-item ${sel && sel.id === f.id ? 'selected' : ''}" href="fitur.html?p=admin-masukan&id=${f.id}"><small>${esc(f.type)} · ${esc(f.status)}</small><b>${esc(f.subject)}</b><span>${esc(who(f).name)}</span></a>`).join('') || '<p class="muted">Belum ada masukan.</p>'}
      </section>${form}</div>`;
  }

  /* ---------- Admin: pengguna ---------- */
  function vPengguna() {
    const members = DB.where('users', (u) => u.role === 'Anggota' || u.role === 'Pengamat').sort((a, b) => a.name.localeCompare(b.name));
    const online = (m) => Auth.isOnline(m.last_seen_at);
    const nOn = members.filter(online).length;
    const email = Util.param('email');
    const sel = members.find((m) => m.email === email);
    const badge = (m) => `<span class="badge status-${online(m) ? 'aktif' : 'offline'}">${online(m) ? 'Online' : 'Tidak aktif'}</span>`;
    const last = (m) => m.last_seen_at || m.last_active_at;
    const stat = (l, v) => `<article class="stat-card"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></article>`;
    return `<section class="stats-grid">${stat('Total user', members.length)}${stat('User online', nOn)}${stat('Tidak aktif', members.length - nOn)}</section>
      <section class="card" id="members"><h3>User</h3><div class="table-scroll"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Aktivitas terakhir (WIB)</th></tr></thead><tbody>
        ${members.map((m) => `<tr><td><b><a href="fitur.html?p=pengguna&email=${encodeURIComponent(m.email)}#member-detail">${esc(m.name)}</a></b><small>${esc(m.email)}</small></td><td>${esc(m.role)}</td><td>${badge(m)}</td><td>${last(m) ? Util.fmt(last(m), 'd M · H:i') : 'Belum pernah'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada user terdaftar.</td></tr>'}
      </tbody></table></div><p class="muted small">Pilih nama user untuk melihat detail akun.</p></section>
      ${sel ? `<section class="card" id="member-detail"><h3>Detail akun: ${esc(sel.name)}</h3><p><b>Email:</b> ${esc(sel.email)}</p><p><b>Status:</b> ${badge(sel)}</p>
        <p><b>Aktivitas terakhir:</b> ${last(sel) ? Util.fmt(last(sel), 'd M Y · H:i') : 'Belum pernah'}</p><p><b>Kata sandi:</b> ********</p>
        <p class="muted small">Kata sandi disimpan secara aman dan tidak dapat ditampilkan. Jika lupa, atur ulang kata sandi akun.</p></section>` : ''}`;
  }

  /* ---------- Admin: log & backup ---------- */
  function vLog() {
    const logs = DB.where('activity_logs', (l) => l.action_type === 'login' && (DB.find('users', (u) => u.id === l.user_id) || {}).role !== 'Admin')
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
    const backups = DB.all('backup_logs').slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    return `<div class="alert alert-success">Riwayat login User tercatat di sini.</div>
      <section class="card"><h3>Login User</h3><div class="table-scroll"><table><thead><tr><th>Waktu (WIB)</th><th>User</th><th>Peristiwa</th><th>Level</th><th>Referensi</th></tr></thead><tbody>
        ${logs.map((l) => { const u = DB.find('users', (x) => x.id === l.user_id); return `<tr><td>${Util.fmt(l.created_at, 'd M · H:i:s')}</td><td>${esc(u ? u.name : '—')}</td><td>${esc(l.description)}</td><td><span class="badge">${esc(l.level)}</span></td><td>${esc(l.reference_id || '—')}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Belum ada riwayat login User.</td></tr>'}
      </tbody></table></div></section>
      <section class="card" id="backup-list"><h3>Riwayat backup</h3><div class="table-scroll"><table><thead><tr><th>Arsip</th><th>Ukuran</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>
        ${backups.map((b) => `<tr><td>${esc(b.file_name)}</td><td>${esc(b.file_size)}</td><td>${esc(b.status)}</td><td>${Util.fmt(b.created_at, 'd M Y · H:i')}</td></tr>`).join('')}
      </tbody></table></div><p class="muted small">Daftar ini menampilkan metadata backup yang tercatat. Proses pembuatan arsip fisik belum dikonfigurasi.</p></section>`;
  }

  function render({ user, isAdmin }) {
    if (ADMIN_VIEWS.includes(view) && !isAdmin) { location.replace('fitur.html?p=template'); return ''; }
    if (!isAdmin || !ADMIN_VIEWS.includes(view)) {
      if (view === 'template') return vTemplate();
      if (view === 'reminder') return vReminder(user);
      if (view === 'masukan') return vMasukan(user);
    }
    if (view === 'pengguna') return vPengguna();
    if (view === 'log') return vLog();
    if (view === 'admin-masukan') return vAdminMasukan();
    return '<section class="card"><p>Halaman tidak ditemukan.</p></section>';
  }

  function after({ user }) {
    const reload = (p, extra = '') => { location.href = 'fitur.html?p=' + p + extra; };

    document.getElementById('fb-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const subject = f.subject.value.trim(), content = f.content.value.trim();
      if (!subject || !content) flashErr('Subjek dan isi masukan wajib diisi.');
      else {
        DB.insert('feedbacks', { workspace_id: user.workspace_id, user_id: user.id, subject, type: f.type.value, content, status: 'Baru', admin_response: null, created_at: Util.nowIso(), updated_at: Util.nowIso() });
        Flash.add('success', 'Masukan berhasil dikirim ke admin.');
      }
      reload('masukan');
    });

    document.getElementById('pref-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const row = {
        user_id: user.id, app_notification: f.app_notification.checked, email_notification: f.email_notification.checked,
        daily_summary: f.daily_summary.checked, default_reminder_minutes: parseInt(f.minutes.value, 10) || 30,
        quiet_hours_start: f.quiet_start.value || null, quiet_hours_end: f.quiet_end.value || null, timezone: 'Asia/Jakarta',
      };
      const cur = DB.find('user_preferences', (p) => p.user_id === user.id);
      if (cur) DB.update('user_preferences', cur.id, row); else DB.insert('user_preferences', row);
      Flash.add('success', 'Preferensi notifikasi berhasil disimpan.');
      reload('reminder');
    });

    document.getElementById('reply-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = Number(e.target.dataset.id);
      const status = e.target.elements.status.value;
      DB.update('feedbacks', id, { status: ['Baru', 'Diproses', 'Selesai'].includes(status) ? status : 'Baru', admin_response: e.target.elements.response.value.trim() || null, updated_at: Util.nowIso() });
      Flash.add('success', 'Status dan tanggapan masukan diperbarui.');
      reload('admin-masukan', '&id=' + id);
    });
  }

  Layout.mount({
    page: NAMES[view] || NAMES.template,
    subtitle: SUBS[view] || '',
    pageAction: view === 'pengguna' ? { href: '#members', label: '＋ Undang pengguna' } : null,
    render, after,
  });
})();
