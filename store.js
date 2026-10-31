/* ==========================================================
   Takify — lapisan data (pengganti PHP + MySQL)
   Semua data disimpan di localStorage browser.
   Sesi login disimpan di sessionStorage (per tab, seperti session PHP).
   ========================================================== */
(function () {
  'use strict';

  const DB_KEY = 'takify_db_v1';
  const SESSION_KEY = 'takify_session';
  const FLASH_KEY = 'takify_flash';
  const OLD_KEY = 'takify_old';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- Util ---------- */
  const Util = {
    esc(v) {
      return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    pad: (n) => String(n).padStart(2, '0'),
    nowIso: () => new Date().toISOString(),
    /** Format seperti date('d M, H:i') di PHP. */
    fmt(value, pattern) {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d)) return '';
      const p = Util.pad;
      const map = {
        l: DAYS[d.getDay()], d: p(d.getDate()), M: MONTHS[d.getMonth()], Y: d.getFullYear(),
        H: p(d.getHours()), i: p(d.getMinutes()), s: p(d.getSeconds()),
      };
      return pattern.replace(/[ldMYHis]/g, (ch) => map[ch]);
    },
    /** Nilai untuk <input type="datetime-local">: YYYY-MM-DDTHH:mm */
    toLocalInput(value) {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d)) return '';
      return `${d.getFullYear()}-${Util.pad(d.getMonth() + 1)}-${Util.pad(d.getDate())}T${Util.pad(d.getHours())}:${Util.pad(d.getMinutes())}`;
    },
    todayKey() {
      return Util.toLocalInput(new Date()).slice(0, 10);
    },
    statusLabel: (s) => ({ belum: 'Belum dimulai', proses: 'Sedang dikerjakan', selesai: 'Selesai' }[s] || s),
    prioritasLabel: (p) => ({ rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' }[p] || p),
    nl2br: (s) => Util.esc(s).replace(/\n/g, '<br>'),
    param: (name, def = '') => new URLSearchParams(location.search).get(name) ?? def,
  };

  /* ---------- Hash kata sandi (PBKDF2 bila tersedia) ---------- */
  function toHex(buf) {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function randomSalt() {
    const a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return toHex(a);
  }
  async function hashPassword(password, salt) {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
      return 'pbkdf2$' + toHex(bits);
    }
    // Cadangan sederhana bila Web Crypto tidak tersedia (bukan untuk produksi)
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const s = salt + password;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    return 'simple$' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  /* ---------- Database ---------- */
  const COLLECTIONS = ['workspaces', 'users', 'categories', 'templates', 'tasks', 'subtasks',
    'task_comments', 'attachments', 'feedbacks', 'reminders', 'user_preferences', 'activity_logs', 'backup_logs'];

  let data = null;

  function emptyDb() {
    const db = { seq: {} };
    COLLECTIONS.forEach((c) => { db[c] = []; db.seq[c] = 0; });
    return db;
  }
  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        data = JSON.parse(raw);
        COLLECTIONS.forEach((c) => {
          data[c] = data[c] || [];
          data.seq = data.seq || {};
          data.seq[c] = data.seq[c] || data[c].reduce((m, r) => Math.max(m, r.id || 0), 0);
        });
        return;
      }
    } catch (e) { console.warn('Data rusak, dibuat ulang.', e); }
    data = emptyDb();
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
    catch (e) { console.error('Gagal menyimpan ke localStorage', e); }
  }
  const DB = {
    all: (table) => data[table],
    insert(table, row) {
      row.id = ++data.seq[table];
      data[table].push(row);
      save();
      return row;
    },
    update(table, id, patch) {
      const row = data[table].find((r) => r.id === id);
      if (row) { Object.assign(row, patch); save(); }
      return row;
    },
    remove(table, predicate) {
      data[table] = data[table].filter((r) => !predicate(r));
      save();
    },
    find: (table, predicate) => data[table].find(predicate),
    where: (table, predicate) => data[table].filter(predicate),
    save,
    reset() { localStorage.removeItem(DB_KEY); load(); },
  };

  /* ---------- Seed awal (setara bagian SEED MINIMAL di task_remind.sql) ---------- */
  const ADMIN_EMAIL = 'admin@takify.local';
  const ADMIN_PASSWORD = 'admin-takify-123';

  async function seed() {
    if (data.workspaces.length) return;
    const ws = DB.insert('workspaces', { name: 'Workspace Utama', created_at: Util.nowIso() });
    const salt = randomSalt();
    const admin = DB.insert('users', {
      workspace_id: ws.id, name: 'Admin', email: ADMIN_EMAIL, salt,
      password_hash: await hashPassword(ADMIN_PASSWORD, salt),
      role: 'Admin', status: 'Aktif', last_active_at: null, last_seen_at: null, created_at: Util.nowIso(),
    });
    DB.insert('user_preferences', { user_id: admin.id, app_notification: true, email_notification: true, daily_summary: false, default_reminder_minutes: 30, quiet_hours_start: null, quiet_hours_end: null, timezone: 'Asia/Jakarta' });
    const cat = DB.insert('categories', { workspace_id: ws.id, name: 'Umum', description: 'Kategori default untuk tugas baru', color: 'bg-blue-500', created_by: admin.id, created_at: Util.nowIso() });
    [
      ['Review mingguan', 'Refleksikan hasil kerja, hambatan, dan rencana minggu berikutnya.', 'Sedang'],
      ['Peluncuran landing page', 'Dari brief hingga QA, siapkan halaman yang siap diluncurkan.', 'Tinggi'],
      ['Kampanye konten', 'Rencanakan, produksi, dan review konten bersama tim.', 'Sedang'],
    ].forEach(([title, description, prio]) => DB.insert('templates', {
      workspace_id: ws.id, title, description, category_id: cat.id, default_priority: prio, is_public: true, created_by: null, created_at: Util.nowIso(),
    }));
  }

  /* ---------- Flash & "old input" (pengganti $_SESSION['flash'] / ['old']) ---------- */
  const Flash = {
    add(type, msg) {
      const list = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]');
      list.push({ type, msg });
      sessionStorage.setItem(FLASH_KEY, JSON.stringify(list));
    },
    take() {
      const list = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]');
      sessionStorage.removeItem(FLASH_KEY);
      return list;
    },
  };

  /* ---------- Auth ---------- */
  const Auth = {
    user() {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
    },
    id: () => (Auth.user() || {}).id ?? null,
    check: () => !!Auth.user(),
    isAdmin: () => (Auth.user() || {}).role === 'Admin',
    homeUrl: () => (Auth.isAdmin() ? 'fitur.html?p=pengguna' : 'tugas.html'),
    requireLogin() {
      if (!Auth.check()) { location.replace('login.html'); return false; }
      return true;
    },
    async attempt(email, password) {
      email = email.trim().toLowerCase();
      const u = DB.find('users', (x) => x.email === email && x.status === 'Aktif');
      if (!u) return false;
      const hash = await hashPassword(password, u.salt);
      if (hash !== u.password_hash) return false;
      const ws = DB.find('workspaces', (w) => w.id === u.workspace_id);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        id: u.id, nama: u.name, email: u.email, role: u.role, workspace: ws ? ws.name : '', workspace_id: u.workspace_id,
      }));
      DB.update('users', u.id, { last_active_at: Util.nowIso(), last_seen_at: Util.nowIso(), status: 'Aktif' });
      DB.insert('activity_logs', { workspace_id: u.workspace_id, user_id: u.id, action_type: 'login', description: 'Login berhasil', level: 'Info', reference_id: null, created_at: Util.nowIso() });
      return true;
    },
    async register(nama, email, password) {
      email = email.trim().toLowerCase();
      if (DB.find('users', (u) => u.email === email)) return [false, 'Email ini sudah punya akun. Coba masuk aja.'];
      try {
        const ws = DB.insert('workspaces', { name: 'Workspace ' + nama, created_at: Util.nowIso() });
        const salt = randomSalt();
        const user = DB.insert('users', {
          workspace_id: ws.id, name: nama, email, salt, password_hash: await hashPassword(password, salt),
          role: 'Anggota', status: 'Aktif', last_active_at: null, last_seen_at: null, created_at: Util.nowIso(),
        });
        DB.insert('user_preferences', { user_id: user.id, app_notification: true, email_notification: true, daily_summary: false, default_reminder_minutes: 30, quiet_hours_start: null, quiet_hours_end: null, timezone: 'Asia/Jakarta' });
        return [true, 'Akun berhasil dibuat.'];
      } catch (e) {
        return [false, 'Akun belum bisa dibuat. Coba lagi sebentar, ya.'];
      }
    },
    logout() {
      const id = Auth.id();
      if (id) DB.update('users', id, { last_active_at: Util.nowIso(), last_seen_at: null });
      sessionStorage.removeItem(SESSION_KEY);
    },
    /** Dipanggil berkala saat user aktif (pengganti ping.php). */
    ping() {
      const id = Auth.id();
      if (id) DB.update('users', id, { last_seen_at: Util.nowIso() });
    },
    isOnline(lastSeenAt, thresholdSeconds = 90) {
      if (!lastSeenAt) return false;
      return (Date.now() - new Date(lastSeenAt).getTime()) / 1000 <= thresholdSeconds;
    },
  };

  /* ---------- Kategori ---------- */
  const PALETTE = { 'bg-purple-500': '#8B5CF6', 'bg-red-500': '#EF4444', 'bg-green-500': '#22C55E', 'bg-blue-500': '#3B82F6' };
  const Categories = {
    all(workspaceId) {
      return DB.where('categories', (c) => c.workspace_id === workspaceId)
        .map((c) => ({ id: c.id, nama: c.name, warna: PALETTE[c.color] || c.color, description: c.description }))
        .sort((a, b) => a.nama.localeCompare(b.nama));
    },
    create(userId, workspaceId, { nama, warna }) {
      return DB.insert('categories', { workspace_id: workspaceId, name: nama, description: null, color: warna || '#3B82F6', created_by: userId, created_at: Util.nowIso() });
    },
    remove(id, workspaceId) {
      DB.remove('categories', (c) => c.id === id && c.workspace_id === workspaceId);
      // ON DELETE SET NULL
      DB.all('tasks').forEach((t) => { if (t.category_id === id) t.category_id = null; });
      DB.save();
    },
    countTasks: (id) => DB.where('tasks', (t) => t.category_id === id).length,
  };

  /* ---------- Tugas ---------- */
  const STATUS_ORDER = { belum: 0, proses: 1, selesai: 2 };
  function view(t) {
    const cat = DB.find('categories', (c) => c.id === t.category_id);
    return {
      id: t.id, judul: t.title, deskripsi: t.description || '', deadline: t.due_date, prioritas: t.priority,
      status: t.status, progress: t.progress, kategori_id: t.category_id,
      kategori_nama: cat ? cat.name : '', kategori_warna: cat ? (PALETTE[cat.color] || cat.color) : '',
      is_recurring: !!t.is_recurring, recurrence_rule: t.recurrence_rule, created_at: t.created_at, updated_at: t.updated_at,
    };
  }
  const Tasks = {
    all(userId, workspaceId, status = null, q = null) {
      let rows = DB.where('tasks', (t) => t.workspace_id === workspaceId);
      if (status && status !== 'semua') rows = rows.filter((t) => t.status === status);
      if (q) {
        const needle = q.toLowerCase();
        rows = rows.filter((t) => (t.title || '').toLowerCase().includes(needle) || (t.description || '').toLowerCase().includes(needle));
      }
      rows.sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || String(a.due_date || '').localeCompare(String(b.due_date || '')));
      return rows.map(view);
    },
    find(id, workspaceId) {
      const t = DB.find('tasks', (x) => x.id === id && x.workspace_id === workspaceId);
      return t ? view(t) : null;
    },
    create(userId, workspaceId, d) {
      const now = Util.nowIso();
      const t = DB.insert('tasks', {
        workspace_id: workspaceId, category_id: d.kategori_id || null, title: d.judul, description: d.deskripsi || null,
        due_date: d.deadline, priority: d.prioritas, status: d.status, progress: Number(d.progress) || 0,
        is_recurring: !!d.is_recurring, recurrence_rule: d.is_recurring ? (d.recurrence_rule || 'weekly') : null,
        created_by: userId, assigned_to: userId, created_at: now, updated_at: now,
      });
      Tasks._scheduleReminder(userId, t.id, d);
      return t.id;
    },
    update(id, userId, workspaceId, d) {
      const t = DB.find('tasks', (x) => x.id === id && x.workspace_id === workspaceId);
      if (!t) return;
      DB.update('tasks', id, {
        category_id: d.kategori_id || null, title: d.judul, description: d.deskripsi || null, due_date: d.deadline,
        priority: d.prioritas, status: d.status, progress: Number(d.progress) || 0,
        is_recurring: !!d.is_recurring, recurrence_rule: d.is_recurring ? (d.recurrence_rule || 'weekly') : null,
        updated_at: Util.nowIso(),
      });
      Tasks._scheduleReminder(userId, id, d);
    },
    _scheduleReminder(userId, taskId, d) {
      DB.remove('reminders', (r) => r.user_id === userId && r.task_id === taskId && r.status === 'Antre');
      const minutes = Math.max(0, parseInt(d.reminder_minutes ?? 30, 10) || 0);
      const due = new Date(d.deadline);
      if (isNaN(due)) return;
      const at = new Date(due.getTime() - minutes * 60000).toISOString();
      const channels = ['Aplikasi'];
      if (d.reminder_email) channels.push('Email');
      channels.forEach((channel) => DB.insert('reminders', { user_id: userId, task_id: taskId, remind_at: at, channel, status: 'Antre', created_at: Util.nowIso() }));
    },
    remove(id, workspaceId) {
      DB.remove('tasks', (t) => t.id === id && t.workspace_id === workspaceId);
      ['subtasks', 'task_comments', 'attachments', 'reminders'].forEach((tbl) => DB.remove(tbl, (r) => r.task_id === id));
    },
    toggleStatus(id, workspaceId) {
      const t = DB.find('tasks', (x) => x.id === id && x.workspace_id === workspaceId);
      if (!t) return;
      const done = t.status === 'selesai';
      DB.update('tasks', id, { status: done ? 'belum' : 'selesai', progress: done ? 0 : 100, updated_at: Util.nowIso() });
    },
    stats(workspaceId) {
      const rows = DB.where('tasks', (t) => t.workspace_id === workspaceId);
      const now = Date.now();
      return {
        total: rows.length,
        selesai: rows.filter((t) => t.status === 'selesai').length,
        proses: rows.filter((t) => t.status === 'proses').length,
        belum: rows.filter((t) => t.status === 'belum').length,
        terlambat: rows.filter((t) => t.status !== 'selesai' && t.due_date && new Date(t.due_date).getTime() < now).length,
      };
    },
  };

  /* ---------- Inisialisasi ---------- */
  load();
  const ready = seed();

  window.Store = { Util, DB, Auth, Flash, Categories, Tasks, ready, ADMIN_EMAIL, ADMIN_PASSWORD, OLD_KEY };
})();
