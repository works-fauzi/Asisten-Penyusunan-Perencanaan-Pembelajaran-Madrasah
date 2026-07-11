import { useState } from "react";
import { EDUCATIONAL_GUIDES } from "../data";
import { BookOpen, Heart, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export default function InstructionalGuides() {
  const [activeTab, setActiveTab] = useState<"deep" | "kbc">("deep");

  return (
    <div id="instructional-guides" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          id="btn-tab-deep"
          onClick={() => setActiveTab("deep")}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "deep"
              ? "border-sky-500 text-sky-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-sky-500" />
          Deep Learning
        </button>
        <button
          id="btn-tab-kbc"
          onClick={() => setActiveTab("kbc")}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "kbc"
              ? "border-emerald-500 text-emerald-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Heart className="w-4 h-4 text-emerald-500" />
          Kurikulum Berbasis Cinta (KBC)
        </button>
      </div>

      {/* Guide Content */}
      <div className="p-5">
        {activeTab === "deep" ? (
          <div id="guide-deep-content" className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                {EDUCATIONAL_GUIDES.deepLearning.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {EDUCATIONAL_GUIDES.deepLearning.desc}
              </p>
            </div>

            <div className="space-y-3 mt-3">
              {EDUCATIONAL_GUIDES.deepLearning.pillars.map((pillar, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-sky-50/50 border border-sky-100/50">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-sky-900">{pillar.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Catatan Guru:</strong> Deep learning memfokuskan siswa pada <i>reasoning</i> (penalaran) dibanding hafalan jangka pendek. Biarkan siswa mengeksplorasi secara mandiri.
              </div>
            </div>
          </div>
        ) : (
          <div id="guide-kbc-content" className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-600" />
                {EDUCATIONAL_GUIDES.kbc.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {EDUCATIONAL_GUIDES.kbc.desc}
              </p>
            </div>

            <div className="space-y-3 mt-3">
              {EDUCATIONAL_GUIDES.kbc.principles.map((principle, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center">
                      ♥
                    </span>
                    <h4 className="text-xs font-bold text-emerald-900">{principle.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    {principle.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-lg flex gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-800 leading-relaxed">
                <strong>Filosofi Kasih:</strong> Guru mengajar bukan sekadar mentransfer materi, melainkan menyalakan lentera jiwa murid melalui kelembutan instruksi, senyum ikhlas, dan keteladanan yang sejati.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
