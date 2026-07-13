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
import { Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Book, Compass, Settings, Upload, X } from "lucide-react";

interface LessonPlanFormProps {
  onSubmit: (params: LessonPlanParams, file: File | null) => void;
  isGenerating: boolean;
}

export default function LessonPlanForm({ onSubmit, isGenerating }: LessonPlanFormProps) {
  const [params, setParams] = useState<LessonPlanParams>({ ...INITIAL_PARAMS });
  const [showP2RADesc, setShowP2RADesc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col text-left">
      {/* Dynamic Theme Header */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 shrink-0">
        <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-slate-800">Formulir Perencanaan</h2>
      </div>

      <div className="space-y-4">
        {/* Row 1: Nama Madrasah */}
        <div>
          <label id="lbl-madrasah" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Nama Madrasah
          </label>
          <input
            id="input-madrasah"
            type="text"
            name="madrasah"
            value={params.madrasah}
            onChange={handleChange}
            placeholder="Contoh: MTs Al-Iman 02 Bulus"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Row 2: Nama Guru */}
        <div>
          <label id="lbl-guru" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Nama Guru
          </label>
          <input
            id="input-guru"
            type="text"
            name="namaGuru"
            value={params.namaGuru}
            onChange={handleChange}
            placeholder="Contoh: Achmad Fauzi, S.S."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Row 3, 4, 5: Jenjang, Fase & Kelas (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label id="lbl-jenjang" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Jenjang
            </label>
            <select
              id="select-jenjang"
              name="jenjang"
              value={params.jenjang}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer"
            >
              {JENJANG_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-fase" className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-between">
              Fase
              <span className="text-[10px] text-sky-600 lowercase bg-sky-50 px-1.5 py-0.5 rounded font-normal">
                auto-fase
              </span>
            </label>
            <select
              id="select-fase"
              name="fase"
              value={params.fase}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer"
            >
              {FASE_OPTIONS.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label id="lbl-kelas" className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-between">
              Kelas
              <span className="text-[10px] text-amber-600 lowercase bg-amber-50 px-1.5 py-0.5 rounded font-normal">
                auto-kelas
              </span>
            </label>
            <select
              id="select-kelas"
              name="kelas"
              value={params.kelas}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
            >
              {(FASE_TO_KELAS_MAP[params.fase] || KELAS_OPTIONS).map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 6: Mata Pelajaran */}
        <div>
          <label id="lbl-mapel" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Mata Pelajaran
          </label>
          <select
            id="select-mapel"
            name="mataPelajaran"
            value={params.mataPelajaran}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all cursor-pointer"
            required
          >
            {getMataPelajaranOptions(params.jenjang, params.fase, params.kelas).map((subj, idx) => (
              <option key={idx} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {/* Row 7, 8: Alokasi Waktu & Bab/Tema Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label id="lbl-alokasi" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Alokasi Waktu
            </label>
            <input
              id="input-alokasi"
              type="text"
              name="alokasiWaktu"
              value={params.alokasiWaktu}
              onChange={handleChange}
              placeholder="Contoh: 2 x 35 menit"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label id="lbl-babtema" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Bab / Tema Utama
            </label>
            <input
              id="input-babtema"
              type="text"
              name="babTema"
              value={params.babTema}
              onChange={handleChange}
              placeholder="Misal: Chapter 1: Exploring Fauna of Indonesia"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400"
              required
            />
          </div>
        </div>

        {/* Row 9: Fokus KBC Pancacinta */}
        <div>
          <label id="lbl-pancacinta" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Fokus KBC Pancacinta (Pilih satu atau lebih)
          </label>
          <div className="flex flex-wrap gap-2 mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {PANCACINTA_PRESETS.map((p, idx) => {
              const isSelected = params.pancacintaPilihan?.includes(p);
              return (
                <button
                  key={idx}
                  type="button"
                  id={`btn-pancacinta-${idx}`}
                  onClick={() => handleTogglePancacinta(p)}
                  className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-200 text-left flex items-center gap-2 ${
                    isSelected
                      ? "bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-500/15"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-rose-200"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[10px] transition-all ${
                    isSelected ? "bg-white border-white text-rose-600" : "bg-slate-50 border-slate-200 text-transparent"
                  }`}>
                    ✓
                  </span>
                  {p}
                </button>
              );
            })}
          </div>
          {(!params.pancacintaPilihan || params.pancacintaPilihan.length === 0) && (
            <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu pilar Pancacinta.
            </p>
          )}
        </div>

        {/* Row 10: Fokus Karakter Rahmatan Lil Alamin (P2RA) */}
        <div>
          <label id="lbl-p2ra" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Fokus Karakter Rahmatan Lil Alamin (P2RA) (Pilih satu atau lebih)
          </label>
          <div className="flex flex-wrap gap-2 mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {P2RA_VALUES.map((val, idx) => {
              const isSelected = params.p2raPilihan?.includes(val.name);
              return (
                <button
                  key={idx}
                  type="button"
                  id={`btn-p2ra-${idx}`}
                  onClick={() => handleToggleP2RA(val.name)}
                  className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-200 text-left flex items-center gap-2 ${
                    isSelected
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/15"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[10px] transition-all ${
                    isSelected ? "bg-white border-white text-emerald-600" : "bg-slate-50 border-slate-200 text-transparent"
                  }`}>
                    ✓
                  </span>
                  {val.name}
                </button>
              );
            })}
          </div>
          {(!params.p2raPilihan || params.p2raPilihan.length === 0) && (
            <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu pilar P2RA.
            </p>
          )}

          {/* Quick info panel for selected P2RA(s) */}
          {(() => {
            const selectedVals = P2RA_VALUES.filter(v => params.p2raPilihan?.includes(v.name));
            if (selectedVals.length === 0) return null;
            return (
              <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-200/50 pb-1.5">
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Definisi P2RA yang Terpilih:</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedVals.map((val, idx) => (
                    <div key={idx} className="text-[11px] text-emerald-800 leading-normal">
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
          <label id="lbl-metode" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Metode Pembelajaran Utama (Pilih satu atau lebih)
          </label>
          <div className="flex flex-wrap gap-2 mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {METODE_PEMBELAJARAN_PRESETS.map((m, idx) => {
              const isSelected = params.metodePembelajaran.includes(m);
              return (
                <button
                  key={idx}
                  type="button"
                  id={`btn-metode-${idx}`}
                  onClick={() => handleToggleMethod(m)}
                  className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-200 text-left flex items-center gap-2 ${
                    isSelected
                      ? "bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-500/15"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[10px] transition-all ${
                    isSelected ? "bg-white border-white text-sky-600" : "bg-slate-50 border-slate-200 text-transparent"
                  }`}>
                    ✓
                  </span>
                  {m}
                </button>
              );
            })}
          </div>
          {params.metodePembelajaran.length === 0 && (
            <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Harap pilih minimal satu metode pembelajaran.
            </p>
          )}
        </div>

        {/* Row 12: Buku Rujukan Utama */}
        <div>
          <label id="lbl-rujukan" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Buku Rujukan Utama
          </label>
          <input
            id="input-rujukan"
            type="text"
            name="bukuRujukan"
            value={params.bukuRujukan}
            onChange={handleChange}
            placeholder="Misal: English for Nusantara Kelas IX Kemendikbud (2022)"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 mb-2.5"
          />

          {/* Combined drag-and-drop file upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              isDragOver
                ? "border-sky-500 bg-sky-50/50"
                : file
                ? "border-emerald-500 bg-emerald-50/20"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
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
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                <div className="flex items-center gap-2 text-left">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                    <Book className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-[280px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
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
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
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
                <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
                <span className="text-xs font-semibold text-sky-600 hover:text-sky-700 block mb-1">
                  Unggah Dokumen Buku Rujukan (.pdf / .docx)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Maksimal ukuran file 5 MB (Opsional)
                </span>
              </label>
            )}

            {fileError && (
              <p className="text-[10px] text-red-500 font-medium mt-1.5 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {fileError}
              </p>
            )}
          </div>
        </div>

        {/* Row 12.5: Token API Gemini */}
        <div>
          <label id="lbl-gemini-api-key" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Token API Gemini
          </label>
          <input
            id="input-gemini-api-key"
            type="password"
            name="geminiApiKey"
            value={params.geminiApiKey || ""}
            onChange={handleChange}
            placeholder="Masukkan API Key Gemini Anda..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 mb-1.5"
          />
          <p className="text-xs text-slate-500">
            Belum memiliki Token API? Klik{" "}
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700 hover:underline font-medium"
            >
              di sini
            </a>{" "}
            untuk membuat Token API Gemini Anda secara gratis.
          </p>
        </div>

        {/* Row 13: Catatan Khusus */}
        <div>
          <label id="lbl-catatan" className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center gap-1">
            Catatan Khusus Belajar Kelas
            <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
          </label>
          <textarea
            id="textarea-catatan"
            name="catatanKhusus"
            value={params.catatanKhusus}
            onChange={handleChange}
            rows={3}
            placeholder="Misal: Kelas sangat aktif, 3 murid membutuhkan bimbingan lambat..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            id="btn-form-reset"
            onClick={resetForm}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Reset Form
          </button>
          <button
            type="submit"
            id="btn-form-submit"
            disabled={isGenerating}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm select-none cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Menganalisis Kurikulum..." : "Generate Modul AI"}
          </button>
        </div>
      </div>
    </form>
  );
}
