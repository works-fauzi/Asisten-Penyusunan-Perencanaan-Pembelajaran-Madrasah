import React, { useState, useEffect, useMemo } from "react";
import { LessonPlanParams, SavedLessonPlan } from "../types";
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
import { Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Book, Compass, Settings, Upload, X, ChevronDown, ChevronUp, Check, FileText } from "lucide-react";

interface LessonPlanFormProps {
  onSubmit: (params: LessonPlanParams, file: File | null) => void;
  isGenerating: boolean;
  activePlan?: SavedLessonPlan | null;
  history?: SavedLessonPlan[];
  onSelectPlan?: (plan: SavedLessonPlan) => void;
  onGenerateLKPD?: (selectedModule: SavedLessonPlan, selectedPertemuan: string) => void;
  leftTab?: "form" | "lkpd";
  setLeftTab?: (tab: "form" | "lkpd") => void;
  onSelectCenterTab?: (tab: "preview" | "lkpd" | "riwayat") => void;
  setNotifications?: React.Dispatch<React.SetStateAction<Array<{
    id: number | string;
    type: "info" | "success" | "error" | "loading";
    message: string;
    time: string;
  }>>>;
}

export default function LessonPlanForm({
  onSubmit,
  isGenerating,
  activePlan,
  history,
  onSelectPlan,
  onGenerateLKPD,
  leftTab,
  setLeftTab,
  onSelectCenterTab,
  setNotifications
}: LessonPlanFormProps) {
  const [localLeftTab, setLocalLeftTab] = useState<"form" | "lkpd">("form");
  const activeLeftTab = leftTab ?? localLeftTab;

  const handleSetLeftTab = (tab: "form" | "lkpd") => {
    if (setLeftTab) {
      setLeftTab(tab);
    }
    setLocalLeftTab(tab);
  };

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(activePlan?.id || null);
  const [selectedPertemuan, setSelectedPertemuan] = useState<string>("Semua Pertemuan");

  useEffect(() => {
    if (activePlan && (!selectedModuleId || !history?.some(h => h.id === selectedModuleId))) {
      setSelectedModuleId(activePlan.id);
    }
  }, [activePlan, history]);

  // Reset selectedPertemuan when selectedModuleId changes
  useEffect(() => {
    setSelectedPertemuan("Semua Pertemuan");
  }, [selectedModuleId]);

  const selectedModule = (history || []).find(h => h.id === selectedModuleId) || (activePlan?.id === selectedModuleId ? activePlan : null);

  // Dynamic meeting options calculation
  const meetingOptions = useMemo(() => {
    if (!selectedModule) {
      return [{ value: "Semua Pertemuan", label: "Semua Pertemuan (Default)" }];
    }

    let count = 0;

    // 1. Direct properties
    const directCount = (selectedModule as any).jumlahPertemuan || (selectedModule as any).totalPertemuan || (selectedModule.params as any)?.jumlahPertemuan;
    if (typeof directCount === "number" && directCount > 0) {
      count = directCount;
    } else if (typeof directCount === "string" && !isNaN(parseInt(directCount, 10))) {
      count = parseInt(directCount, 10);
    }

    // 2. Try parsing alokasiWaktu (e.g. "2 JP (1 Pertemuan)", "4 JP (2 Pertemuan)", "3 Pertemuan", "6 JP")
    if (!count && selectedModule.params?.alokasiWaktu) {
      const match = selectedModule.params.alokasiWaktu.match(/(\d+)\s*pertemuan/i);
      if (match && match[1]) {
        count = parseInt(match[1], 10);
      }
    }

    // 3. Try parsing markdownContent for highest "Pertemuan X"
    if (!count && selectedModule.markdownContent) {
      const matches = Array.from(selectedModule.markdownContent.matchAll(/pertemuan\s*(\d+)/gi));
      if (matches.length > 0) {
        const numbers = matches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n) && n > 0 && n <= 10);
        if (numbers.length > 0) {
          count = Math.max(...numbers);
        }
      }
    }

    // 4. Fallback to default 3 meetings if not specifically detected
    if (!count || count < 1 || count > 10) {
      count = 3;
    }

    const options = [{ value: "Semua Pertemuan", label: "Semua Pertemuan (Default)" }];
    for (let i = 1; i <= count; i++) {
      options.push({ value: `Pertemuan ${i}`, label: `Pertemuan ${i}` });
    }

    return options;
  }, [selectedModule]);

  const handleResetLkpdForm = () => {
    setSelectedModuleId(null);
    setSelectedPertemuan("Semua Pertemuan");
  };

  const [params, setParams] = useState<LessonPlanParams>(() => {
    const savedApiKey = typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") : null;
    return {
      ...INITIAL_PARAMS,
      geminiApiKey: savedApiKey || INITIAL_PARAMS.geminiApiKey || ""
    };
  });

  // Sync geminiApiKey changes to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = params.geminiApiKey || "";
      if (key.trim()) {
        localStorage.setItem("gemini_api_key", key.trim());
      }
    }
  }, [params.geminiApiKey]);
  const [showP2RADesc, setShowP2RADesc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyVerifyStatus, setKeyVerifyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Keep track of last checked API key to avoid double-checking
  const lastVerifiedKey = React.useRef<string>("");

  const handleVerifyKey = async (customKeyToVerify?: string) => {
    const rawKey = customKeyToVerify ?? params.geminiApiKey ?? "";
    const cleanKey = rawKey.trim();

    if (!cleanKey) {
      setKeyVerifyStatus({
        type: "error",
        message: "API Key Gemini tidak diisi atau kosong!"
      });
      return;
    }

    setIsVerifyingKey(true);
    setKeyVerifyStatus(null);

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
      const verifyUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Hi" }]
            }
          ]
        })
      });

      if (response.ok) {
        const successMsg = "API Key Gemini valid dan aktif!";
        setKeyVerifyStatus({
          type: "success",
          message: successMsg
        });
        if (setNotifications) {
          setNotifications(prev => [
            {
              id: Date.now(),
              type: "success",
              message: "Koneksi Berhasil! API Key Gemini valid dan aktif.",
              time: timeString
            },
            ...prev
          ]);
        }
      } else {
        let errJson: any = null;
        try {
          errJson = await response.json();
          console.log("Error Detail:", errJson);
        } catch (e) {
          console.error("Error parsing Gemini verify response JSON:", e);
        }

        const failMsg = errJson?.error?.message || "API Key Gemini ditolak oleh Google. Pastikan kunci sudah diaktifkan di Google AI Studio.";
        setKeyVerifyStatus({
          type: "error",
          message: failMsg
        });
        if (setNotifications) {
          setNotifications(prev => [
            {
              id: Date.now(),
              type: "error",
              message: failMsg,
              time: timeString
            },
            ...prev
          ]);
        }
      }
    } catch (err: any) {
      console.error("Error verifying key:", err);
      const netMsg = "Gagal memverifikasi API Key Gemini ke Google. Periksa koneksi internet Anda.";
      setKeyVerifyStatus({
        type: "error",
        message: netMsg
      });
      if (setNotifications) {
        setNotifications(prev => [
          {
            id: Date.now(),
            type: "error",
            message: netMsg,
            time: timeString
          },
          ...prev
        ]);
      }
    } finally {
      setIsVerifyingKey(false);
    }
  };

  useEffect(() => {
    const rawKey = params.geminiApiKey || "";
    const cleanKey = rawKey.trim();
    if (!cleanKey || cleanKey === lastVerifiedKey.current) {
      return;
    }

    if (cleanKey.length < 10) {
      return;
    }

    const timer = setTimeout(() => {
      lastVerifiedKey.current = cleanKey;
      handleVerifyKey(cleanKey);
    }, 1200);

    return () => clearTimeout(timer);
  }, [params.geminiApiKey]);

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
    const rawKey = params.geminiApiKey || "";
    const cleanKey = rawKey.trim();

    if (!cleanKey) {
      setKeyVerifyStatus({
        type: "error",
        message: "API Key Gemini wajib diisi untuk mengaktifkan pembuat perencanaan pembelajaran."
      });
      return;
    }

    const cleanParams = {
      ...params,
      geminiApiKey: cleanKey
    };
    onSubmit(cleanParams, file);
  };

  const resetForm = () => {
    setParams({
      ...INITIAL_PARAMS,
      madrasah: "",
      namaGuru: "",
      babTema: "",
      bukuRujukan: "",
      catatanKhusus: "",
      geminiApiKey: params.geminiApiKey || localStorage.getItem("gemini_api_key") || ""
    });
    setFile(null);
    setFileError(null);
  };

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/70 shadow-sm dark:shadow-none p-4 sm:p-5 flex flex-col text-left transition-colors duration-200 h-auto lg:h-full overflow-hidden">
      {/* Top Left Column Tab Switcher */}
      <div className="flex bg-slate-100 dark:bg-[#0b1021] p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-3 flex-none shadow-xs">
        <button
          type="button"
          id="tab-left-form"
          onClick={() => handleSetLeftTab("form")}
          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeLeftTab === "form"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <span className="truncate">Modul Ajar</span>
        </button>
        <button
          type="button"
          id="tab-left-lkpd"
          onClick={() => handleSetLeftTab("lkpd")}
          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeLeftTab === "lkpd"
              ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
          }`}
        >
          <span className="truncate">Lembar Kerja Peserta Didik</span>
        </button>
      </div>

      {activeLeftTab === "form" ? (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Dynamic Theme Header */}
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2.5 flex-none">
            <div className="w-1.5 h-5 bg-sky-500 rounded-full"></div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Formulir Modul Ajar</h2>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto p-1.5 sm:p-2 custom-scrollbar">
        {/* Row 1: Nama Madrasah */}
        <div>
          <label id="lbl-madrasah" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Nama Madrasah
          </label>
          <input
            id="input-madrasah"
            type="text"
            name="madrasah"
            value={params.madrasah}
            onChange={handleChange}
            placeholder="Contoh: MTs Al-Iman 02 Bulus"
            className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Row 2: Nama Guru */}
        <div>
          <label id="lbl-guru" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Nama Guru
          </label>
          <input
            id="input-guru"
            type="text"
            name="namaGuru"
            value={params.namaGuru}
            onChange={handleChange}
            placeholder="Contoh: Achmad Fauzi, S.S."
            className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Row 3, 4, 5: Jenjang, Fase & Kelas (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label id="lbl-jenjang" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Jenjang
            </label>
            <select
              id="select-jenjang"
              name="jenjang"
              value={params.jenjang}
              onChange={handleChange}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
            >
              {JENJANG_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-fase" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
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
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
            >
              {FASE_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-kelas" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
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
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
            >
              {(FASE_TO_KELAS_MAP[params.fase] || KELAS_OPTIONS).map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 6: Mata Pelajaran */}
        <div>
          <label id="lbl-mapel" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Mata Pelajaran
          </label>
          <select
            id="select-mapel"
            name="mataPelajaran"
            value={params.mataPelajaran}
            onChange={handleChange}
            className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
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
            <label id="lbl-semester" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Semester
            </label>
            <select
              id="select-semester"
              name="semester"
              value={params.semester || "Ganjil"}
              onChange={handleChange}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
              required
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label id="lbl-tahun-ajaran" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tahun Ajaran
            </label>
            <select
              id="select-tahun-ajaran"
              name="tahunAjaran"
              value={params.tahunAjaran || "2026 / 2027"}
              onChange={handleChange}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800"
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
            <label id="lbl-alokasi" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Alokasi Waktu
            </label>
            <input
              id="input-alokasi"
              type="text"
              name="alokasiWaktu"
              value={params.alokasiWaktu}
              onChange={handleChange}
              placeholder="Contoh: 2 x 35 menit"
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label id="lbl-babtema" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Bab / Tema Utama
            </label>
            <input
              id="input-babtema"
              type="text"
              name="babTema"
              value={params.babTema}
              onChange={handleChange}
              placeholder="Contoh: Chapter 1: Exploring Fauna of Indonesia"
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        {/* Row 8.5: Sub Bab Pengembangan */}
        <div>
          <label id="lbl-subbab" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Sub Bab Pengembangan
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal lowercase ml-1">(opsional)</span>
          </label>
          <input
            id="input-subbab"
            type="text"
            name="subBab"
            value={params.subBab || ""}
            onChange={handleChange}
            placeholder="Contoh: Noun Groups, Possesive Adjectives, Passive Voice, dst..."
            className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Row 9: Fokus KBC Pancacinta */}
        <div>
          <button
            type="button"
            id="lbl-pancacinta"
            onClick={() => setIsKbcOpen(!isKbcOpen)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
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
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
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
            className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
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
          <label id="lbl-rujukan" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Buku Rujukan Utama
          </label>
          <input
            id="input-rujukan"
            type="text"
            name="bukuRujukan"
            value={params.bukuRujukan}
            onChange={handleChange}
            placeholder="Contoh: English for Nusantara Kelas IX Kemendikbud (2022)"
            className="w-full min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-2.5"
          />

          {/* Combined drag-and-drop file upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              isDragOver
                ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                : file
                ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                : "border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 text-slate-900 dark:bg-[#0b1021]/80 dark:text-slate-100"
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
                  className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Hapus file"
                >
                  <X className="w-5 h-5" />
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
          <label id="lbl-catatan" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
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
            className="w-full px-3 py-2 bg-slate-50 text-slate-900 border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Row 12.5: API Key Gemini */}
        <div>
          <label id="lbl-gemini-api-key" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            API Key Gemini
          </label>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              id="input-gemini-api-key"
              type="password"
              name="geminiApiKey"
              value={params.geminiApiKey || ""}
              onChange={(e) => {
                handleChange(e);
                setKeyVerifyStatus(null);
              }}
              required
              placeholder="Masukkan API Key Gemini Anda..."
              className={`flex-1 min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 dark:bg-[#0b1021]/80 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                !params.geminiApiKey || !params.geminiApiKey.trim()
                  ? "border-rose-300 dark:border-rose-900 focus:ring-rose-500/20"
                  : "border-slate-300 dark:border-slate-700/80 focus:ring-blue-500"
              }`}
            />
            <button
              type="button"
              id="btn-verify-gemini-key"
              onClick={() => handleVerifyKey()}
              disabled={isVerifyingKey || !params.geminiApiKey || !params.geminiApiKey.trim()}
              className="px-3.5 py-2.5 h-[44px] text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Uji apakah API Key aktif dan valid"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingKey ? "animate-spin" : ""}`} />
              {isVerifyingKey ? "Menguji..." : "Uji Key"}
            </button>
          </div>

          {keyVerifyStatus ? (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium mb-1.5 flex items-start gap-2 ${
                keyVerifyStatus.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {keyVerifyStatus.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{keyVerifyStatus.message}</span>
            </div>
          ) : params.geminiApiKey && params.geminiApiKey.trim() ? (
            <div className="p-2.5 rounded-lg text-xs font-medium mb-1.5 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1">API Key Gemini valid dan aktif!</span>
            </div>
          ) : (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> API Key Gemini wajib diisi untuk mengaktifkan tombol Generate.
            </p>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Belum punya API Key Gemini? Klik{" "}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline font-medium"
            >
              di sini
            </a>{" "}
            untuk membuat secara gratis.
          </p>
        </div>
      </div>

        {/* Action Buttons - Sticky on mobile bottom */}
        <div className="sticky bottom-2 z-10 bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md lg:static lg:bg-transparent lg:p-0 lg:border-none lg:shadow-none lg:backdrop-blur-none flex items-center gap-3 w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            id="btn-form-reset"
            onClick={resetForm}
            disabled={isGenerating}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 shadow-xs dark:shadow-none"
          >
            Reset Form
          </button>
          <button
            type="submit"
            id="btn-form-submit"
            disabled={isGenerating || !params.geminiApiKey || !params.geminiApiKey.trim()}
            className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center justify-center gap-2 border border-sky-600 dark:border-sky-500 disabled:bg-slate-200 dark:disabled:bg-slate-800/80 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px] shadow-xs"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Menganalisis Kurikulum..." : "Generate Modul"}
          </button>
        </div>
      </form>
      ) : (
        /* Form Tab Generate LKPD */
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2.5 flex-none">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Formulir Lembar Kerja Peserta Didik</h2>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto p-1.5 sm:p-2 custom-scrollbar text-xs sm:text-sm">
            {/* 1. LIST VIEW PEMILIHAN MODUL (DAFTAR PERENCANAAN) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Perencanaan Pembelajaran
                </label>
                {selectedModule && (
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                )}
              </div>

              {(() => {
                const modulHistory = (history || []).filter(plan => !plan.type || plan.type === 'modul');
                if (modulHistory.length === 0) {
                  return (
                    /* Empty State jika belum ada riwayat modul tersimpan */
                    <div className="p-4 bg-slate-50 dark:bg-[#0b1021]/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1.5">
                      <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Belum ada Modul Ajar tersimpan. Silakan buat perencanaan terlebih dahulu di tab Formulir Perencanaan.
                      </p>
                    </div>
                  );
                }

                return (
                  /* List View (Daftar Kartu Ringkas Modul Ajar) */
                  <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {modulHistory.map((plan) => {
                      const isSelected = selectedModuleId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          id={`card-module-${plan.id}`}
                          onClick={() => {
                            setSelectedModuleId(plan.id);
                            if (onSelectPlan) {
                              onSelectPlan(plan);
                            }
                          }}
                          className={`p-3 rounded-xl transition-all cursor-pointer border text-left relative ${
                            isSelected
                              ? "border-2 border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 dark:border-sky-400 shadow-xs ring-2 ring-sky-500/20"
                              : "border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#0b1021]/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/80 dark:hover:bg-[#0b1021]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {plan.params?.babTema || plan.title || plan.judul}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-sky-600 dark:text-sky-400">
                                  {plan.params?.mataPelajaran || plan.matpel || "Mata Pelajaran"}
                                </span>
                                <span>•</span>
                                <span>Kelas {plan.params?.kelas || plan.kelas || "-"}</span>
                                <span>•</span>
                                <span className="uppercase font-medium">{plan.params?.jenjang || plan.jenjang || "-"}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 2. DROPDOWN PILIH PERTEMUAN */}
            <div className="space-y-1.5 pt-1">
              <label id="lbl-pilih-pertemuan" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Pilih Pertemuan
              </label>
              <select
                id="select-pertemuan"
                value={selectedPertemuan}
                disabled={!selectedModule}
                onChange={(e) => setSelectedPertemuan(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-xl text-xs focus:ring-2 focus:ring-inset focus:ring-amber-500 focus:outline-none transition-all cursor-pointer dark:[&>option]:bg-slate-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {meetingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Gemini Section */}
            <div>
              <label id="lbl-api-key-lkpd" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                API Key Gemini
              </label>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  id="input-gemini-api-key-lkpd"
                  type="password"
                  name="geminiApiKey"
                  value={params.geminiApiKey || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setKeyVerifyStatus(null);
                  }}
                  required
                  placeholder="Masukkan API Key Gemini Anda..."
                  className={`flex-1 min-h-[44px] px-3 py-2 bg-slate-50 text-slate-900 dark:bg-[#0b1021]/80 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-inset focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    !params.geminiApiKey || !params.geminiApiKey.trim()
                      ? "border-rose-300 dark:border-rose-900 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-slate-700/80 focus:ring-amber-500"
                  }`}
                />
                <button
                  type="button"
                  id="btn-verify-gemini-key-lkpd"
                  onClick={() => handleVerifyKey()}
                  disabled={isVerifyingKey || !params.geminiApiKey || !params.geminiApiKey.trim()}
                  className="px-3.5 py-2.5 h-[44px] text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Uji apakah API Key aktif dan valid"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingKey ? "animate-spin" : ""}`} />
                  {isVerifyingKey ? "Menguji..." : "Uji Key"}
                </button>
              </div>

              {keyVerifyStatus ? (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium mb-1.5 flex items-start gap-2 ${
                    keyVerifyStatus.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {keyVerifyStatus.type === "success" ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1">{keyVerifyStatus.message}</span>
                </div>
              ) : params.geminiApiKey && params.geminiApiKey.trim() ? (
                <div className="p-2.5 rounded-lg text-xs font-medium mb-1.5 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="flex-1">API Key Gemini valid dan aktif!</span>
                </div>
              ) : (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> API Key Gemini wajib diisi untuk mengaktifkan tombol Generate.
                </p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Terhubung otomatis dengan Formulir Perencanaan. Belum punya API Key Gemini? Klik{" "}
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline font-medium"
                >
                  di sini
                </a>{" "}
                untuk membuat secara gratis.
              </p>
            </div>
          </div>

          {/* 3. ACTION BUTTONS (GENERATE LKPD & RESET FORM) */}
          <div className="sticky bottom-2 z-10 bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md lg:static lg:bg-transparent lg:p-0 lg:border-none lg:shadow-none lg:backdrop-blur-none flex items-center gap-3 w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              id="btn-reset-lkpd-form"
              onClick={handleResetLkpdForm}
              disabled={isGenerating}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center justify-center shrink-0 shadow-xs dark:shadow-none"
              title="Reset pilihan modul dan pertemuan"
            >
              Reset Form
            </button>

            <button
              type="button"
              id="btn-generate-lkpd-ai"
              disabled={!selectedModule || isGenerating || !params.geminiApiKey?.trim()}
              onClick={() => {
                if (!selectedModule || !params.geminiApiKey?.trim()) return;
                if (onSelectCenterTab) {
                  onSelectCenterTab("lkpd");
                }
                if (onGenerateLKPD) {
                  onGenerateLKPD(selectedModule, selectedPertemuan);
                }
              }}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center justify-center gap-2 border border-amber-600 dark:border-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-800/80 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px] shadow-xs"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              {isGenerating ? "Generasi LKPD AI..." : "Generate LKPD"}
            </button>
          </div>
          {!selectedModule && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium mt-1.5">
              ⚠️ Silakan pilih salah satu Perencanaan Pembelajaran di atas untuk mengaktifkan tombol Generate LKPD.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
