export interface LessonPlanParams {
  madrasah: string;
  namaGuru: string;
  jenjang: string;
  mataPelajaran: string;
  semester?: string;
  tahunAjaran?: string;
  babTema: string;
  subBab?: string;
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
  type?: 'modul' | 'lkpd';
  title: string;
  params: LessonPlanParams;
  markdownContent: string;
  lkpdContent?: string;
  createdAt: string;

  // Additional optional properties for direct property access
  typeDoc?: 'modul' | 'lkpd';
  judul?: string;
  matpel?: string;
  kelas?: string;
  fase?: string;
  jenjang?: string;
  tanggal?: string;
  content?: string;
}
