import { SavedLessonPlan } from "../types";
import { Search, FileText, Trash2, Calendar, MapPin, Award } from "lucide-react";
import { useState } from "react";

interface HistoryListProps {
  history: SavedLessonPlan[];
  onSelect: (plan: SavedLessonPlan) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
}

export default function HistoryList({ history, onSelect, onDelete, selectedId }: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredHistory = history.filter(plan => {
    const term = searchTerm.toLowerCase();
    const docType = plan.type === 'lkpd' ? 'lkpd' : 'modul ajar';
    const matpel = plan.params?.mataPelajaran || plan.matpel || "";
    const bab = plan.params?.babTema || plan.title || plan.judul || "";
    const madrasah = plan.params?.madrasah || "";
    return (
      docType.includes(term) ||
      matpel.toLowerCase().includes(term) ||
      bab.toLowerCase().includes(term) ||
      madrasah.toLowerCase().includes(term)
    );
  });

  return (
    <div id="history-section" className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-sm dark:shadow-none overflow-hidden flex flex-col flex-1 h-auto lg:h-full text-left transition-colors duration-200">
      {/* Header with Search */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/60 space-y-3 flex-none">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Riwayat
            <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </h3>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            id="input-history-search"
            type="text"
            placeholder="Cari mapel, tema, atau madrasah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-900 border-slate-300 dark:bg-[#0b1021]/80 dark:text-slate-100 dark:border-slate-700/80 rounded-lg focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* History Items Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 custom-scrollbar">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">
              {searchTerm ? "Pencarian tidak ditemukan." : "Belum ada riwayat tersimpan."}
            </p>
          </div>
        ) : (
          filteredHistory.map((plan) => {
            const isSelected = plan.id === selectedId;
            const isDeleting = plan.id === deletingId;
            const isLkpd = plan.type === 'lkpd';

            return (
              <div
                key={plan.id}
                id={`history-item-${plan.id}`}
                className={`p-4 transition-colors cursor-pointer text-left relative group ${
                  isSelected ? "bg-sky-50/80 dark:bg-sky-950/30 border-l-4 border-sky-600" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                }`}
                onClick={() => onSelect(plan)}
              >
                <div className="pr-12 space-y-1">
                  {/* Category badges */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {/* Document Type Badge */}
                    {isLkpd ? (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded uppercase">
                        LKPD
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded uppercase">
                        Modul Ajar
                      </span>
                    )}

                    {/* Fase Badge */}
                    {(() => {
                      const rawFase = plan.params?.fase || plan.fase || "";
                      const cleanFase = rawFase.replace(/^(fase\s*)+/i, "").trim();
                      const formattedFase = cleanFase ? (cleanFase.toUpperCase() === "RA" ? "FASE RA" : `FASE ${cleanFase}`) : "";
                      if (!formattedFase) return null;
                      return (
                        <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
                          {formattedFase}
                        </span>
                      );
                    })()}

                    {/* Kelas Badge */}
                    {(plan.params?.kelas || plan.kelas) && (
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
                        {plan.params?.kelas || plan.kelas}
                      </span>
                    )}

                    {/* Jenjang Badge */}
                    {(plan.params?.jenjang || plan.jenjang) && (
                      <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        {(plan.params?.jenjang || plan.jenjang || "").split(" ")[0]}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {plan.params?.mataPelajaran || plan.matpel || "Pelajaran"} - {plan.params?.babTema || plan.title || plan.judul}
                  </h4>

                  {/* Madrasah Info */}
                  {plan.params?.madrasah && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{plan.params.madrasah}</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 pt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>{new Date(plan.createdAt || plan.tanggal || Date.now()).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}</span>
                  </div>
                </div>

                {/* Delete button or custom Inline Confirmation */}
                {isDeleting ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 z-10">
                    <button
                      type="button"
                      id={`btn-confirm-delete-${plan.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(plan.id);
                        setDeletingId(null);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
                      title="Konfirmasi Hapus"
                    >
                      Yakin?
                    </button>
                    <button
                      type="button"
                      id={`btn-cancel-delete-${plan.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(null);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors cursor-pointer"
                      title="Batal Hapus"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id={`btn-delete-history-${plan.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(plan.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Hapus Perencanaan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
