# Asisten Penyusunan Modul Ajar Madrasah (v1.2.0)

![Version](https://img.shields.io/badge/version-v1.2.0-amber?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Ready-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/license-Free_(Non--Commercial)-blue?style=for-the-badge)

> **"Cerdas dengan Deep Learning, Hangat dengan Kurikulum Berbasis Cinta (KBC)"**

---

## 📌 Deskripsi Proyek

**Asisten Penyusunan Modul Ajar Madrasah** adalah aplikasi berbasis Web AI Generator Perangkat Pembelajaran yang dirancang khusus untuk membantu para pendidik, guru madrasah (MI, MTs, MA/MAK), serta penyusun kurikulum Kementerian Agama dalam menyusun **Modul Ajar** dan **Lembar Kerja Peserta Didik (LKPD)** secara cepat, terstruktur, dan presisi.

Aplikasi ini mengintegrasikan **Pendekatan Deep Learning** (Mindful, Meaningful, & Joyful Learning) serta **Kurikulum Berbasis Cinta (KBC)** (KBC-1 s/d KBC-10) sesuai dengan standar Kurikulum Merdeka Kemenag RI.

---

## ✨ Fitur Utama

- 📝 **Generator Modul Ajar Otomatis**: Menghasilkan dokumen perencanaan pembelajaran komprehensif lengkap dengan Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), Alokasi Waktu, Asesmen Formatif/Sumatif, serta Kegiatan Pembelajaran bertahap.
- 📄 **Generator LKPD Terintegrasi**: Menyusun Lembar Kerja Peserta Didik berbasis rujukan Modul Ajar yang dipilih untuk setiap sesi atau pertemuan.
- 📄 **Ekspor MS Word (.docx) Standar MSO**: Menggunakan arsitektur penataan MSO HTML Standard yang menjamin hasil unduhan presisi pada ukuran A4, margin 1 inci (top, bottom, left, right), dan font *Times New Roman* tanpa cacat visual.
- 🖼️ **Placeholder Prompt Ilustrasi Line-Art AI**: Menyediakan petunjuk prompt AI (dalam bahasa Inggris) berformat *Black and White Line Art* hemat tinta printer sekolah dalam bingkai placeholder rapi.
- 📊 **Visual Diagram Tabel CSS Murni**: Seluruh diagram alir, peta konsep, dan skema materi dikonversi menjadi tabel HTML border CSS presisi tanpa mengandalkan gambar eksternal yang rentan pecah atau silang merah di MS Word.
- 🔑 **Bring Your Own Key (BYOK)**: Kebebasan dan keamanan penuh bagi pengguna untuk memasukkan Google Gemini API Key milik sendiri secara fleksibel.

---

## 📋 Changelog Pembaruan Versi 1.2.0

### 🏷️ Branding & Identitas
- **Pembaruan Nama Aplikasi**: Mengubah nama aplikasi pada Header (Navbar) dan Footer dari *"Asisten Penyusunan Perencanaan Pembelajaran Madrasah"* menjadi **"Asisten Penyusunan Modul Ajar Madrasah"**.
- **Perbaikan Metadata**: Mengorientasikan metadata aplikasi agar konsisten dengan identitas Modul Ajar Madrasah.

### 📄 Ekspor & Penamaan Dokumen
- **Standarisasi Prefix File Unduhan**: Mengubah awalan nama file unduhan Modul Ajar dari `Perencanaan_` menjadi `Modul_[Mata_Pelajaran]_[Bab_Tema].docx`.
- **Enkapsulasi Penuh Kode CSS**: Mengisolasikan seluruh aturan CSS di dalam tag `<head><style type="text/css">...</style></head>` serta mengeliminasi teks kode CSS yang berisiko bocor pada dokumen Microsoft Word saat diekspor.
- **Penyelarasan Margin Judul LKPD**: Menghilangkan spasi kosong / `<br>` berlebih sebelum judul utama dan menerapkan aturan padding/margin simetris (`margin-top: 15px; margin-bottom: 15px; padding: 0;`).
- **Pembersihan Kolom Tanda Tangan**: Menghilangkan kolom tanda tangan opsional pada LKPD agar dokumen langsung berakhir secara rapi setelah Asesmen Sumatif / Lampiran Pegangan Guru.

---

## 🛠️ Panduan Pemasangan & Deployment

### 🚀 Metode 1: Deployment Gratis via Vercel / Netlify

1. **Import Repository**:
   - *Push* kode proyek ini ke repositori GitHub / GitLab Anda.
   - Buka dasbor **Vercel** / **Netlify**, lalu pilih **Add New Project** dan pilih repositori tersebut.

2. **Pengaturan Environment Variables**:
   - Tambahkan Environment Variable berikut pada dasbor penyedia hosting:
     ```env
     NEXT_PUBLIC_GEMINI_API_KEY=sk-xxxx-your-gemini-api-key
     ```

3. **Deploy**:
   - Klik **Deploy**. Vercel/Netlify akan mendeteksi skrip Vite/React dan melakukan proses *build* secara otomatis.

---

### 🌐 Metode 2: Shared Hosting / cPanel

1. **Proses Build Lokal**:
   - Buka terminal pada repositori komputer Anda dan jalankan skrip *build*:
     ```bash
     npm run build
     ```
   - Perintah ini akan menghasilkan folder produksi `dist/` (atau `out/`).

2. **Unggah ke cPanel**:
   - Masuk ke cPanel File Manager, lalu buka direktori `public_html`.
   - Unggah seluruh isi file yang berada di dalam folder `dist/` ke direktori `public_html`.

3. **Konfigurasi Server**:
   - Apabila aplikasi mengandalkan server Node.js internal, jalankan perintah `npm start` melalui fitur **Setup Node.js App** di cPanel.

---

### 💻 Metode 3: Menjalankan di Localhost

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/username/asisten-modul-ajar-madrasah.git
   cd asisten-modul-ajar-madrasah
   ```

2. **Instalasi Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Berkas Environment**:
   - Buat berkas `.env` pada direktori utama dan tambahkan API Key Gemini Anda:
     ```env
     GEMINI_API_KEY=sk-xxxx-your-gemini-api-key
     ```

4. **Jalankan Dev Server**:
   ```bash
   npm run dev
   ```
   - Akses aplikasi melalui peramban di `http://localhost:3000`.

---

## ⚖️ Lisensi & Ketentuan Hak Cipta (Non-Commercial EULA)

> **"This software is free to use and distribute for personal and educational purposes. Selling, sublicensing, or commercially redistributing this software without written permission from the copyright holder is prohibited."**

### Ketentuan Lisensi:
- 🎓 **100% Gratis untuk Pendidikan**: Aplikasi ini sepenuhnya gratis digunakan dan didistribusikan untuk keperluan pribadi, pembelajaran, serta kegiatan pendidikan non-komersial di lingkungan madrasah dan sekolah.
- 🚫 **Dilarang Dikomersialkan**: Dilarang keras memperjualbelikan, menyewakan, mentransaksikan, memisahkan modul untuk dijual, atau mengomersialkan ulang perangkat lunak ini tanpa izin tertulis langsung dari pemegang hak cipta.
