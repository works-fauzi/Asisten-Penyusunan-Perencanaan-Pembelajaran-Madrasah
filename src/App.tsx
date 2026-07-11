import { useState, useEffect } from "react";
import { SavedLessonPlan, LessonPlanParams } from "./types";
import LessonPlanForm from "./components/LessonPlanForm";
import LessonPlanPreview from "./components/LessonPlanPreview";
import HistoryList from "./components/HistoryList";
import InstructionalGuides from "./components/InstructionalGuides";
import {
  Compass,
  Heart,
  FileText,
  HelpCircle,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  AlertCircle
} from "lucide-react";

export default function App() {
  const [history, setHistory] = useState<SavedLessonPlan[]>([]);
  const [activePlan, setActivePlan] = useState<SavedLessonPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("madrasah_lesson_plans_history");
      if (stored) {
        const parsed = JSON.parse(stored) as SavedLessonPlan[];
        setHistory(parsed);
        if (parsed.length > 0) {
          setActivePlan(parsed[0]);
        }
      }
    } catch (err) {
      console.error("Error loading history from localStorage:", err);
    }
  }, []);

  // Save history to localStorage whenever it changes
  const saveToLocalStorage = (updatedHistory: SavedLessonPlan[]) => {
    try {
      localStorage.setItem("madrasah_lesson_plans_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Error saving history to localStorage:", err);
    }
  };

  // Submit handler to call our Express API route
  const handleGeneratePlan = async (params: LessonPlanParams, file: File | null) => {
    setIsGenerating(true);
    setApiError(null);

    try {
      const formData = new FormData();
      Object.keys(params).forEach(key => {
        const val = (params as any)[key];
        if (Array.isArray(val)) {
          val.forEach(item => {
            formData.append(key, item);
          });
        } else {
          formData.append(key, val);
        }
      });
      if (file) {
        formData.append("rujukanFile", file);
      }

      const response = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Gagal menyusun rencana pembelajaran.";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            if (errorText.includes("<pre>")) {
              const match = errorText.match(/<pre>([\s\S]*?)<\/pre>/);
              if (match && match[1]) {
                errorMessage = match[1].trim();
              } else {
                errorMessage = `Kesalahan Server (${response.status}): ${errorText.substring(0, 150)}`;
              }
            } else {
              errorMessage = `Kesalahan Server (${response.status}): ${response.statusText || "Internal Server Error"}`;
            }
          }
        } catch (e) {
          errorMessage = `Kesalahan Server (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const newPlan: SavedLessonPlan = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        title: `${params.mataPelajaran} - ${params.babTema}`,
        params: params,
        markdownContent: data.result,
        createdAt: new Date().toISOString()
      };

      const updatedHistory = [newPlan, ...history];
      setHistory(updatedHistory);
      setActivePlan(newPlan);
      saveToLocalStorage(updatedHistory);
    } catch (error: any) {
      console.error("Error generating lesson plan:", error);
      setApiError(error.message || "Terjadi gangguan komunikasi dengan server. Pastikan server dev aktif.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Select an item from local history
  const handleSelectPlan = (plan: SavedLessonPlan) => {
    setActivePlan(plan);
    setApiError(null);
  };

  // Delete an item from local history
  const handleDeletePlan = (id: string) => {
    const updatedHistory = history.filter(p => p.id !== id);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedHistory);

    if (activePlan?.id === id) {
      setActivePlan(updatedHistory.length > 0 ? updatedHistory[0] : null);
    }
  };

  // Handle plan updates (e.g., when the user edits in the preview editor)
  const handleUpdatePlan = (updatedPlan: SavedLessonPlan) => {
    const updatedHistory = history.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setHistory(updatedHistory);
    setActivePlan(updatedPlan);
    saveToLocalStorage(updatedHistory);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-slate-800">
      
      {/* Top Application Header */}
      <header id="app-header" className="bg-sky-600 h-20 flex items-center justify-between px-8 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg">
            <Compass className="h-8 w-8 text-sky-600" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight leading-none">Asisten Penyusunan Perencanaan Pembelajaran Madrasah</h1>
            <p className="text-sky-100 text-xs mt-1">Cerdas dengan Deep Learning, Hangat dengan Kurikulum Berbasis Cinta (KBC)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="bg-sky-500/30 px-3 py-1 rounded-full border border-sky-400 hidden sm:inline-block">Gemini AI Powered</span>
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-xs font-bold uppercase">
            AP
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        
        {/* Error notification */}
        {apiError && (
          <div id="error-bar" className="mb-2 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-sm text-rose-800 animate-fade-in shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-left">Gagal Menyusun Rencana Pembelajaran</h4>
              <p className="text-xs text-rose-600 leading-relaxed text-left">{apiError}</p>
            </div>
          </div>
        )}

        {/* 3-Column Bento Grid Layout for Ultimate Desktop Productivity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1 (Left): Form & Quick Guide */}
          <div className="lg:col-span-5 space-y-6">
            <LessonPlanForm onSubmit={handleGeneratePlan} isGenerating={isGenerating} />
            <InstructionalGuides />
          </div>

          {/* Column 2 (Right): Active Preview panel, indicators, and history */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            <LessonPlanPreview
              plan={activePlan}
              onUpdatePlan={handleUpdatePlan}
              isGenerating={isGenerating}
            />

            {/* Indicator panels from Vibrant Palette */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 text-left">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-xs">
                <div className="bg-rose-100 p-2.5 rounded-full text-rose-500">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Love Index</p>
                  <p className="text-sm font-bold text-slate-700">Sangat Tinggi</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-xs">
                <div className="bg-amber-100 p-2.5 rounded-full text-amber-500">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Diferensiasi</p>
                  <p className="text-sm font-bold text-slate-700">Aktif (AI Adjusted)</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-xs">
                <div className="bg-sky-100 p-2.5 rounded-full text-sky-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Status Perencanaan</p>
                  <p className="text-sm font-bold text-slate-700">
                    {activePlan ? "Siap Diekspor" : "Isi Parameter"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Column 3 (Integrated as bottom drawer on right or grid column): Saved History */}
            <HistoryList
              history={history}
              onSelect={handleSelectPlan}
              onDelete={handleDeletePlan}
              selectedId={activePlan ? activePlan.id : null}
            />
          </div>

        </div>

        {/* Footer info explaining the synergy of the curriculum */}
        <footer className="mt-12 pt-6 border-t border-slate-200/60 text-center space-y-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">Kurikulum Merdeka</span>
              <p className="text-[10.5px] text-slate-500 leading-normal">
                Fleksibilitas konten pembelajaran, berpusat pada murid, dan penguatan karakter Profil Pelajar Pancasila & Rahmatan Lil Alamin (P2RA).
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs">
              <span className="text-xs font-bold text-sky-600 uppercase tracking-widest block mb-1">Deep Learning</span>
              <p className="text-[10.5px] text-slate-500 leading-normal">
                Mendorong proses belajar tingkat tinggi dengan 3 pilar: <strong>Mindful</strong> (penuh kesadaran), <strong>Meaningful</strong> (bermakna), dan <strong>Joyful</strong> (menyenangkan).
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">Berbasis Cinta</span>
              <p className="text-[10.5px] text-slate-500 leading-normal">
                Mengutamakan iklim kelas yang aman (safe space), restitusi humanis, serta bimbingan bernuansa kasih sayang dari lubuk hati pendidik.
              </p>
            </div>
          </div>
          
          <div className="text-[11px] text-slate-400">
            © 2026 Asisten Penyusunan Perencanaan Pembelajaran Madrasah. Dikembangkan untuk Guru Madrasah Indonesia Mulia.
          </div>
        </footer>

      </main>
    </div>
  );
}
