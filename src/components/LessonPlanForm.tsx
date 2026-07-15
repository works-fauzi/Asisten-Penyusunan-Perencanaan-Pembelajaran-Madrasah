import React, { useState, useEffect } from "react";
import { LessonPlanParams } from "../types";
import {
  JENJANG_OPTIONS,
  FASE_OPTIONS,
  KELAS_OPTIONS,
  FASE_TO_KELAS_MAP,
  MATA_PELAJARAN_PRESETS,
  getMataPelajaranOptions,
  P2RA_VALUES,
  METODE_PEMBELAJARAN_PRESETS,
  PANCACINTA_PRESETS,
  INITIAL_PARAMS
} from "../data";
import { Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Book, Compass, Settings, Upload, X, ChevronDown, ChevronUp } from "lucide-react";

interface LessonPlanFormProps {
  onSubmit: (params: LessonPlanParams, file: File | null) => void;
  isGenerating: boolean;
  setNotifications?: React.Dispatch<React.SetStateAction<Array<{
    id: number | string;
    type: "info" | "success" | "error" | "loading";
    message: string;
    time: string;
  }>>>;
}

export default function LessonPlanForm({ onSubmit, isGenerating, setNotifications }: LessonPlanFormProps) {
  const [params, setParams] = useState<LessonPlanParams>({ ...INITIAL_PARAMS });
  const [showP2RADesc, setShowP2RADesc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Keep track of last checked API key to avoid double-checking
  const lastVerifiedKey = React.useRef<string>("");

  useEffect(() => {
    const key = params.geminiApiKey?.trim();
    if (!key || key === "" || key === lastVerifiedKey.current) {
      return;
    }

    // Only attempt validation if the key is at least 15 chars (to avoid validating incomplete keys)
    if (key.length < 15) {
      return;
    }

    const timer = setTimeout(async () => {
      lastVerifiedKey.current = key;
      const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // 1. Saat Pengecekan Dimulai:
      // Tepat sebelum melakukan fetch ke API Google, tambahkan sebuah notifikasi baru tipe info ke dalam array
      const startId = Date.now();
      const newLoadingNotif = {
        id: startId,
        type: "info" as const,
        message: "Memverifikasi Token API Gemini...",
        time: timeString
      };
      if (setNotifications) {
        setNotifications(prev => [newLoadingNotif, ...prev]);
      }

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const resTimeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (response.ok) {
          // 2. Jika API Key Valid (Respons Sukses / HTTP 200):
          // Tambahkan notifikasi sukses ke dalam array
          const newSuccessNotif = {
            id: Date.now(),
            type: "success" as const,
            message: "Koneksi Berhasil! Token API Gemini valid dan aktif.",
            time: resTimeString
          };
          if (setNotifications) {
            setNotifications(prev => [newSuccessNotif, ...prev]);
          }
        } else {
          // 3. Jika API Key Invalid atau Terjadi Error (Catch Block / HTTP Fail):
          // Tangkap pesan error dari respons Google (jika ada), lalu tambahkan notifikasi error ke dalam array
          let customErrorMessage = "Gagal memverifikasi API Key. Pastikan kunci benar atau periksa batasan CORS Anda.";
          try {
            const data = await response.json();
            if (data?.error?.message) {
              customErrorMessage = `Gagal memverifikasi API Key. Pastikan kunci benar atau periksa batasan CORS Anda. Detail: ${data.error.message}`;
            }
          } catch (_) {
            // Keep original message if JSON parsing fails
          }

          const newErrorNotif = {
            id: Date.now(),
            type: "error" as const,
            message: customErrorMessage,
            time: resTimeString
          };
          if (setNotifications) {
            setNotifications(prev => [newErrorNotif, ...prev]);
          }
        }
      } catch (err: any) {
        const resTimeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newErrorNotif = {
          id: Date.now(),
          type: "error" as const,
          message: "Gagal memverifikasi API Key. Pastikan kunci benar atau periksa batasan CORS Anda.",
          time: resTimeString
        };
        if (setNotifications) {
          setNotifications(prev => [newErrorNotif, ...prev]);
        }
      }
    }, 1200); // 1.2s debounce to avoid checking while typing

    return () => clearTimeout(timer);
  }, [params.geminiApiKey, setNotifications]);

  // States for accordion panels
  const [isKbcOpen, setIsKbcOpen] = useState(false);
  const [isP2raOpen, setIsP2raOpen] = useState(false);
  const [isMetodeOpen, setIsMetodeOpen] = useState(false);

  // Auto-fase and Auto-kelas assignment helper
  useEffect(() => {
    let targetFase = params.fase;
    if (params.jenjang.includes("RA")) {
      targetFase = "RA";
    } else if (params.jenjang.includes("MTs")) {
      targetFase = "Fase D";
    } else if (params.jenjang.includes("MA")) {
      if (params.fase !== "Fase E" && params.fase !== "Fase F") {
        targetFase = "Fase E";
      }
    } else if (params.jenjang.includes("MI")) {
      if (params.fase !== "Fase A" && params.fase !== "Fase B" && params.fase !== "Fase C") {
        targetFase = "Fase B";
      }
    }

    // Determine target kelas based on targetFase
    const allowedKelas = FASE_TO_KELAS_MAP[targetFase] || [];
    let targetKelas = params.kelas;
    if (allowedKelas.length > 0 && !allowedKelas.includes(params.kelas)) {
      targetKelas = allowedKelas[0];
    }

    setParams(prev => ({
      ...prev,
      fase: targetFase,
      kelas: targetKelas
    }));
  }, [params.jenjang, params.fase]);

  // Auto-subject validation effect
  useEffect(() => {
    const validOptions = getMataPelajaranOptions(params.jenjang, params.fase, params.kelas);
    if (validOptions.length > 0 && !validOptions.includes(params.mataPelajaran)) {
      setParams(prev => ({ ...prev, mataPelajaran: validOptions[0] }));
    }
  }, [params.jenjang, params.fase, params.kelas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handlePresetSubject = (subj: string) => {
    setParams(prev => ({ ...prev, mataPelajaran: subj }));
  };

  const handleToggleMethod = (method: string) => {
    setParams(prev => {
      const current = prev.metodePembelajaran || [];
      const updated = current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method];
      return { ...prev, metodePembelajaran: updated };
    });
  };

  const handleTogglePancacinta = (pilar: string) => {
    setParams(prev => {
      const current = prev.pancacintaPilihan || [];
      const updated = current.includes(pilar)
        ? current.filter(p => p !== pilar)
        : [...current, pilar];
      return { ...prev, pancacintaPilihan: updated };
    });
  };

  const handleToggleP2RA = (p2raName: string) => {
    setParams(prev => {
      const current = prev.p2raPilihan || [];
      const updated = current.includes(p2raName)
        ? current.filter(p => p !== p2raName)
        : [...current, p2raName];
      return { ...prev, p2raPilihan: updated };
    });
  };

  const handleFileChange = (selectedFile: File) => {
    setFileError(null);

    // Validate size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileError("Ukuran file melebihi batas maksimal 5 MB.");
      return;
    }

    // Validate type/extension
    const fileExt = selectedFile.name.toLowerCase().split('.').pop();
    const isDoc = fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc';
    if (!isDoc) {
      setFileError("Format file tidak didukung. Harap unggah format PDF atau DOCX.");
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params, file);
  };

  const resetForm = () => {
    setParams({ ...INITIAL_PARAMS, madrasah: "", namaGuru: "", babTema: "", bukuRujukan: "", catatanKhusus: "", geminiApiKey: "" });
    setFile(null);
    setFileError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col text-left transition-colors duration-200 xl:h-full xl:max-h-full xl:overflow-hidden">
      {/* Dynamic Theme Header */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 shrink-0">
        <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Formulir Perencanaan</h2>
      </div>

      <div className="space-y-4 xl:flex-1 xl:overflow-y-auto pr-1">
        {/* Row 1: Nama Madrasah */}
        <div>
          <label id="lbl-madrasah" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Nama Madrasah
          </label>
          <input
            id="input-madrasah"
            type="text"
            name="madrasah"
            value={params.madrasah}
            onChange={handleChange}
            placeholder="Contoh: MTs Al-Iman 02 Bulus"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Row 2: Nama Guru */}
        <div>
          <label id="lbl-guru" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Nama Guru
          </label>
          <input
            id="input-guru"
            type="text"
            name="namaGuru"
            value={params.namaGuru}
            onChange={handleChange}
            placeholder="Contoh: Achmad Fauzi, S.S."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Row 3, 4, 5: Jenjang, Fase & Kelas (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label id="lbl-jenjang" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Jenjang
            </label>
            <select
              id="select-jenjang"
              name="jenjang"
              value={params.jenjang}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
            >
              {JENJANG_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-fase" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
              Fase
              <span className="text-[10px] text-sky-600 dark:text-sky-400 lowercase bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded font-normal">
                auto-fase
              </span>
            </label>
            <select
              id="select-fase"
              name="fase"
              value={params.fase}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
            >
              {FASE_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-kelas" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
              Kelas
              <span className="text-[10px] text-amber-600 dark:text-amber-400 lowercase bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-normal">
                auto-kelas
              </span>
            </label>
            <select
              id="select-kelas"
              name="kelas"
              value={params.kelas}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
            >
              {(FASE_TO_KELAS_MAP[params.fase] || KELAS_OPTIONS).map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 6: Mata Pelajaran */}
        <div>
          <label id="lbl-mapel" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Mata Pelajaran
          </label>
          <select
            id="select-mapel"
            name="mataPelajaran"
            value={params.mataPelajaran}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
            required
          >
            {getMataPelajaranOptions(params.jenjang, params.fase, params.kelas).map((subj, idx) => (
              <option key={idx} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {/* Row 6.5: Semester & Tahun Ajaran */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label id="lbl-semester" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Semester
            </label>
            <select
              id="select-semester"
              name="semester"
              value={params.semester || "Ganjil"}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
              required
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label id="lbl-tahun-ajaran" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Tahun Ajaran
            </label>
            <select
              id="select-tahun-ajaran"
              name="tahunAjaran"
              value={params.tahunAjaran || "2026 / 2027"}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer text-slate-900 dark:text-slate-100 dark:[&>option]:bg-slate-800"
              required
            >
              <option value="2026 / 2027">2026 / 2027</option>
              <option value="2027 / 2028">2027 / 2028</option>
              <option value="2028 / 2029">2028 / 2029</option>
              <option value="2029 / 2030">2029 / 2030</option>
              <option value="2030 / 2031">2030 / 2031</option>
            </select>
          </div>
        </div>

        {/* Row 7, 8: Alokasi Waktu & Bab/Tema Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label id="lbl-alokasi" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Alokasi Waktu
            </label>
            <input
              id="input-alokasi"
              type="text"
              name="alokasiWaktu"
              value={params.alokasiWaktu}
              onChange={handleChange}
              placeholder="Contoh: 2 x 35 menit"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label id="lbl-babtema" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Bab / Tema Utama
            </label>
            <input
              id="input-babtema"
              type="text"
              name="babTema"
              value={params.babTema}
              onChange={handleChange}
              placeholder="Contoh: Chapter 1: Exploring Fauna of Indonesia"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
              required
            />
          </div>
        </div>

        {/* Row 8.5: Sub Bab Pengembangan */}
        <div>
          <label id="lbl-subbab" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Sub Bab Pengembangan
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal lowercase ml-1">(opsional)</span>
          </label>
          <input
            id="input-subbab"
            type="text"
            name="subBab"
            value={params.subBab || ""}
            onChange={handleChange}
            placeholder="Contoh: Pengertian, Nama Lain, Macam-Macam, Tanda-Tanda, Alam Gaib"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Row 9: Fokus KBC Pancacinta */}
        <div>
          <button
            type="button"
            id="lbl-pancacinta"
            onClick={() => setIsKbcOpen(!isKbcOpen)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left uppercase"
          >
            <span>Fokus KBC Pancacinta{params.pancacintaPilihan && params.pancacintaPilihan.length > 0 ? ` (${params.pancacintaPilihan.length} Terpilih)` : ""}</span>
            {isKbcOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          
          {isKbcOpen && (
            <div className="grid grid-cols-1 gap-1.5 mt-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
              {PANCACINTA_PRESETS.map((p, idx) => {
                const isSelected = params.pancacintaPilihan?.includes(p);
                return (
                  <button
                    key={idx}
                    type="button"
                    id={`btn-pancacinta-${idx}`}
                    onClick={() => handleTogglePancacinta(p)}
                    className={`text-xs md:text-[13px] font-medium py-1.5 px-3 rounded-lg border transition-all duration-200 text-left cursor-pointer whitespace-nowrap flex items-center gap-3 w-full ${
                      isSelected
                        ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-850"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] transition-all shrink-0 ${
                      isSelected ? "bg-white border-white text-rose-600 font-bold" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-transparent"
                    }`}>
                      ✓
                    </span>
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          )}
          {(!params.pancacintaPilihan || params.pancacintaPilihan.length === 0) && (
            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu pilar Pancacinta.
            </p>
          )}
        </div>

        {/* Row 10: Fokus Karakter Rahmatan Lil Alamin (P2RA) */}
        <div>
          <button
            type="button"
            id="lbl-p2ra"
            onClick={() => setIsP2raOpen(!isP2raOpen)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left uppercase"
          >
            <span>Fokus Karakter Rahmatan Lil Alamin (P2RA){params.p2raPilihan && params.p2raPilihan.length > 0 ? ` (${params.p2raPilihan.length} Terpilih)` : ""}</span>
            {isP2raOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          
          {isP2raOpen && (
            <div className="grid grid-cols-1 gap-1.5 mt-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
              {P2RA_VALUES.map((val, idx) => {
                const isSelected = params.p2raPilihan?.includes(val.name);
                return (
                  <button
                    key={idx}
                    type="button"
                    id={`btn-p2ra-${idx}`}
                    onClick={() => handleToggleP2RA(val.name)}
                    className={`text-xs md:text-[13px] font-medium py-1.5 px-3 rounded-lg border transition-all duration-200 text-left cursor-pointer whitespace-nowrap flex items-center gap-3 w-full ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-850"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] transition-all shrink-0 ${
                      isSelected ? "bg-white border-white text-emerald-600 font-bold" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-transparent"
                    }`}>
                      ✓
                    </span>
                    <span>{val.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {(!params.p2raPilihan || params.p2raPilihan.length === 0) && (
            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu pilar P2RA.
            </p>
          )}

          {/* Quick info panel for selected P2RA(s) */}
          {(() => {
            const selectedVals = P2RA_VALUES.filter(v => params.p2raPilihan?.includes(v.name));
            if (selectedVals.length === 0) return null;
            return (
              <div className="mt-1.5 mb-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-200/50 dark:border-emerald-900/40 pb-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Definisi P2RA yang Terpilih:</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {selectedVals.map((val, idx) => (
                    <div key={idx} className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      <strong>{val.name}:</strong> {val.desc}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Row 11: Metode Pembelajaran Utama */}
        <div>
          <button
            type="button"
            id="lbl-metode"
            onClick={() => setIsMetodeOpen(!isMetodeOpen)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left uppercase"
          >
            <span>Metode Pembelajaran Utama{params.metodePembelajaran.length > 0 ? ` (${params.metodePembelajaran.length} Terpilih)` : ""}</span>
            {isMetodeOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          
          {isMetodeOpen && (
            <div className="grid grid-cols-1 gap-1.5 mt-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
              {METODE_PEMBELAJARAN_PRESETS.map((m, idx) => {
                const isSelected = params.metodePembelajaran.includes(m);
                return (
                  <button
                    key={idx}
                    type="button"
                    id={`btn-metode-${idx}`}
                    onClick={() => handleToggleMethod(m)}
                    className={`text-xs md:text-[13px] font-medium py-1.5 px-3 rounded-lg border transition-all duration-200 text-left cursor-pointer whitespace-nowrap flex items-center gap-3 w-full ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-850"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] transition-all shrink-0 ${
                      isSelected ? "bg-white border-white text-sky-600 font-bold" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-transparent"
                    }`}>
                      ✓
                    </span>
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>
          )}
          {params.metodePembelajaran.length === 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu metode pembelajaran.
            </p>
          )}
        </div>

        {/* Row 12: Buku Rujukan Utama */}
        <div>
          <label id="lbl-rujukan" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Buku Rujukan Utama
          </label>
          <input
            id="input-rujukan"
            type="text"
            name="bukuRujukan"
            value={params.bukuRujukan}
            onChange={handleChange}
            placeholder="Contoh: English for Nusantara Kelas IX Kemendikbud (2022)"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 mb-2.5"
          />

          {/* Combined drag-and-drop file upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              isDragOver
                ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                : file
                ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/30 dark:bg-slate-900/20"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleFileChange(files[0]);
              }
            }}
          >
            {file ? (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                <div className="flex items-center gap-2 text-left">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-300">
                    <Book className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[280px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF/DOCX terlampir
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileChange(files[0]);
                    }
                  }}
                />
                <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-400 dark:text-slate-500" />
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 block mb-1">
                  Unggah Dokumen Buku Rujukan (.pdf / .docx)
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  Maksimal ukuran file 5 MB (Opsional)
                </span>
              </label>
            )}

            {fileError && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {fileError}
              </p>
            )}
          </div>
        </div>

        {/* Row 13: Catatan Khusus */}
        <div>
          <label id="lbl-catatan" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">
            Catatan Khusus Belajar Kelas
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal lowercase">(opsional)</span>
          </label>
          <textarea
            id="textarea-catatan"
            name="catatanKhusus"
            value={params.catatanKhusus}
            onChange={handleChange}
            rows={3}
            placeholder="Contoh: Kelas sangat aktif, 3 murid membutuhkan bimbingan lambat..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 resize-none"
          />
        </div>

        {/* Row 12.5: Token API Gemini */}
        <div>
          <label id="lbl-gemini-api-key" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
            Token API Gemini <span className="text-rose-500 font-bold">* (Wajib Diisi)</span>
          </label>
          <input
            id="input-gemini-api-key"
            type="password"
            name="geminiApiKey"
            value={params.geminiApiKey || ""}
            onChange={handleChange}
            required
            placeholder="Masukkan API Key Gemini Anda..."
            className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 mb-1.5 ${
              !params.geminiApiKey || !params.geminiApiKey.trim()
                ? "border-rose-300 dark:border-rose-900 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-200 dark:border-slate-700 focus:border-sky-500"
            }`}
          />
          {(!params.geminiApiKey || !params.geminiApiKey.trim()) && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Token API Gemini wajib diisi untuk mengaktifkan tombol Generate.
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Belum memiliki Token API? Klik{" "}
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline font-medium"
            >
              di sini
            </a>{" "}
            untuk membuat Token API Gemini Anda secara gratis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            id="btn-form-reset"
            onClick={resetForm}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            Reset Form
          </button>
          <button
            type="submit"
            id="btn-form-submit"
            disabled={isGenerating || !params.geminiApiKey || !params.geminiApiKey.trim()}
            className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Menganalisis Kurikulum..." : "Generate Modul AI"}
          </button>
        </div>
      </div>
    </form>
  );
}
