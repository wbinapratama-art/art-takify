/* ==========================================================
   Takify — kerangka halaman (pengganti header.php + footer.php)
   Pemakaian di tiap halaman:
     Layout.mount({ page, subtitle, pageAction, render, after })
   ========================================================== */
(function () {
  'use strict';
  const { Util, Auth, Flash } = window.Store;
  const esc = Util.esc;

  const NAV_ADMIN = {
    Admin: [
      ['fitur.html?p=pengguna', 'Pengguna & akses', '♙', 'pengguna'],
      ['fitur.html?p=log', 'Log & backup', '▤', 'log'],
      ['fitur.html?p=admin-masukan', 'Kelola masukan', '▣', 'admin-masukan'],
    ],
  };
  const NAV_USER = {
    User: [
      ['dashboard.html', 'Dashboard', '▦', ''],
      ['tugas.html', 'Tugas saya', '✓', ''],
      ['kategori.html', 'Kategori', '▱', ''],
      ['fitur.html?p=template', 'Template', '▤', 'template'],
      ['fitur.html?p=reminder', 'Reminder', '♧', 'reminder'],
      ['fitur.html?p=masukan', 'Masukan', '▱', 'masukan'],
    ],
  };

  function currentFile() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function sidebarHtml(u, isAdmin) {
    const nav = isAdmin ? NAV_ADMIN : NAV_USER;
    const file = currentFile();
    const section = Util.param('p');
    const groups = Object.entries(nav).map(([group, items]) => `
      <div class="nav-group-title">${esc(group)}</div>
      <nav>${items.map(([href, label, icon, sec]) => {
        const target = href.split('?')[0];
        const active = file === href || (file === 'fitur.html' && target === 'fitur.html' && sec && section === sec)
          || (target !== 'fitur.html' && file === target);
        return `<a href="${esc(href)}" class="nav-item ${active ? 'active' : ''}"><span class="ico">${esc(icon)}</span> ${esc(label)}</a>`;
      }).join('')}</nav>`).join('');
    const initial = esc((u.nama || '?').charAt(0).toUpperCase());
    return `
    <aside class="sidebar">
      <a class="logo" href="${isAdmin ? 'fitur.html?p=pengguna' : 'dashboard.html'}">
        <img class="logo-mark" src="takify-bell.svg" alt=""><span>Takify</span>
      </a>
      <div class="workspace-switch workspace-switch-admin"><strong style="display:block;width:100%;text-align:center">${isAdmin ? 'Admin' : 'User'}</strong></div>
      ${groups}
      <div class="sidebar-note"><b>${isAdmin ? '✦ Admin sigap, tim makin mantap!' : '✦ Gas pelan-pelan, tugas kelar!'}</b><span>${isAdmin ? 'Pantau aktivitas tim, biar semua tetap on track.' : 'Atur tugasmu biar nggak numpuk.'}</span></div>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="avatar">${initial}</div>
          <div><div class="name">${esc(u.nama)}</div><div class="muted small">${isAdmin ? 'Admin' : 'User'}</div></div>
        </div>
        <a class="logout-link" href="#" id="logout-link">Keluar dari akun</a>
      </div>
    </aside>`;
  }

  function topbarHtml(u, isAdmin, page) {
    const initial = esc((u.nama || '?').charAt(0).toUpperCase());
    return `
      <header class="app-topbar">
        <div class="crumb"><span>${isAdmin ? 'Admin' : 'User'}</span><b>›</b><strong>${esc(page)}</strong></div>
        <div class="topbar-tools">
          <form action="tugas.html" method="get"><input class="global-search" name="q" value="${esc(Util.param('q'))}" placeholder="⌕  Cari tugas, kategori, atau anggota"></form>
          <span>Asia/Jakarta · WIB</span><span class="top-avatar">${initial}</span>
        </div>
      </header>`;
  }

  function flashHtml(list) {
    return list.map((f) => `<div class="alert alert-${f.type === 'error' ? 'error' : 'success'}">${esc(f.msg)}</div>`).join('');
  }

  /** Transisi halus antar halaman + tombol keluar. */
  function wireNavigation() {
    document.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        const internal = href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('javascript:');
        if (!internal || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
        event.preventDefault();
        document.body.classList.add('app-page-leaving');
        setTimeout(() => { window.location.href = link.href; }, 130);
      });
    });
    const logout = document.getElementById('logout-link');
    if (logout) {
      logout.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        Auth.logout();
        location.href = 'login.html';
      });
    }
  }

  /** Pengganti ping.php: tandai user "online" selama aktif. */
  function startPing() {
    let last = 0;
    const INTERVAL = 60000;
    const send = () => {
      const now = Date.now();
      if (now - last < INTERVAL - 5000) return;
      last = now;
      Auth.ping();
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((evt) => window.addEventListener(evt, send, { passive: true }));
    send();
    setInterval(send, INTERVAL);
  }

  async function mount(opts) {
    await window.Store.ready;
    if (!Auth.requireLogin()) return;
    const u = Auth.user();
    const isAdmin = u.role === 'Admin';
    const page = opts.page || '';
    const subtitle = typeof opts.subtitle === 'function'
      ? opts.subtitle({ user: u, isAdmin })
      : (opts.subtitle ?? 'Prioritaskan yang penting. Selesaikan satu per satu.');

    // pageAction: objek => tampil, null => sembunyi, undefined => bawaan "Tambah tugas" (kecuali halaman tertentu)
    let action = opts.pageAction;
    if (action === undefined && !['tugas_form.html', 'fitur.html'].includes(currentFile())) {
      action = { href: 'tugas_form.html', label: '＋ Tambah tugas' };
    }

    document.title = `${page} — Takify`;
    document.body.classList.add('app', isAdmin ? 'role-admin' : 'role-user');

    const content = typeof opts.render === 'function' ? await opts.render({ user: u, isAdmin }) : '';
    document.body.innerHTML = `
      ${sidebarHtml(u, isAdmin)}
      <main class="main">
        ${topbarHtml(u, isAdmin, page)}
        <div class="page-content">
          <div class="page-heading">
            <div><h1>${esc(page)}</h1><p>${esc(subtitle)}</p></div>
            ${action ? `<a href="${esc(action.href)}" class="btn btn-primary">${esc(action.label)}</a>` : ''}
          </div>
          ${flashHtml(Flash.take())}
          <div id="page-body">${content}</div>
        </div>
      </main>`;

    wireNavigation();
    startPing();
    if (typeof opts.after === 'function') opts.after({ user: u, isAdmin });
  }

  window.Layout = { mount };
})();
