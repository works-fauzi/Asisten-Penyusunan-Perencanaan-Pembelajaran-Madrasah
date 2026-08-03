import { useState, useEffect } from "react";
import { SavedLessonPlan } from "../types";
import { exportToWord, parseMarkdownToHTML, copyFormattedHTMLToClipboard } from "../utils/exporter";
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  Edit2,
  Save,
  X,
  Info,
  BookOpen
} from "lucide-react";

interface LkpdPreviewProps {
  plan: SavedLessonPlan | null;
  isGenerating: boolean;
  onUpdatePlan: (updatedPlan: SavedLessonPlan) => void;
  addNotification?: (type: "info" | "success" | "error" | "loading", message: string) => void;
  onSwitchToLkpdTab?: () => void;
}

export default function LkpdPreview({
  plan,
  isGenerating,
  onUpdatePlan,
  addNotification,
  onSwitchToLkpdTab
}: LkpdPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (plan?.lkpdContent) {
      setEditedContent(plan.lkpdContent);
      setIsEditing(false);
    } else {
      setEditedContent("");
    }
  }, [plan]);

  const handleCopy = async () => {
    if (!plan?.lkpdContent) return;
    try {
      const contentToCopy = isEditing ? editedContent : plan.lkpdContent;
      await copyFormattedHTMLToClipboard(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (addNotification) {
        addNotification("success", "Teks LKPD (Rich Text/HTML) berhasil disalin ke clipboard.");
      }
    } catch (err) {
      console.error("Gagal menyalin LKPD:", err);
      if (addNotification) {
        addNotification("error", "Gagal menyalin teks LKPD.");
      }
    }
  };

  const handleSaveEdit = () => {
    if (!plan) return;
    const updated: SavedLessonPlan = {
      ...plan,
      lkpdContent: editedContent
    };
    onUpdatePlan(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (addNotification) {
      addNotification("success", "Perubahan LKPD berhasil disimpan.");
    }
  };

  const handleExport = () => {
    if (!plan || !plan.lkpdContent) return;
    const contentToExport = isEditing ? editedContent : plan.lkpdContent;
    const mataPelajaran = (plan.params?.mataPelajaran || "Pelajaran").replace(/\s+/g, "_");
    const namaBab = (plan.params?.babTema || plan.title || "Bab").replace(/\s+/g, "_");
    const kelas = (plan.params?.kelas || "Kelas").replace(/\s+/g, "");
    
    // Exact requested format: LKPD_[MataPelajaran]_[NamaBab]_[Kelas].docx
    const documentTitle = `LKPD_${mataPelajaran}_${namaBab}_${kelas}`;
    exportToWord(documentTitle, contentToExport, plan.params, 'lkpd');
    if (addNotification) {
      addNotification("success", `Dokumen ${documentTitle}.doc berhasil diekspor.`);
    }
  };

  if (isGenerating) {
    return (
      <div id="lkpd-loading" className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-sm dark:shadow-none p-8 text-center h-auto lg:h-full flex-1 min-h-[350px] lg:min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center space-y-6 transition-colors duration-200">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-100 dark:border-amber-900 border-t-amber-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Menyusun Lembar Kerja Peserta Didik (LKPD) AI...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Kecerdasan Buatan sedang merangkai LKPD berbasis Modul Ajar Rujukan, menyusun 
            <strong> Stimulus, Aktivitas Pembelajaran, Diagram Line-art SVG, dan Asesmen Sumatif</strong>.
          </p>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 text-left w-full max-w-sm space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Komponen LKPD yang Dibuat:
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 font-medium">
            <li>Identitas Dokumen & Petunjuk Kerja</li>
            <li>Apersepsi & Stimulus Kontekstual</li>
            <li>Aktivitas & Diagram Line-Art SVG Hitam-Putih</li>
            <li>Asesmen Sumatif (Ulangan Harian Sesuai Jenjang)</li>
            <li>Lampiran Pegangan Guru & Rubrik Penilaian</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!plan || !plan.lkpdContent) {
    return (
      <div id="lkpd-empty" className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-sm dark:shadow-none p-8 text-center h-auto lg:h-full flex-1 min-h-[350px] lg:min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center space-y-4 transition-colors duration-200">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl flex items-center justify-center text-amber-500 shadow-xs">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
            Belum Ada LKPD yang Digenerate
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {plan
              ? `Modul Ajar "${plan.title}" sedang aktif, tetapi Lembar Kerja Peserta Didik (LKPD) belum dibuat. Silakan buka tab "Generate LKPD" di sebelah kiri lalu klik tombol Generate LKPD AI.`
              : "Lembar Kerja Peserta Didik (LKPD) belum dibuat. Silakan buat Perencanaan terlebih dahulu di tab Formulir Perencanaan atau pilih draf dari Riwayat Tersimpan."}
          </p>
        </div>
        {onSwitchToLkpdTab && (
          <button
            type="button"
            onClick={onSwitchToLkpdTab}
            className="mt-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Buka Tab Formulir Generate LKPD
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="lkpd-active" className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/70 shadow-sm dark:shadow-none flex flex-col flex-1 h-auto lg:h-full overflow-hidden text-left text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Control Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex-none sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <span className="p-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {plan.params?.mataPelajaran || "Pelajaran"} - {plan.params?.babTema || plan.title}
            </h3>
            {(() => {
              const cleanFase = (plan.params?.fase || "").replace(/^(fase\s*)+/i, "").trim();
              const formattedFaseTitle = cleanFase ? (cleanFase.toUpperCase() === "RA" ? "Fase RA" : `Fase ${cleanFase}`) : "";
              const rawKelas = plan.params?.kelas || "-";
              const kelasDisplay = (rawKelas !== "-" && !/^\s*kelas/i.test(rawKelas)) ? `Kelas ${rawKelas}` : rawKelas;
              const jenjangStr = plan.params?.jenjang ? plan.params.jenjang.split(" ")[0] : "-";
              return (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                  {formattedFaseTitle ? `${formattedFaseTitle} • ` : ""}{kelasDisplay} • {jenjangStr}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                id="btn-save-edit-lkpd"
                onClick={handleSaveEdit}
                className="h-7 px-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
              <button
                type="button"
                id="btn-cancel-edit-lkpd"
                onClick={() => {
                  setEditedContent(plan.lkpdContent || "");
                  setIsEditing(false);
                }}
                className="h-7 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Batal
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id="btn-edit-lkpd"
                onClick={() => {
                  setIsEditing(true);
                  if (addNotification) {
                    addNotification("info", "Mode edit teks LKPD diaktifkan.");
                  }
                }}
                className="h-7 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit LKPD langsung"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Edit
              </button>
              <button
                type="button"
                id="btn-copy-lkpd"
                onClick={handleCopy}
                className="h-7 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                title="Salin LKPD ke clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                {copied ? "Tersalin!" : "Salin"}
              </button>
              <button
                type="button"
                id="btn-export-lkpd-word"
                onClick={handleExport}
                className="h-7 px-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md whitespace-nowrap flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                title="Ekspor ke Word .doc"
              >
                <Download className="w-3.5 h-3.5" />
                Word
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor or HTML rendering Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fdfdfd] dark:bg-slate-900/30 text-slate-900 dark:text-slate-100">
        {saveSuccess && (
          <div className="mb-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 text-center animate-fade-in">
            Perubahan LKPD berhasil disimpan!
          </div>
        )}

        {isEditing ? (
          <div className="h-full flex flex-col space-y-2">
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-2 rounded">
              <span><strong>Mode Edit LKPD:</strong> Anda dapat mengubah atau menyempurnakan isi LKPD di bawah ini.</span>
              <span className="font-mono">{editedContent.length} karakter</span>
            </div>
            <textarea
              id="textarea-editor-lkpd"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 w-full p-4 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 resize-none min-h-[300px]"
              placeholder="Tulis atau edit LKPD..."
            />
          </div>
        ) : (
          <div id="print-sheet-lkpd" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 shadow-sm max-w-4xl mx-auto prose dark:prose-invert prose-slate max-w-none text-left min-h-full text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* LKPD Header Badge */}
            <div className="border-b-2 border-amber-500 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">LEMBAR KERJA PESERTA DIDIK</h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Integrasi Deep Learning & Kurikulum Berbasis Cinta</p>
              </div>
              {(() => {
                const rawFase = plan.params?.fase || "";
                const cleanFase = rawFase.replace(/^(fase\s*)+/i, "").trim().toUpperCase();
                const faseText = cleanFase ? (cleanFase === "RA" ? "FASE RA" : `FASE ${cleanFase}`) : "FASE -";

                const rawKelas = plan.params?.kelas || "";
                const cleanKelas = rawKelas.replace(/^(kelas\s*)+/i, "").trim().toUpperCase();
                const kelasText = cleanKelas ? `KELAS ${cleanKelas}` : "KELAS -";

                return (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase text-right tracking-wider">
                    {faseText} • {kelasText}
                  </span>
                );
              })()}
            </div>

            {/* Rendered HTML / Markdown / SVG Content */}
            <div
              className="markdown-body text-slate-900 dark:text-slate-100 leading-relaxed text-xs sm:text-sm"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(plan.lkpdContent) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
