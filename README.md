# Takify

Aplikasi manajemen tugas dan reminder berbasis HTML, CSS, dan JavaScript murni.
Data tersimpan di localStorage browser, jadi tidak perlu server, PHP, atau database.

## Fitur
- Registrasi dan login
- Manajemen tugas: tambah, edit, hapus, status, prioritas, progress, tenggat
- Kategori, template tugas, reminder dan preferensi notifikasi
- Masukan (feedback) dan panel admin (pengguna, log, kelola masukan)

## Cara menjalankan
Buka `index.html` di browser, atau jalankan server statis:

    python3 -m http.server 8000

lalu buka http://localhost:8000

## Akun admin bawaan
- Email: `admin@takify.local`
- Kata sandi: `admin-takify-123`

## Struktur
- `*.html` : halaman
- `style.css` : tampilan
- `store.js` : data dan autentikasi (localStorage)
- `layout.js` : sidebar dan topbar
- `login.js`, `register.js`, `dashboard.js`, `tugas*.js`, `kategori.js`, `fitur.js` : logika tiap halaman

## Catatan
Kata sandi di-hash di sisi browser dan semua data ada di perangkat pengguna,
jadi ini cocok untuk demo atau belajar, bukan untuk data sensitif.
