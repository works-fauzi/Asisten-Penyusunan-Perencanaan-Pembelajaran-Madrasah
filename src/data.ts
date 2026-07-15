export const JENJANG_OPTIONS = ["RA (Raudhatul Athfal)", "MI (Madrasah Ibtidaiyah)", "MTs (Madrasah Tsanawiyah)", "MA (Madrasah Aliyah)", "MAK (Madrasah Aliyah Kejuruan)"];

export const FASE_OPTIONS = [
  { value: "RA", label: "Fase RA (Usia 4-6 Tahun)" },
  { value: "Fase A", label: "Fase A (Kelas 1-2 MI)" },
  { value: "Fase B", label: "Fase B (Kelas 3-4 MI)" },
  { value: "Fase C", label: "Fase C (Kelas 5-6 MI)" },
  { value: "Fase D", label: "Fase D (Kelas 7-9 MTs)" },
  { value: "Fase E", label: "Fase E (Kelas 10 MA)" },
  { value: "Fase F", label: "Fase F (Kelas 11-12 MA)" }
];

export const MATA_PELAJARAN_PRESETS = [
  "Al-Qur'an Hadis",
  "Akidah Akhlak",
  "Fikih",
  "Sejarah Kebudayaan Islam (SKI)",
  "Bahasa Arab",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Seni Budaya",
  "Pendidikan Jasmani Olahraga & Kesehatan (PJOK)"
];

export const P2RA_VALUES = [
  {
    name: "Ta'addub (Berkeadaban)",
    desc: "Menjunjung tinggi akhlak mulia, karakter kesantunan, kehormatan, dan tata krama di dalam maupun luar kelas."
  },
  {
    name: "Qudwah (Keteladanan)",
    desc: "Menjadi pelopor dan contoh kebaikan dalam perkataan, perbuatan, serta menghargai orang lain secara tulus."
  },
  {
    name: "Muwatannah (Kewarganegaraan & Kebangsaan)",
    desc: "Mencintai tanah air, menghormati keberagaman budaya, dan sadar akan tanggung jawab sosial kemasyarakatan."
  },
  {
    name: "Tawassut (Mengambil Jalan Tengah)",
    desc: "Bersikap adil, seimbang, dan menghindari pemikiran ekstrem/radikal dalam memahami nilai-nilai agama."
  },
  {
    name: "Tawazun (Berimbang)",
    desc: "Menyeimbangkan antara hak dan kewajiban, antara urusan duniawi dan ukhrawi, serta spiritual dan jasmani."
  },
  {
    name: "I'tidal (Lurus & Tegas)",
    desc: "Menempatkan sesuatu pada tempatnya, tegak lurus membela kebenaran, keadilan, dan ketertiban bersama."
  },
  {
    name: "Musawah (Kesetaraan)",
    desc: "Memperlakukan sesama manusia tanpa diskriminasi, saling menghargai martabat, serta merangkul perbedaan fisik maupun latar belakang."
  },
  {
    name: "Syura (Musyawarah)",
    desc: "Mengutamakan dialog, mufakat, saling mendengarkan masukan, dan memutuskan segala hal secara inklusif."
  },
  {
    name: "Tasamuh (Toleransi)",
    desc: "Menghormati perbedaan keyakinan, pendapat, suku, dan adat istiadat demi terciptanya perdamaian."
  },
  {
    name: "Tathawwur wa Ibtikar (Dinamis & Inovatif)",
    desc: "Berpikir kreatif, adaptif terhadap perkembangan zaman, dan semangat melahirkan solusi baru."
  }
];

export const METODE_PEMBELAJARAN_PRESETS = [
  "Diskusi Kelompok Aktif (Active Group Discussion)",
  "Eksperimen Mandiri & Praktik Langsung",
  "Bermain Peran & Sosiodrama (Roleplaying)",
  "Peta Pikiran Kreatif (Mind Mapping)",
  "Project-Based Learning (Pembelajaran Berbasis Proyek)",
  "Discovery & Inquiry Learning (Penemuan Mandiri)"
];

export const PANCACINTA_PRESETS = [
  "Cinta kepada Allah Swt. / Sang Pencipta",
  "Cinta kepada Diri Sendiri (Self-Love & Kebahagiaan)",
  "Cinta kepada Sesama (Empati & Humanis)",
  "Cinta kepada Alam Semesta / Lingkungan",
  "Cinta kepada Ilmu Pengetahuan & Kebenaran"
];

export const EDUCATIONAL_GUIDES = {
  deepLearning: {
    title: "Pendekatan Deep Learning",
    desc: "Mengacu pada pergeseran metode belajar untuk melatih murid berpikir kritis dan mendalam. Terdiri dari 3 pilar utama:",
    pillars: [
      {
        name: "Mindful (Sadar/Kontekstual)",
        desc: "Siswa diajak menyadari tujuan materi pelajaran bagi kehidupan mereka sendiri secara kontekstual, menumbuhkan fokus mental, kepekaan, serta refleksi diri."
      },
      {
        name: "Meaningful (Bermakna)",
        desc: "Materi dikaitkan dengan struktur pemahaman mendalam, konsep inti (core concepts), dan problem-solving, bukan sekadar hafalan rumus atau teks kaku."
      },
      {
        name: "Joyful (Menyenangkan)",
        desc: "Menciptakan kesenangan intrinsik dalam belajar melalui eksperimen, permainan kognitif, diskusi inklusif, tanpa ada rasa takut ditertawakan atau dihakimi."
      }
    ]
  },
  kbc: {
    title: "Kurikulum Berbasis Cinta (KBC)",
    desc: "Pendekatan pendidikan yang meletakkan rasa kasih sayang (Rahmah), penerimaan tanpa syarat, dan rasa aman emosional sebagai fondasi belajar.",
    principles: [
      {
        name: "Sentuhan Humanis & Empati (Bonding)",
        desc: "Guru memanggil nama siswa dengan hangat, mendengarkan keluh kesah mereka secara aktif (active listening), serta memberi ruang bagi suara (voice) dan pilihan (choice) mereka."
      },
      {
        name: "Lingkungan Aman (Safe Space)",
        desc: "Kelas bebas dari intimidasi, hukuman yang merendahkan, atau labeling negatif. Kesalahan dipandang sebagai tangga emas proses belajar yang patut dirayakan dengan restitusi bijak."
      },
      {
        name: "Positive Reinforcement (Penguatan Positif)",
        desc: "Guru memuji ketekunan, kejujuran, dan usaha keras siswa daripada sekadar hasil akhir numerik, menumbuhkan pola pikir berkembang (growth mindset)."
      }
    ]
  }
};

export const KELAS_OPTIONS = [
  "RA/PAUD",
  "Kelas 1",
  "Kelas 2",
  "Kelas 3",
  "Kelas 4",
  "Kelas 5",
  "Kelas 6",
  "Kelas 7",
  "Kelas 8",
  "Kelas 9",
  "Kelas 10",
  "Kelas 11",
  "Kelas 12"
];

export const FASE_TO_KELAS_MAP: Record<string, string[]> = {
  "RA": ["RA/PAUD"],
  "Fase A": ["Kelas 1", "Kelas 2"],
  "Fase B": ["Kelas 3", "Kelas 4"],
  "Fase C": ["Kelas 5", "Kelas 6"],
  "Fase D": ["Kelas 7", "Kelas 8", "Kelas 9"],
  "Fase E": ["Kelas 10"],
  "Fase F": ["Kelas 11", "Kelas 12"]
};

export const INITIAL_PARAMS = {
  madrasah: "",
  namaGuru: "",
  jenjang: "MI (Madrasah Ibtidaiyah)",
  mataPelajaran: "Bahasa Inggris",
  semester: "Ganjil",
  tahunAjaran: "2026 / 2027",
  babTema: "",
  subBab: "",
  fase: "Fase B",
  kelas: "Kelas 3",
  alokasiWaktu: "2 x 35 Menit",
  bukuRujukan: "",
  catatanKhusus: "",
  metodePembelajaran: ["Diskusi Kelompok Aktif (Active Group Discussion)"],
  p2raPilihan: ["Ta'addub (Berkeadaban)", "Qudwah (Keteladanan)"],
  pancacintaPilihan: ["Cinta kepada Allah Swt. / Sang Pencipta"],
  geminiApiKey: ""
};

export function getMataPelajaranOptions(jenjang: string, fase: string, kelas: string): string[] {
  // If RA
  if (jenjang.includes("RA") || fase === "RA") {
    return [
      "Nilai Agama dan Budi Pekerti",
      "Jati Diri",
      "Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni"
    ];
  }

  const subjects: string[] = [];

  // PAI & Bahasa Arab (Khas Madrasah)
  subjects.push(
    "Al-Qur'an Hadis",
    "Akidah Akhlak",
    "Fikih",
    "Sejarah Kebudayaan Islam (SKI)",
    "Bahasa Arab"
  );

  // MAPK/MAK/MA keagamaan tambahan
  if (jenjang.includes("MA") || jenjang.includes("MAK")) {
    subjects.push(
      "Ilmu Tafsir",
      "Ilmu Hadis",
      "Ushul Fikih",
      "Ilmu Kalam",
      "Bahasa Arab Tingkat Lanjut"
    );
  }

  // National/General subjects depending on Jenjang & Kelas
  if (jenjang.includes("MI")) {
    subjects.push(
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Pancasila",
      "Bahasa Indonesia",
      "Matematika",
      "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Seni dan Budaya",
      "Bahasa Inggris"
    );
  } else if (jenjang.includes("MTs")) {
    subjects.push(
      "Pendidikan Pancasila",
      "Bahasa Indonesia",
      "Matematika",
      "Ilmu Pengetahuan Alam (IPA)",
      "Ilmu Pengetahuan Sosial (IPS)",
      "Bahasa Inggris",
      "Informatika",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Seni dan Budaya"
    );
  } else if (jenjang.includes("MA") || jenjang.includes("MAK")) {
    subjects.push(
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Pancasila",
      "Bahasa Indonesia",
      "Matematika",
      "Bahasa Inggris"
    );

    // IPA and IPS are integrated in Class X
    if (kelas === "Kelas 10" || fase === "Fase E") {
      subjects.push(
        "Ilmu Pengetahuan Alam",
        "Ilmu Pengetahuan Sosial"
      );
    }

    subjects.push(
      "Sejarah",
      "Informatika",
      "Seni dan Budaya",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)"
    );
  }

  // Deduplicate
  return Array.from(new Set(subjects));
}

