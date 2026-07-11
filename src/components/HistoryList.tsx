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
    return (
      plan.title.toLowerCase().includes(term) ||
      plan.params.mataPelajaran.toLowerCase().includes(term) ||
      plan.params.babTema.toLowerCase().includes(term) ||
      (plan.params.madrasah && plan.params.madrasah.toLowerCase().includes(term))
    );
  });

  return (
    <div id="history-section" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px] text-left">
      {/* Header with Search */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Riwayat Perencanaan Tersimpan
            <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </h3>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="input-history-search"
            type="text"
            placeholder="Cari mapel, tema, atau madrasah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* History Items Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">
              {searchTerm ? "Pencarian tidak ditemukan." : "Belum ada perencanaan yang disimpan."}
            </p>
          </div>
        ) : (
          filteredHistory.map((plan) => {
            const isSelected = plan.id === selectedId;
            const isDeleting = plan.id === deletingId;
            return (
              <div
                key={plan.id}
                id={`history-item-${plan.id}`}
                className={`p-4 transition-colors cursor-pointer text-left relative group ${
                  isSelected ? "bg-sky-50/80 border-l-4 border-sky-600" : "hover:bg-slate-50"
                }`}
                onClick={() => onSelect(plan)}
              >
                <div className="pr-12 space-y-1">
                  {/* Category badges */}
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded uppercase">
                      {plan.params.fase}
                    </span>
                    {plan.params.kelas && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">
                        {plan.params.kelas}
                      </span>
                    )}
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                      {plan.params.jenjang.split(" ")[0]}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                    {plan.params.mataPelajaran} - {plan.params.babTema}
                  </h4>

                  {/* Madrasah Info */}
                  {plan.params.madrasah && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{plan.params.madrasah}</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 pt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{new Date(plan.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}</span>
                  </div>
                </div>

                {/* Delete button or custom Inline Confirmation */}
                {isDeleting ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100 z-10">
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
                      className="px-2 py-1 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Hapus Perencanaan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
