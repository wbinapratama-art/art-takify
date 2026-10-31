/* Halaman login — pengganti login.php */
(function () {
  'use strict';
  const { Util, Auth, Flash } = window.Store;

  // Tanggal pada panel pratinjau (setara date('l, d M') di PHP)
  document.querySelectorAll('[data-date]').forEach((el) => { el.textContent = Util.fmt(new Date(), el.dataset.date); });

  const errorBox = document.getElementById('error');
  const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };

  // Slider "Fokus hari ini"
  const slides = [...document.querySelectorAll('.focus-slide')];
  const dots = [...document.querySelectorAll('.focus-slider-dots button')];
  let activeSlide = 0;
  let sliderTimer;
  const showSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === activeSlide));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeSlide));
  };
  const startSlider = () => {
    clearInterval(sliderTimer);
    sliderTimer = setInterval(() => showSlide(activeSlide + 1), 3500);
  };
  dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); startSlider(); }));
  if (slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) startSlider();

  // Transisi ke halaman daftar
  document.querySelectorAll('a[href="register.html"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    document.body.classList.add('auth-page-leaving');
    setTimeout(() => { window.location.href = link.href; }, 180);
  }));

  window.Store.ready.then(() => {
    if (Auth.check()) { location.replace(Auth.homeUrl()); return; }

    // Pesan flash (mis. setelah registrasi)
    document.getElementById('flash').innerHTML = Flash.take()
      .map((f) => `<div class="alert alert-${f.type === 'error' ? 'error' : 'success'}" role="status">${Util.esc(f.msg)}</div>`).join('');

    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value;

      if (!email || !pass) return showError('Email dan kata sandi jangan sampai kosong, ya.');

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const ok = await Auth.attempt(email, pass);
      button.disabled = false;

      if (!ok) return showError('Email atau kata sandinya kurang pas. Coba cek lagi, ya.');

      Flash.add('success', 'Hai, ' + Auth.user().nama + '! Senang kamu balik lagi.');
      document.body.classList.add('auth-page-leaving');
      setTimeout(() => { location.href = Auth.homeUrl(); }, 180);
    });
  });
})();
