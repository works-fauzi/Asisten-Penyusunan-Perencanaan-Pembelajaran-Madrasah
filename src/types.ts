export interface LessonPlanParams {
  madrasah: string;
  namaGuru: string;
  jenjang: string;
  mataPelajaran: string;
  babTema: string;
  fase: string;
  kelas: string;
  alokasiWaktu: string;
  bukuRujukan: string;
  catatanKhusus: string;
  metodePembelajaran: string[];
  p2raPilihan: string[];
  pancacintaPilihan: string[];
  geminiApiKey?: string;
}

export interface SavedLessonPlan {
  id: string;
  title: string;
  params: LessonPlanParams;
  markdownContent: string;
  createdAt: string;
}
