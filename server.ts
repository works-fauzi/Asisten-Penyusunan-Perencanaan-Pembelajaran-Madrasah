import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import os from "os";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

// Parse incoming JSON requests with a high limit for larger text
app.use(express.json({ limit: "10mb" }));

// Configure multer with memory storage for temporary file holding
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // max 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const isAllowedExt =
      file.originalname.toLowerCase().endsWith(".pdf") ||
      file.originalname.toLowerCase().endsWith(".docx") ||
      file.originalname.toLowerCase().endsWith(".doc");

    if (allowedMimeTypes.includes(file.mimetype) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Format file rujukan harus berupa PDF atau DOCX. Max 5 MB."));
    }
  },
});

// Initialization helper for Gemini API to get a fresh client instance every request
function getAiClient(customKey?: string): GoogleGenAI {
  const key = customKey ? customKey.trim() : "";
  if (!key) {
    throw new Error("Token API Gemini tidak diisi atau kosong! Pembuatan perencanaan pembelajaran dihentikan demi keamanan API Key sistem.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper function to call generateContent with retry and model fallback to handle 503/429 errors gracefully
async function generateContentWithFallbackAndRetry(
  aiInstance: GoogleGenAI,
  params: {
    contents: any[];
    config: {
      systemInstruction: string;
      temperature: number;
    };
  }
) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    let retries = 3;
    let delay = 1000; // start with 1 second delay
    
    while (retries > 0) {
      try {
        console.log(`[Gemini API] Attempting generation with model: ${model} (${retries} attempts remaining for this model)`);
        const response = await aiInstance.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });
        
        // Successfully got a response
        if (response && response.text) {
          console.log(`[Gemini API] Generation succeeded with model: ${model}`);
          return response;
        }
        
        throw new Error("Received empty or malformed response from Gemini API.");
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.error && error.error.code);
        
        console.error(`[Gemini API] Error using model ${model}:`, errMsg);
        
        const is503 = errMsg.includes("503") || errStatus === 503 || errMsg.toUpperCase().includes("UNAVAILABLE") || errMsg.toLowerCase().includes("high demand");
        const is429 = errMsg.includes("429") || errStatus === 429 || errMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") || errMsg.toLowerCase().includes("quota");
        
        if (is503 || is429) {
          retries--;
          if (retries > 0) {
            console.warn(`[Gemini API] Model ${model} returned ${is503 ? "503 (Unavailable/High Demand)" : "429 (Rate Limit)"}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            continue;
          }
        }
        
        // If it's not a temporary code or we exhausted retries, break out to try the next model
        break;
      }
    }
  }
  
  throw lastError || new Error("Gagal melakukan pembuatan modul ajar menggunakan semua model yang tersedia.");
}

// API endpoint for generating lesson plans (supports optional file upload for Buku Rujukan)
app.post("/api/generate-lesson-plan", upload.single("rujukanFile"), async (req, res) => {
  let tempFilePath = "";
  let uploadedFile: any = null;
  let geminiApiKeyFromClient = "";

  try {
    const {
      madrasah,
      namaGuru,
      jenjang,
      mataPelajaran,
      babTema,
      fase,
      kelas,
      alokasiWaktu,
      bukuRujukan,
      catatanKhusus,
      metodePembelajaran,
      p2raPilihan,
      pancacintaPilihan,
      geminiApiKey
    } = req.body;

    if (geminiApiKey) {
      geminiApiKeyFromClient = geminiApiKey;
    }

    if (!mataPelajaran || !babTema || !fase || !kelas) {
      return res.status(400).json({
        status: "error",
        error: "Kolom Mata Pelajaran, Bab/Tema Utama, Fase, dan Kelas wajib diisi.",
        detail: "Kolom Mata Pelajaran, Bab/Tema Utama, Fase, dan Kelas wajib diisi."
      });
    }

    // Process metodePembelajaran array/string
    let metodeYangDipilih = "Diskusi Kelompok Aktif (Active Group Discussion)";
    if (Array.isArray(metodePembelajaran)) {
      if (metodePembelajaran.length > 0) {
        metodeYangDipilih = metodePembelajaran.join(", ");
      }
    } else if (typeof metodePembelajaran === "string" && metodePembelajaran.trim() !== "") {
      metodeYangDipilih = metodePembelajaran;
    }

    // Process pancacintaPilihan array/string
    let pancacintaYangDipilih = "Cinta kepada Allah Swt. / Sang Pencipta";
    if (Array.isArray(pancacintaPilihan)) {
      if (pancacintaPilihan.length > 0) {
        pancacintaYangDipilih = pancacintaPilihan.join(", ");
      }
    } else if (typeof pancacintaPilihan === "string" && pancacintaPilihan.trim() !== "") {
      pancacintaYangDipilih = pancacintaPilihan;
    }

    // Process p2raPilihan array/string
    let p2raYangDipilih = "Ta'addub (Berkeadaban) dan Qudwah (Keteladanan)";
    if (Array.isArray(p2raPilihan)) {
      if (p2raPilihan.length > 0) {
        p2raYangDipilih = p2raPilihan.join(", ");
      }
    } else if (typeof p2raPilihan === "string" && p2raPilihan.trim() !== "") {
      p2raYangDipilih = p2raPilihan;
    }

    // Process file upload if present
    if (req.file) {
      const tempDir = os.tmpdir();
      const fileExt = path.extname(req.file.originalname) || (req.file.mimetype === "application/pdf" ? ".pdf" : ".docx");
      const tempFileName = `rujukan-${crypto.randomUUID()}${fileExt}`;
      tempFilePath = path.join(tempDir, tempFileName);

      // Write buffer to local temp file so @google/genai SDK can read it
      fs.writeFileSync(tempFilePath, req.file.buffer);

      // Upload file to Gemini Files API
      uploadedFile = await getAiClient(geminiApiKeyFromClient).files.upload({
        file: tempFilePath,
        config: {
          mimeType: req.file.mimetype || (fileExt === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        }
      });
    }

    const systemInstruction = `Anda adalah "Asisten Utama Penyusunan Perencanaan Pembelajaran Madrasah". Peran Anda adalah sebagai pakar kurikulum yang memadukan secara harmonis antara Kurikulum Merdeka (KMA Kemenag RI, seperti KMA 450 Tahun 2024), Peraturan Menteri Pendidikan Dasar dan Menengah RI No. 13 Tahun 2025 & No. 1 Tahun 2026 (Standar Proses), serta Keputusan Direktur Jenderal Pendidikan Islam No. 6077 Tahun 2025 tentang Panduan Kurikulum Berbasis Cinta (KBC).

Berikut rujukan resmi dan filosofi penting yang WAJIB Anda terapkan dalam penyusunan perencanaan ini secara ketat:

1. PENDEKATAN DEEP LEARNING (Sesuai Permendikbudristek No. 13 Tahun 2025 & No. 1 Tahun 2026):
   - **Berkesadaran (Mindful)**: Membantu murid memahami tujuan pembelajaran secara sadar, menumbuhkan motivasi intrinsik, keaktifan belajar, regulasi diri, serta kehadiran mental utuh (presence).
   - **Bermakna (Meaningful)**: Mengaitkan materi dengan konteks nyata murid (personal, lokal, nasional, global) dan mentransfer pemahaman secara kontekstual untuk memecahkan masalah kompleks (HOTS) serta membangun pengetahuan baru.
   - **Menggembirakan (Joyful)**: Suasana belajar yang menantang, memotivasi, aman secara psikologis, memelihara kebebasan berekspresi, melatih penalaran kritis dan kreasi murid tanpa rasa takut salah atau tertekan.
   - **Alur Pengalaman Belajar**: Harus mencerminkan siklus **Memahami** (membangun sikap, pengetahuan, keterampilan), **Mengaplikasi** (menggunakan dalam situasi nyata), dan **Merefleksi** (mengevaluasi proses secara mandiri).
   - **Peran Pendidik**: Memberikan **Keteladanan** (perilaku mulia & sikap terbuka), **Pendampingan** (bimbingan & dorongan aktif), dan **Fasilitasi** (menyediakan akses & ruang strategi mandiri).
   - **Kerangka Pembelajaran**: Meliputi praktik pedagogis, kemitraan pembelajaran, lingkungan pembelajaran yang inklusif, serta pemanfaatan teknologi yang interaktif dan kolaboratif.

2. PENDEKATAN KURIKULUM BERBASIS CINTA (KBC) (Sesuai Keputusan Dirjen Pendis No. 6077 Tahun 2025):
   - **Lima Topik Panca Cinta**:
     1. **Cinta Allah Swt. dan Rasul-Nya**: Menekankan pengenalan sifat *Jamaliyah* (keindahan, kelembutan, kasih sayang: *ar-Rahman, ar-Rahim, al-Latif, ar-Rauf, al-Wadud*) yang lebih dominan daripada sifat *Jalaliyah* (kemurkaan). Ibadah sebagai ekspresi cinta, bukan sekadar ketakutan. Meneladani sifat-sifat Rasulullah SAW (lemah lembut, penuh kasih sayang, adab luhur).
     2. **Cinta Ilmu**: Mengajarkan pilar sukses menuntut ilmu (*niat, tekun, tawakal, wara', yakin, bersyukur*), adab mulia kepada guru, literasi sebagai sumber ilmu (qauliyah & kauniyah).
     3. **Cinta Lingkungan**: Menanamkan kesadaran Islam sebagai *Rahmatan lil 'Alamin*, adab pada alam, larangan berbuat kerusakan (*fasad* - QS. Al-A'raf: 56, QS. Ar-Rum: 41), kebersihan (*thaharah*), dan kehematan energi (larangan *ishraf*).
     4. **Cinta Diri dan Sesama Manusia**: Memupuk akhlak terpuji kepada diri (*syukur, sabar, qana'ah, self-compassion*), menghindari akhlak terpela (*ananiah, putus asa, ghadab, tamak*), melatih Social Emotional Skill (SES), menyadari kesatuan manusia (*ukhuwah Islamiyah, ukhuwah insaniyah*), adab kepada sesama (*ta'awun, tafahum, tasamuh, tawadhu', husnuzhan*), serta menghindari fitnah, namimah, ghibah, su'uzhan, dan rafast.
     5. **Cinta Tanah Air**: Menumbuhkan semangat kebangsaan (*Hubbul Wathan minal Iman*), *ukhuwah wathaniyah*, dan persatuan dalam keragaman (QS. Al-Hujurat: 13).
   - **7 Prinsip Disiplin Positif**: (1) Kesadaran internal bukan kendali luar, (2) Konsekuensi logis bukan hukuman, (3) Dukungan bukan hadiah, (4) Koneksi sebelum koreksi, (5) Memahami bukan menghakimi, (6) Mengendalikan diri bukan orang lain, (7) Lembut dan tegas.
   - **Model Pembelajaran KBC**: FIDS (Feel, Imagine, Do, Share), ARKA (Aktivitas, Refleksi, Konsep, Aplikasi) dalam Experiential Learning, LOK-R (Literasi, Orientasi, Kolaborasi, Refleksi), Discovery Learning, PjBL, atau Cooperative Learning.

3. STANDAR KURIKULUM MERDEKA MADRASAH:
   - Harus memiliki struktur lengkap: Identitas Modul, Kompetensi Awal, Profil Pelajar Pancasila & Rahmatan Lil Alamin (P2RA), Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, Langkah Pembelajaran (Pendahuluan, Inti, Penutup), Asesmen, dan Refleksi.
   - Tulis langkah-langkah pembelajaran dengan dialog atau instruksi konkret guru (misalnya "Ucap Guru: ...", "Tindakan Siswa: ...") bernuansa kasih sayang, apresiatif, humanis, tanpa unsur kekerasan atau pemaksaan.

Format keluaran Anda harus dalam Markdown yang terstruktur sangat rapi, dengan pembagian bab menggunakan format alfabet dan numerik yang persis, serta menggunakan penanda list (bullet) yang indah.`;

    const userPrompt = `Buatkan perencanaan pembelajaran (Modul Ajar / Perencanaan Pembelajaran) lengkap berbasis Kurikulum Merdeka Madrasah terintegrasi penuh dengan Deep Learning (Permendikbudristek 13/2025 & 1/2026) dan Kurikulum Berbasis Cinta (SK Dirjen Pendis 6077/2025):
- Nama Madrasah: ${madrasah || "MTs Al-Iman 02 Bulus"}
- Nama Guru: ${namaGuru || "Achmad Fauzi, S.S."}
- Jenjang: ${jenjang || "MTs / SMP"}
- Mata Pelajaran: ${mataPelajaran}
- Bab / Tema Utama: ${babTema}
- Fase: ${fase}
- Kelas: ${kelas}
- Alokasi Waktu: ${alokasiWaktu || "[Alokasi Waktu]"}
- Buku Rujukan Utama: ${bukuRujukan || "[Buku Rujukan Utama]"}
- Metode Pembelajaran Utama: Gunakan kombinasi metode pembelajaran yang dipilih oleh guru berikut ini (${metodeYangDipilih}) dan distribusikan metode-metode tersebut secara bervariasi ke dalam tiap-tiap pertemuan yang ada.
- Elemen P2RA (Profil Pelajar Rahmatan Lil Alamin) yang difokuskan: ${p2raYangDipilih}
- Fokus KBC Pancacinta: Dalam menyusun modul ajar ini, Anda WAJIB mengintegrasikan nilai-nilai KBC Pancacinta yang telah dipilih oleh guru, yaitu: (${pancacintaYangDipilih}). Jabarkan nilai-nilai cinta tersebut secara konkret ke dalam aktivitas interaksi guru-murid, cara guru memberikan apresiasi, serta pada bagian refleksi di akhir pembelajaran.
${catatanKhusus ? `- Catatan Khusus Kelas / Kebutuhan Belajar: ${catatanKhusus}` : ""}

Harap susun dokumen ini dengan struktur berikut secara detail dan persis, tanpa mengurangi komponen apa pun:

# PERENCANAAN PEMBELAJARAN

## A. IDENTITAS
- Nama Madrasah: ${madrasah || "MTs Al-Iman 02 Bulus"}
- Nama Guru: ${namaGuru || "Achmad Fauzi, S.S."}
- Mata Pelajaran: ${mataPelajaran}
- Kelas / Fase: ${kelas} / ${fase}
- Materi Pokok: ${babTema}
- Tema KBC:
  1. ${pancacintaYangDipilih}
  2. -
- Materi Insersi:
  1. Membiasakan diri berakhlak terpuji
  2. Ajaran Islam tentang kesopanan dan pengenalan karakter terpuji
- Dimensi Profil Lulusan:
  (Tuliskan daftar dimensi Profil Pelajar Pancasila & Rahmatan Lil Alamin yang difokuskan secara lengkap dan deskripsikan aksi konkret penerapannya dalam aktivitas kelas, misalnya:)
  1. Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa, dan Berakhlak Mulia: Mampu menerapkan akhlak mulia dan budi pekerti luhur dalam belajar sehari-hari.
  2. [Lanjutkan dengan dimensi-dimensi Profil Lulusan lain yang relevan secara komprehensif, seperti Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Kesehatan, Komunikasi, dsb.]
- Semester: Ganjil (atau sesuaikan dengan kelas)
- Tahun Ajaran: 2025 / 2026
- Alokasi Waktu: ${alokasiWaktu || "2x40 Menit"}
- Jumlah Pertemuan: [Hitung jumlah pertemuan secara logis berdasarkan alokasi waktu]

## B. DESAIN PEMBELAJARAN
### 1. Capaian Pembelajaran
Pada akhir Fase ${fase}, peserta didik memiliki kemampuan sebagai berikut:
● Membaca dan Memirsa: [Tuliskan deskripsi Capaian Pembelajaran secara detail dan relevan]
● Berbicara dan Mempresentasikan: [Tuliskan deskripsi Capaian Pembelajaran secara detail dan relevan]
● Menulis: [Tuliskan deskripsi Capaian Pembelajaran secara detail dan relevan]

### 2. Identifikasi Kesiapan Peserta Didik
● Pengetahuan Awal: [Tuliskan analisis kesiapan awal peserta didik mengenai tema materi]
● Minat: [Tuliskan minat belajar peserta didik yang beragam]
● Latar Belakang: [Tuliskan latar belakang peserta didik]
● Kebutuhan Belajar:
  - Visual: [Skenario belajar siswa visual]
  - Auditori: [Skenario belajar siswa auditori]
  - Kinestetik: [Skenario belajar siswa kinestetik]

### 3. Karakteristik Materi Pelajaran
● Jenis Pengetahuan yang Akan Dicapai:
  - Konseptual: [Tuliskan muatan teori/konsep yang dipelajari]
  - Prosedural: [Tuliskan keterampilan/prosedur yang dipelajari]
● Relevansi dengan Kehidupan Nyata Peserta Didik: ...
● Tingkat Kesulitan: ...
● Struktur Materi: ...
● Integrasi Nilai dan Karakter:
  (Hubungkan nilai ketakwaan, kritis, kreatif, kolaboratif, kemandirian, dan kepedulian secara mendalam terhadap materi ajar)

### 4. Lintas Disiplin Ilmu
● Seni Rupa: ...
● Teknologi Informasi dan Komunikasi (TIK): ...
● Pendidikan Kewarganegaraan (PKn): ...
● Ilmu Pengetahuan Sosial (IPS): ...

### 5. Topik Pembelajaran Kontekstual
"[Masukkan Satu Pertanyaan Esensial Kontekstual Besar yang Menginspirasi dalam Tanda Petik Ganda]"
[Tuliskan penjelasan singkat bagaimana topik ini mengaitkan materi dengan pengalaman nyata sehari-hari siswa]

### 6. KERANGKA PEMBELAJARAN
#### a. Praktik Pedagogik
● Model Pembelajaran: [Model, misal Project-Based Learning (PjBL)]
● Pendekatan: Deep Learning (Mindful, Meaningful, Joyful Learning)
  - Mindful Learning: [Deskripsi konkret aksi guru-murid]
  - Meaningful Learning: [Deskripsi konkret hubungan konteks nyata]
  - Joyful Learning: [Deskripsi permainan/tantangan yang menggembirakan]
● Metode Pembelajaran: ${metodeYangDipilih}
● Strategi Pembelajaran Berdiferensiasi:
  - Diferensiasi Konten: ...
  - Diferensiasi Proses: ...
  - Diferensiasi Produk: ...
#### b. Kemitraan Pembelajaran
● Lingkungan Sekolah: ...
● Lingkungan Luar Sekolah/Masyarakat: ...
● Mitra Digital: ...
#### c. Lingkungan Belajar
● Ruang Fisik: ...
● Ruang Virtual: ...
● Budaya Belajar: ...
#### d. Pemanfaatan Digital
● Perpustakaan Digital/Sumber Daring: ...
● Media Publikasi Digital: ...

## C. TUJUAN PEMBELAJARAN DAN IKTP
Tujuan Pembelajaran:
1. [Tuliskan tujuan pembelajaran yang logis]
Indikator Ketuntasan Tujuan Pembelajaran (IKTP)
• Pertemuan 1 dan 2
1. ...
• Pertemuan 3 dan 4
...

## D. LANGKAH-LANGKAH KEGIATAN PEMBELAJARAN
(Rancang langkah pembelajaran yang konkret untuk sekelompok pertemuan secara logis dan mendalam. Untuk setiap kelompok pertemuan, tuliskan detail sbb:)
Pertemuan 1 dan 2
Model Pembelajaran: ...
Metode Pembelajaran: ...
Topik: ...
● KEGIATAN PENDAHULUAN (15 MENIT)
  ○ Pembukaan: ...
  ○ Apersepsi (Joyful): ...
  ○ Pertanyaan Pemantik: ...
  ○ Tujuan: ...
● KEGIATAN INTI (55 MENIT)
  ○ Eksplorasi (Mindful): ...
  ○ Diskusi (Meaningful): ...
  ○ Penjelasan Konsep: ...
  ○ Pembelajaran Berdiferensiasi:
    ■ Proses: ...
    ■ Produk: ...
● KEGIATAN PENUTUP (10 MENIT)
  ○ Refleksi: ...
  ○ Rangkuman: ...
  ○ Tindak Lanjut: ...
  ○ Penutup: ...

## E. ASESMEN PEMBELAJARAN
ASESMEN DIAGNOSTIK
● Tanya Jawab: ...
● Kuis Singkat: ...
ASESMEN FORMATIF
● Tanya Jawab: ...
● Diskusi Kelompok: ...
● Latihan Soal/LKPD: ...
● Observasi: ...
● Produk (Proses):
  ○ Draft/Rancangan siswa...
ASESMEN SUMATIF
● Produk (Proyek): ...
● Praktik (Kinerja): ...
● Tes Tertulis: (Berikan Contoh Tes Tertulis berupa: I. Pilihan Ganda terdiri dari 5 soal lengkap dengan opsi a, b, c, d dan II. Essay terdiri dari 3 soal yang berkualitas tinggi dan mendalam sesuai materi pembelajaran)

Tulis dalam Bahasa Indonesia yang baku, indah, akademis, humanis, menyentuh hati, dan membangkitkan gairah mendidik bagi guru yang membacanya. Jangan tuliskan bagian Tanda Tangan guru, karena sistem akan menambahkannya secara otomatis. Letakkan semua bullet penjelas menggunakan tanda ● (bulat hitam), ○ (bulat putih), atau ■ (kotak hitam) secara rapi agar senada dengan file acuan.`;

    const contents: any[] = [];
    if (uploadedFile) {
      // Pass the uploaded file from Files API to Gemini contents array
      contents.push({
        fileData: {
          fileUri: uploadedFile.uri,
          mimeType: uploadedFile.mimeType,
        }
      });
      contents.push({
        text: `DOKUMEN RUJUKAN UTAMA TELAH DIUNGGAH SEBAGAI LANDASAN UTAMA: Dokumen rujukan guru terlampir. Harap buat Modul Ajar / Perencanaan Pembelajaran dengan menyerap materi, kompetensi dasar, dan struktur bab dari dokumen ini secara maksimal.\n\n${userPrompt}`
      });
    } else {
      contents.push({ text: userPrompt });
    }

    const response = await generateContentWithFallbackAndRetry(getAiClient(geminiApiKeyFromClient), {
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gagal memperoleh hasil pembuatan rencana pembelajaran dari Gemini API.");
    }
    res.json({ status: "success", result: text });
  } catch (error: any) {
    console.error("Error generating lesson plan:", error);
    res.status(500).json({
      status: "error",
      error: error.message || "Terjadi kesalahan pada server saat menghubungi Gemini API.",
      detail: error.message || "Terjadi kesalahan pada server saat menghubungi Gemini API."
    });
  } finally {
    try {
      // ALWAYS clean up temporary local files
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error("Failed to delete local temp file:", err);
        }
      }
      // ALWAYS clean up uploaded Gemini Files API resources to avoid storage bloat/leaks
      if (uploadedFile && uploadedFile.name) {
        try {
          const client = getAiClient(geminiApiKeyFromClient);
          await client.files.delete({ name: uploadedFile.name });
        } catch (err) {
          console.error("Failed to delete Gemini Files API resource:", err);
        }
      }
    } catch (cleanupError) {
      console.error("Severe error in finally block cleanup:", cleanupError);
    }
  }
});

// Error handling middleware for Multer and other uncaught route errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Error Handler caught:", err);
  // Return JSON error response instead of Express default HTML page
  res.status(err.status || 500).json({
    error: err.message || "Terjadi kesalahan internal pada server."
  });
});

// Configure Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
