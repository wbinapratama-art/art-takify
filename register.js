/* Halaman registrasi — pengganti register.php */
(function () {
  'use strict';
  const { Util, Auth, Flash } = window.Store;

  document.querySelectorAll('[data-date]').forEach((el) => { el.textContent = Util.fmt(new Date(), el.dataset.date); });

  const errorBox = document.getElementById('error');
  const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  document.querySelectorAll('a[href="login.html"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    document.body.classList.add('auth-page-leaving');
    setTimeout(() => { window.location.href = link.href; }, 180);
  }));

  window.Store.ready.then(() => {
    if (Auth.check()) { location.replace(Auth.homeUrl()); return; }

    document.getElementById('register-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');
      const nama = document.getElementById('nama').value.trim();
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value;
      const pass2 = document.getElementById('password2').value;

      if (!nama || !email || !pass) return showError('Semua kolomnya diisi dulu, ya.');
      if (!EMAIL_RE.test(email)) return showError('Format emailnya kayaknya belum benar. Cek lagi, ya.');
      if (pass.length < 12) return showError('Kata sandi minimal 12 karakter, ya.');
      if (pass !== pass2) return showError('Ulangi kata sandinya belum cocok. Coba cek lagi, ya.');

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const [ok, msg] = await Auth.register(nama, email, pass);
      button.disabled = false;

      if (!ok) return showError(msg);

      Flash.add('success', 'Akunmu berhasil dibuat! Yuk, masuk.');
      document.body.classList.add('auth-page-leaving');
      setTimeout(() => { location.href = 'login.html'; }, 180);
    });
  });
})();
