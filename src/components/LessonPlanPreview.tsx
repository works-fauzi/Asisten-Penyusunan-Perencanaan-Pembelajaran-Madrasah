import { useState, useEffect } from "react";
import { SavedLessonPlan } from "../types";
import { exportToWord, parseMarkdownToHTML, copyFormattedHTMLToClipboard } from "../utils/exporter";
import {
  FileText,
  Download,
  Copy,
  Edit2,
  Check,
  Save,
  BookOpen,
  Info,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  X
} from "lucide-react";

interface LessonPlanPreviewProps {
  plan: SavedLessonPlan | null;
  onUpdatePlan: (updatedPlan: SavedLessonPlan) => void;
  isGenerating: boolean;
  addNotification?: (type: "info" | "success" | "error" | "loading", message: string) => void;
}

export default function LessonPlanPreview({ plan, onUpdatePlan, isGenerating, addNotification }: LessonPlanPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update editor state whenever active plan changes
  useEffect(() => {
    if (plan) {
      setEditedMarkdown(plan.markdownContent);
      setIsEditing(false);
    } else {
      setEditedMarkdown("");
    }
  }, [plan]);

  const handleCopy = async () => {
    if (!plan) return;
    try {
      const contentToCopy = isEditing ? editedMarkdown : plan.markdownContent;
      await copyFormattedHTMLToClipboard(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (addNotification) {
        addNotification("success", "Teks Modul Ajar (Rich Text/HTML) berhasil disalin ke clipboard.");
      }
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
      if (addNotification) {
        addNotification("error", "Gagal menyalin teks ke clipboard.");
      }
    }
  };

  const handleSaveEdit = () => {
    if (!plan) return;
    const updated: SavedLessonPlan = {
      ...plan,
      markdownContent: editedMarkdown
    };
    onUpdatePlan(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (addNotification) {
      addNotification("success", "Perubahan teks modul berhasil disimpan.");
    }
  };

  const handleExport = () => {
    if (!plan) return;
    const contentToExport = isEditing ? editedMarkdown : plan.markdownContent;
    const mataPelajaran = plan.params.mataPelajaran || "Mata_Pelajaran";
    const babTema = plan.params.babTema || "Bab";
    const documentTitle = `Modul_${mataPelajaran}_${babTema}`;
    exportToWord(documentTitle, contentToExport, plan.params);
    if (addNotification) {
      addNotification("success", `Dokumen ${documentTitle}.docx berhasil diekspor ke format Word.`);
    }
  };

  if (isGenerating) {
    return (
      <div id="preview-loading" className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-sm dark:shadow-none p-8 text-center h-auto lg:h-full flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center space-y-6 transition-colors duration-200">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sky-100 dark:border-sky-900 border-t-sky-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-sky-500 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Menyusun Rencana Pembelajaran...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Kecerdasan Buatan sedang merangkai Kurikulum Merdeka, memadukan pendekatan 
            <strong> Deep Learning (Mindful, Meaningful, Joyful)</strong> serta mengintegrasikan sentuhan humanis dari 
            <strong> Kurikulum Berbasis Cinta (KBC)</strong>.
          </p>
        </div>
        <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 p-4 rounded-xl text-[11px] text-sky-800 dark:text-sky-300 text-left w-full max-w-sm space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Alur Pembuatan:
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 font-medium">
            <li>Menyusun Identitas & Tujuan Pembelajaran (TP)</li>
            <li>Mengintegrasikan nilai Rahmatan Lil Alamin (P2RA)</li>
            <li>Merancang kegiatan Mindful, Meaningful, Joyful</li>
            <li>Memoles instruksi guru dengan sapaan kasih (KBC)</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div id="preview-empty" className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-sm dark:shadow-none p-8 text-center h-auto lg:h-full flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center space-y-4 transition-colors duration-200">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-750 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">Belum Ada Perencanaan yang Terpilih</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Isi formulir perencanaan di sebelah kiri lalu klik tombol <strong>Generate Modul AI</strong>, atau pilih dokumen dari riwayat simpanan Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="preview-active" className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/70 shadow-sm dark:shadow-none flex flex-col flex-1 h-auto lg:h-full overflow-hidden text-left text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Control Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex-none sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <span className="p-1.5 bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {plan.params.mataPelajaran} - {plan.params.babTema}
            </h3>
            {(() => {
              const cleanFase = (plan.params.fase || "").replace(/^(fase\s*)+/i, "").trim();
              const formattedFaseTitle = cleanFase ? (cleanFase.toUpperCase() === "RA" ? "Fase RA" : `Fase ${cleanFase}`) : "";
              return (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                  {formattedFaseTitle} • {plan.params.kelas} • {plan.params.jenjang.split(" ")[0]}
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
                id="btn-save-edit"
                onClick={handleSaveEdit}
                className="h-7 px-2 text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
              <button
                type="button"
                id="btn-cancel-edit"
                onClick={() => {
                  setEditedMarkdown(plan.markdownContent);
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
                id="btn-start-edit"
                onClick={() => {
                  setIsEditing(true);
                  if (addNotification) {
                    addNotification("info", "Mode edit teks diaktifkan.");
                  }
                }}
                className="h-7 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit Perencanaan langsung"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Edit
              </button>
              <button
                type="button"
                id="btn-copy-clipboard"
                onClick={handleCopy}
                className="h-7 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                title="Salin teks ke clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                {copied ? "Tersalin!" : "Salin"}
              </button>
              <button
                type="button"
                id="btn-export-word"
                onClick={handleExport}
                className="h-7 px-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md whitespace-nowrap flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                title="Ekspor langsung ke Word .doc"
              >
                <Download className="w-3.5 h-3.5" />
                Word
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor or HTML rendering Container */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#fdfdfd] dark:bg-slate-900/30 text-slate-900 dark:text-slate-100">
        {saveSuccess && (
          <div className="mb-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 text-center animate-fade-in">
            Perubahan berhasil disimpan ke dalam riwayat lokal!
          </div>
        )}

        {isEditing ? (
          <div className="h-full flex flex-col space-y-2">
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-2 rounded">
              <span><strong>Mode Edit:</strong> Anda dapat mengedit teks perencanaan di bawah sebelum mengekspor.</span>
              <span className="font-mono">{editedMarkdown.length} karakter</span>
            </div>
            <textarea
              id="textarea-editor"
              value={editedMarkdown}
              onChange={(e) => setEditedMarkdown(e.target.value)}
              className="flex-1 w-full p-4 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 resize-none min-h-[300px]"
              placeholder="Gunakan format Markdown untuk menulis..."
            />
          </div>
        ) : (
          <div id="print-sheet" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-sm max-w-4xl mx-auto prose dark:prose-invert prose-slate max-w-none text-left min-h-full text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Header Badge */}
            <div className="border-b-2 border-sky-600 pb-3 mb-6 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-sky-600 uppercase">MODUL AJAR KURIKULUM MERDEKA</h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Integrasi Deep Learning & Kurikulum Berbasis Cinta</p>
              </div>
              {(() => {
                const cleanFase = (plan.params.fase || "").replace(/^(fase\s*)+/i, "").trim();
                const formattedFaseBadge = cleanFase ? (cleanFase.toUpperCase() === "RA" ? "FASE RA" : `FASE ${cleanFase}`) : "";
                return (
                  <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-1 rounded uppercase">
                    {formattedFaseBadge} • {plan.params.kelas}
                  </span>
                );
              })()}
            </div>

            {/* Dynamic Content */}
            <div
              className="markdown-body text-slate-900 dark:text-slate-100"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(plan.markdownContent) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
