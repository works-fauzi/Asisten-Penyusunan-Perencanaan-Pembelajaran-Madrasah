import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";

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

// API endpoint for verifying Gemini API Key
app.post("/api/verify-key", async (req, res) => {
  try {
    const { geminiApiKey } = req.body;
    const cleanToken = (geminiApiKey || "").trim();

    if (!cleanToken) {
      return res.status(400).json({
        status: "error",
        error: "API Key Gemini tidak diisi atau kosong!",
      });
    }

    const verifyUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(cleanToken)}`;
    const verifyRes = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Hi" }]
          }
        ]
      })
    });

    if (verifyRes.ok) {
      return res.json({
        status: "success",
        message: "API Key Gemini valid dan aktif!"
      });
    } else {
      let errData: any = null;
      try {
        errData = await verifyRes.json();
        console.log("Error Detail:", errData);
      } catch (e) {
        console.error("Failed to parse Gemini verify error response:", e);
      }

      const googleMsg = errData?.error?.message || "API Key Gemini ditolak oleh Google. Pastikan kunci sudah diaktifkan di Google AI Studio.";
      return res.status(verifyRes.status).json({
        status: "error",
        error: googleMsg,
        detail: errData
      });
    }
  } catch (error: any) {
    console.error("Error verifying Gemini API Key:", error);
    return res.status(500).json({
      status: "error",
      error: "Gagal memverifikasi API Key Gemini ke Google. Periksa koneksi internet Anda."
    });
  }
});

// Helper function to call generateContent with retry and model fallback using official v1beta REST payload structure
async function generateContentWithFallbackAndRetry(
  cleanToken: string,
  params: {
    systemInstruction: string;
    parts: any[];
    temperature?: number;
  }
) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 3;
    let delay = 1000; // start with 1 second delay

    while (retries > 0) {
      try {
        console.log(`[Gemini API] Attempting generation with model: ${model} (${retries} attempts remaining for this model)`);

        // Construct official Gemini v1beta payload structure
        const payload: any = {
          systemInstruction: {
            parts: [
              { text: params.systemInstruction }
            ]
          },
          contents: [
            {
              role: "user",
              parts: params.parts
            }
          ],
          generationConfig: {
            temperature: params.temperature ?? 0.7
          }
        };

        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanToken.trim())}`;

        const response = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          const candidates = resData.candidates;
          if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
            const textParts = candidates[0].content.parts.map((p: any) => p.text || "").join("\n");
            if (textParts.trim()) {
              console.log(`[Gemini API] Generation succeeded with model: ${model}`);
              return textParts;
            }
          }
          throw new Error("Received empty text content from Gemini response.");
        }

        // Handle error status
        let errJson: any = null;
        try {
          errJson = await response.json();
          console.log("Error Detail:", errJson);
        } catch (e) {
          console.error("Could not parse Gemini error JSON:", e);
        }

        const errMessageFromGoogle = errJson?.error?.message || response.statusText;
        console.error(`[Gemini API] Error status ${response.status} using model ${model}:`, errMessageFromGoogle);

        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(errMessageFromGoogle || "API Key Gemini ditolak oleh Google. Pastikan kunci sudah diaktifkan di Google AI Studio.");
        }

        const is503 = response.status === 503 || errMessageFromGoogle.includes("503") || errMessageFromGoogle.toUpperCase().includes("UNAVAILABLE");
        const is429 = response.status === 429 || errMessageFromGoogle.includes("429") || errMessageFromGoogle.toUpperCase().includes("RESOURCE_EXHAUSTED");

        if (is503 || is429) {
          retries--;
          if (retries > 0) {
            console.warn(`[Gemini API] Model ${model} returned ${is503 ? "503" : "429"}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            continue;
          }
        }

        lastError = new Error(errMessageFromGoogle || "Terjadi kesalahan saat memproses request di Gemini API.");
        break;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        if (
          errMsg.includes("ditolak oleh Google") ||
          errMsg.includes("Gagal memproses request") ||
          errMsg.includes("API Key")
        ) {
          throw error;
        }
        break;
      }
    }
  }

  throw lastError || new Error("Gagal melakukan pembuatan modul ajar menggunakan semua model yang tersedia.");
}

// API endpoint for generating lesson plans (supports optional file upload for Buku Rujukan)
app.post("/api/generate-lesson-plan", upload.single("rujukanFile"), async (req, res) => {
  let geminiApiKeyFromClient = "";

  try {
    const {
      madrasah,
      namaGuru,
      jenjang,
      mataPelajaran,
      semester,
      tahunAjaran,
      babTema,
      subBab,
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
      geminiApiKeyFromClient = geminiApiKey.trim();
    }

    if (!geminiApiKeyFromClient) {
      return res.status(400).json({
        status: "error",
        error: "API Key Gemini tidak diisi atau kosong! Pembuatan perencanaan pembelajaran dihentikan.",
        detail: "API Key Gemini tidak diisi atau kosong!"
      });
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
    let filePart: any = null;
    if (req.file) {
      const mimeType = req.file.mimetype || (req.file.originalname.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const base64Data = req.file.buffer.toString("base64");
      filePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };
    }

    // Parse Alokasi Waktu to determine JP logic dynamically
    const rawAlokasi = alokasiWaktu || "2 x 35 Menit";
    
    // Simple parser to extract first number of JP
    const parseJpCount = (str: string): number => {
      const normalized = str.toLowerCase();
      const multMatch = normalized.match(/(\d+)\s*x\s*(\d+)/);
      if (multMatch) return parseInt(multMatch[1], 10);
      const jpMatch = normalized.match(/(\d+)\s*jp/);
      if (jpMatch) return parseInt(jpMatch[1], 10);
      const pertMatch = normalized.match(/(\d+)\s*pertemuan/);
      if (pertMatch) return parseInt(pertMatch[1], 10) * 2;
      const firstNum = normalized.match(/^(\d+)/);
      if (firstNum) return parseInt(firstNum[1], 10);
      return 2; // Default to 2
    };

    const jpCount = parseJpCount(rawAlokasi);
    let sectionDInstruction = "";

    if (jpCount <= 2) {
      sectionDInstruction = `Oleh karena Alokasi Waktu HANYA 2 JP atau kurang (${rawAlokasi}), Anda wajib otomatis menghasilkan langkah pembelajaran untuk 1 pertemuan saja dengan judul tunggal persis seperti ini:
### PERTEMUAN 1 (2 x 35 Menit)
(Harap sesuaikan menit di dalam kurung jika Anda menginput rincian waktu berbeda seperti 2 x 40 menit, dst.)

DILARANG KERAS membuat pertemuan tambahan atau menggabungkan pertemuan!`;
    } else {
      const jumlahPertemuan = Math.ceil(jpCount / 2);
      let listPertemuanString = "";
      for (let i = 1; i <= jumlahPertemuan; i++) {
        listPertemuanString += `- PERTEMUAN ${i} (2 x 35 Menit) (Atau sesuaikan durasi menit per pertemuan)\n`;
      }
      
      sectionDInstruction = `Oleh karena Alokasi Waktu LEBIH DARI 2 JP (${rawAlokasi}, terhitung sekitar ${jpCount} JP), Anda WAJIB memecah langkah kegiatan pembelajaran secara terpisah per satu pertemuan (per 2 JP). Setiap pertemuan mewakili 2 JP.
Oleh karena itu, buatlah sebanyak ${jumlahPertemuan} pertemuan mandiri yang berurutan secara terpisah:
${listPertemuanString}

DILARANG KERAS menggabungkan dua atau lebih pertemuan menjadi satu sub-bab (contoh kesalahan yang harus dihindari: "PERTEMUAN 1 DAN 2"). Masing-masing pertemuan wajib memiliki sub-judul sendiri yang mandiri!`;
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

Format keluaran Anda harus dalam Markdown yang terstruktur sangat rapi, dengan pembagian bab menggunakan format alfabet dan numerik yang persis, serta menggunakan penanda list (bullet) yang indah.

PENTING: Untuk bagian "D. LANGKAH-LANGKAH KEGIATAN PEMBELAJARAN", Anda wajib mematuhi panduan pembagian pertemuan secara ketat sesuai dengan instruksi alokasi waktu yang dinamis di dalam user prompt. DILARANG KERAS menggabungkan beberapa pertemuan ke dalam satu sub-bab (contoh: "PERTEMUAN 1 DAN 2") atau mereduksi detail masing-masing kegiatan!`;

    const cleanFaseStr = (fase || "").replace(/^(fase\s*)+/i, "").trim();
    const formattedFase = cleanFaseStr ? (cleanFaseStr.toUpperCase() === "RA" ? "Fase RA" : `Fase ${cleanFaseStr}`) : "Fase D";

    const userPrompt = `Buatkan perencanaan pembelajaran (Modul Ajar / Perencanaan Pembelajaran) lengkap berbasis Kurikulum Merdeka Madrasah terintegrasi penuh dengan Deep Learning (Permendikbudristek 13/2025 & 1/2026) dan Kurikulum Berbasis Cinta (SK Dirjen Pendis 6077/2025):
- Nama Madrasah: ${madrasah || "MTs Al-Iman 02 Bulus"}
- Nama Guru: ${namaGuru || "Achmad Fauzi, S.S."}
- Jenjang: ${jenjang || "MTs / SMP"}
- Mata Pelajaran: ${mataPelajaran}
- Bab / Tema Utama: ${babTema}
- Sub Bab Pengembangan: ${subBab || "Tidak ditentukan"}
- Fase: ${formattedFase}
- Kelas: ${kelas}
- Alokasi Waktu: ${alokasiWaktu || "[Alokasi Waktu]"}
- Buku Rujukan Utama: ${bukuRujukan || "[Buku Rujukan Utama]"}
- Metode Pembelajaran Utama: Gunakan kombinasi metode pembelajaran yang dipilih oleh guru berikut ini (${metodeYangDipilih}) dan distribusikan metode-metode tersebut secara bervariasi ke dalam tiap-tiap pertemuan yang ada.
- Elemen P2RA (Profil Pelajar Rahmatan Lil Alamin) yang difokuskan: ${p2raYangDipilih}
- Fokus KBC Pancacinta: Dalam menyusun modul ajar ini, Anda WAJIB mengintegrasikan nilai-nilai KBC Pancacinta yang telah dipilih oleh guru, yaitu: (${pancacintaYangDipilih}). Jabarkan nilai-nilai cinta tersebut secara konkret ke dalam aktivitas interaksi guru-murid, cara guru memberikan apresiasi, serta pada bagian refleksi di akhir pembelajaran.
${catatanKhusus ? `- Catatan Khusus Kelas / Kebutuhan Belajar: ${catatanKhusus}` : ""}

PENTING UNTUK SUB BAB PENGEMBANGAN:
Jika user menginput Sub Bab Pengembangan di atas (yaitu: "${subBab || ""}"), Anda WAJIB merumuskan Alur dan Tujuan Pembelajaran serta Langkah Kegiatan Pembelajaran dengan berpatokan secara urut dan fokus pada cakupan Sub Bab Pembahasan yang diinput oleh user tersebut. Jangan membuat pembahasan di luar daftar sub-bab yang telah ditentukan tersebut.

Harap susun dokumen ini dengan struktur berikut secara detail dan persis, tanpa mengurangi komponen apa pun:

# PERENCANAAN PEMBELAJARAN

## A. IDENTITAS
- Nama Madrasah: ${madrasah || "MTs Al-Iman 02 Bulus"}
- Nama Guru: ${namaGuru || "Achmad Fauzi, S.S."}
- Mata Pelajaran: ${mataPelajaran}
- Kelas / Fase: ${kelas} / ${formattedFase}
- Materi Pokok: ${babTema}
- Sub Bab Pembahasan: ${subBab || "Tidak ditentukan"}
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
- Semester: ${semester || "Ganjil"}
- Tahun Ajaran: ${tahunAjaran || "2026 / 2027"}
- Alokasi Waktu: ${alokasiWaktu || "2x40 Menit"}
- Jumlah Pertemuan: [Hitung jumlah pertemuan secara logis berdasarkan alokasi waktu]

## B. DESAIN PEMBELAJARAN
### 1. Capaian Pembelajaran
Pada akhir ${formattedFase}, peserta didik memiliki kemampuan sebagai berikut:
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
Indikator Ketuntasan Tujuan Pembelajaran (IKTP) per Pertemuan secara terpisah:
${jpCount <= 2 ? `• Pertemuan 1:\n1. ...` : `• Pertemuan 1:\n1. ...\n• Pertemuan 2:\n1. ...\n(lanjutkan per pertemuan jika ada)`}

## D. LANGKAH-LANGKAH KEGIATAN PEMBELAJARAN
${sectionDInstruction}

Setiap pertemuan wajib memiliki struktur lengkapnya sendiri secara berurutan dan terperinci sesuai format di bawah ini:

### PERTEMUAN N (2 x 35 Menit)
- Model Pembelajaran: ...
- Metode Pembelajaran: ...
- Topik: ...
● KEGIATAN PENDAHULUAN (15 MENIT)
  ○ Pembukaan: ...
  ○ Apersepsi (Joyful): (Memicu Joyful/Mindful)
  ○ Pertanyaan Pemantik: ...
  ○ Tujuan: ...
● KEGIATAN INTI (55 MENIT)
  ○ Eksplorasi (Mindful): (Prinsip Mindful: fokus dan refleksi mendalam)
  ○ Diskusi (Meaningful): (Prinsip Meaningful: mengaitkan materi dengan kehidupan nyata dan nilai Panca Cinta Kemenag seperti Hubbunnas/Hubbunnafs)
  ○ Penjelasan Konsep: ...
  ○ Pembelajaran Berdiferensiasi:
    ■ Proses: ...
    ■ Produk: ...
● KEGIATAN PENUTUP (10 MENIT)
  ○ Refleksi: ...
  ○ Rangkuman: ...
  ○ Tindak Lanjut: ...
  ○ Penutup: ...

PENTING:
- DILARANG KERAS menggabungkan beberapa pertemuan menjadi satu sub-bab (seperti "PERTEMUAN 1 DAN 2"). Masing-masing pertemuan wajib memiliki sub-judul sendiri yang mandiri!
- Masing-masing pertemuan wajib memiliki struktur lengkapnya sendiri secara berurutan: Kegiatan Pendahuluan, Kegiatan Inti, dan Kegiatan Penutup yang spesifik dan unik sesuai urutan materi bab tersebut.
- Tetap pertahankan integrasi Deep Learning (Mindful, Meaningful, Joyful), Kurikulum Berbasis Cinta (KBC Pancacinta), nilai P2RA, serta penanganan khusus untuk siswa secara halus di dalam langkah kegiatannya.

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

    const parts: any[] = [];
    if (filePart) {
      parts.push(filePart);
      parts.push({
        text: `DOKUMEN RUJUKAN UTAMA TELAH DIUNGGAH SEBAGAI LANDASAN UTAMA: Dokumen rujukan guru terlampir. Harap buat Modul Ajar / Perencanaan Pembelajaran dengan menyerap materi, kompetensi dasar, dan struktur bab dari dokumen ini secara maksimal.\n\n${userPrompt}`
      });
    } else {
      parts.push({ text: userPrompt });
    }

    const text = await generateContentWithFallbackAndRetry(geminiApiKeyFromClient, {
      systemInstruction: systemInstruction,
      parts: parts,
      temperature: 0.7,
    });

    if (!text) {
      throw new Error("Gagal memperoleh hasil pembuatan rencana pembelajaran dari Gemini API.");
    }
    res.json({ status: "success", result: text });
  } catch (error: any) {
    console.error("Error generating lesson plan:", error);
    let errMsg = error.message || "Terjadi kesalahan pada server saat menghubungi Gemini API.";
    if (
      errMsg.toLowerCase().includes("invalid argument") ||
      errMsg.toLowerCase().includes("invalid_argument") ||
      errMsg.includes("API key not valid")
    ) {
      errMsg = "Gagal memproses request. Pastikan API Key Gemini yang dimasukkan valid dan aktif di Google AI Studio.";
    }
    res.status(500).json({
      status: "error",
      error: errMsg,
      detail: errMsg
    });
  }
});

// API endpoint for generating Lembar Kerja Peserta Didik (LKPD) AI
app.post("/api/generate-lkpd", async (req, res) => {
  try {
    const { geminiApiKey, selectedModule, selectedPertemuan } = req.body;

    const cleanToken = (geminiApiKey || "").trim();
    if (!cleanToken) {
      return res.status(400).json({
        status: "error",
        error: "API Key Gemini tidak diisi atau kosong! Pembuatan LKPD dihentikan.",
      });
    }

    if (!selectedModule) {
      return res.status(400).json({
        status: "error",
        error: "Silakan pilih Perencanaan Pembelajaran rujukan terlebih dahulu.",
      });
    }

    const params = selectedModule.params || {};
    const moduleTitle = params.babTema || selectedModule.title || "Perencanaan Pembelajaran";
    const subBab = params.subBab || "-";
    const mataPelajaran = params.mataPelajaran || "-";
    const jenjang = params.jenjang || "MI";
    const kelas = params.kelas || "-";
    const fase = params.fase || "-";
    const alokasiWaktu = params.alokasiWaktu || "-";
    const madrasah = params.madrasah || "Madrasah";
    const targetPertemuan = selectedPertemuan || "Semua Pertemuan";

    // Determine Jenjang-based Sumative Assessment rules
    let soalRule = "Buatkan 10 Soal Pilihan Ganda (opsi A, B, C, D) + 5 Soal Uraian/Essay.";
    const jenjangUpper = jenjang.toUpperCase();
    if (jenjangUpper.includes("MTS")) {
      soalRule = "Buatkan 20 Soal Pilihan Ganda (opsi A, B, C, D) + 5 Soal Uraian/Essay.";
    } else if (jenjangUpper.includes("MA") || jenjangUpper.includes("MAK")) {
      soalRule = "Buatkan 30 Soal Pilihan Ganda (opsi A, B, C, D, E) + 5 Soal Uraian/Essay.";
    }

    const systemInstruction = `Anda adalah Tutor Ahli, Penyusun Kurikulum Madrasah (Kemenag & Kurikulum Merdeka), dan Pakar Desain Bahan Ajar / Lembar Kerja Peserta Didik (LKPD). Tugas Anda adalah membuat dokumen LKPD yang komprehensif, 100% MSO HTML Standard yang rapi, siap diekspor ke Microsoft Word (.docx) tanpa cacat visual.`;

    const userPrompt = `Buatkan Lembar Kerja Peserta Didik (LKPD) berbasis data Perencanaan Pembelajaran berikut:
- Modul Ajar Rujukan:
  * Judul / Bab Utama: ${moduleTitle}
  * Sub-Bab / Topik: ${subBab}
  * Mata Pelajaran: ${mataPelajaran}
  * Jenjang Madrasah: ${jenjang}
  * Kelas / Fase: Kelas ${kelas} / Fase ${fase}
  * Alokasi Waktu: ${alokasiWaktu}
  * Nama Madrasah: ${madrasah}
  * Rincian Modul Ajar Rujukan:
${selectedModule.markdownContent ? selectedModule.markdownContent.slice(0, 3000) : "Sesuai standar Kurikulum Merdeka Kemenag"}
- Target Pertemuan: ${targetPertemuan}

Wajib susun dokumen LKPD dengan STRUKTUR MSO HTML STANDARD berikut:

1. KETEGASAN KODE HTML DOKUMEN & ELIMINASI SPASI KOSONG SEBELUM JUDUL:
   - DILARANG KERAS mengeluarkan tag <html>, <head>, <style>, atau <body> dalam response.
   - DILARANG KERAS mencetak/menyertakan deklarasi kode CSS (seperti .header-table { ... }) maupun komentar CSS (seperti /* Page Break */) di dalam teks response.
   - DILARANG KERAS menyisipkan tag <br> atau elemen paragraf kosong (<p>&nbsp;</p>) di antara banner/header identitas atas dan judul utama "LEMBAR KERJA PESERTA DIDIK".
   - HANYA keluarkan elemen HTML/Markdown isi dokumen (seperti <h1>, <h2>, <h3>, <table>, <p>, <div>, <ul>, <ol>) yang langsung dimulai dari judul utama dokumen tanpa jeda spasi kosong. Seluruh styling CSS dokumen dikapsulasi secara otomatis oleh aplikasi.

2. KONSISTENSI FONT (PREVIEW APLIKASI & MS WORD):
   - Terapkan aturan font global secara eksplisit pada seluruh elemen HTML:
     font-family: 'Times New Roman', Times, serif !important; pada html, body, table, td, th, p, div, span, h1, h2, h3, li.

3. PENGHILANGAN KOLOM TANDA TANGAN:
   - HILANGKAN SELURUH kolom/tabel tanda tangan (seperti kolom Tanda Tangan Kepala Madrasah & Guru Pengampu) di bagian bawah dokumen. LKPD selesai langsung setelah Asesmen Sumatif / Lampiran Pegangan Guru.

4. STANDARISASI DIAGRAM & PLACEHOLDER GAMBAR:
   - Ubah seluruh diagram alir/peta konsep/skema materi menjadi TABEL & BORDER CSS HTML MURNI (border: 1.5px solid #000000; border-collapse: collapse; padding: 6px; font-family: 'Times New Roman', Times, serif !important;).
   - Ganti gambar/SVG dengan BINGKAI PLACEHOLDER KOTAK:
     <div style="border: 1.5px dashed #000000; padding: 10px; background-color: #fafafa; margin: 10px 0; text-align: center; font-family: 'Times New Roman', Times, serif !important;">
       <b>[BINGKAI ILUSTRASI LEARNING MEDIA]</b><br/>
       <i>AI Image Prompt (English):</i> "Black and white line art, clean outlines, simple coloring page style, no color, no shading, plain white background, minimalist vector illustration for school worksheet, featuring [deskripsi rinci objek/suasana]"
     </div>
   - Format tempat pengisian jawaban siswa wajib menggunakan:
     <div class="write-line" style="border-bottom: 1.5px dotted #000000; min-height: 22px; width: 100%; margin: 8px 0;">....................................................................................................</div>

5. STRUKTUR MATERI LKPD:
   A. HEADER & IDENTITAS DOKUMEN:
      - Header Utama: LEMBAR KERJA PESERTA DIDIK
      - Sub-Header: Integrasi Deep Learning & Kurikulum Berbasis Cinta
      - Informasi: FASE ${fase} • KELAS ${kelas}
      - Identitas: Judul Bab, Mata Pelajaran, Nama Siswa (garis titik-titik ....................), dan Petunjuk Umum.
   B. PENDAHULUAN / STIMULUS: Apersepsi singkat & kontekstual.
   C. AKTIVITAS PEMBELAJARAN: Kelompokkan per Pertemuan (${targetPertemuan}). Memiliki Tujuan, Petunjuk, Tugas, dan Garis Isian Jawaban.
   D. ASESMEN SUMATIF (ULANGAN HARIAN): ${soalRule}
   E. LAMPIRAN PEGAWAI GURU (HALAMAN TERPISAH): Kunci Jawaban Lengkap & Pedoman Penskoran.`;

    const textResult = await generateContentWithFallbackAndRetry(cleanToken, {
      systemInstruction,
      parts: [{ text: userPrompt }],
      temperature: 0.7
    });

    if (!textResult) {
      throw new Error("Gagal memperoleh hasil pembuatan LKPD dari Gemini API.");
    }

    return res.json({ status: "success", lkpdContent: textResult });
  } catch (error: any) {
    console.error("Error generating LKPD:", error);
    let errMsg = error.message || "Terjadi kesalahan pada server saat menghubungi Gemini API.";
    return res.status(500).json({
      status: "error",
      error: errMsg
    });
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
