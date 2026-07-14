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
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  const [history, setHistory] = useState<SavedLessonPlan[]>([]);
  const [activePlan, setActivePlan] = useState<SavedLessonPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        return stored as "light" | "dark";
      }
      if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (_) {}
    return "light";
  });

  // Sync theme to document element and localStorage
  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

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

      const text = await response.text();

      // Detect Cookie check security page from AI Studio reverse proxy
      if (
        text.includes("Cookie check") || 
        text.includes("Action required to load your app") || 
        text.includes("redirectToReturnUrl") || 
        text.trim().startsWith("<!doctype html>") || 
        text.trim().startsWith("<!DOCTYPE html>")
      ) {
        throw new Error("COOKIE_CHECK_BLOCKED: Browser Anda memblokir cookie keamanan pihak ketiga (third-party cookies) dalam iframe AI Studio. Silakan buka aplikasi di tab baru.");
      }

      if (!response.ok) {
        console.error("Status:", response.status, "Body:", text);
        let errorMessage = `API error ${response.status}: ${text.slice(0, 200)}`;
        try {
          if (text.trim().startsWith("{")) {
            const errorJson = JSON.parse(text);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Parsing error:", err, "Body was:", text);
        throw new Error("Gagal mengurai respon dari server sebagai JSON.");
      }

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
      let errMsg = error.message || "";
      if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
        errMsg = "FAILED_TO_FETCH: Gagal menghubungi server atau koneksi diblokir oleh browser. Hal ini biasanya terjadi jika cookie keamanan diblokir atau terjadi masalah CORS.";
      }
      setApiError(errMsg);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      
      {/* Top Application Header */}
      <header id="app-header" className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 h-auto py-4 px-4 sm:px-6 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg shrink-0">
            <Compass className="h-7 w-7 sm:h-8 sm:w-8 text-teal-600" />
          </div>
          <div className="text-left">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold tracking-tight text-white leading-tight">Asisten Penyusunan Perencanaan Pembelajaran Madrasah</h1>
            <p className="text-[10px] sm:text-xs mt-1 leading-normal font-light tracking-wide text-amber-50/90 dark:text-blue-200/80">Cerdas dengan Deep Learning, Hangat dengan Kurikulum Berbasis Cinta (KBC)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto text-xs font-medium">
          <button
            onClick={toggleTheme}
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
            title={theme === "dark" ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <span className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200 hidden sm:inline-block">Bantuan</span>
          <a
            href="https://wa.me/082131752220"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 hover:scale-105 transition-transform duration-200"
            title="Hubungi Bantuan di WhatsApp"
          >
            <svg
              className="h-8 w-8 fill-current text-white hover:text-emerald-400 transition-colors"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col gap-6">
        
        {/* Error notification */}
        {apiError && (
          (() => {
            const isCookieOrFetchError = 
              apiError.includes("COOKIE_CHECK_BLOCKED") ||
              apiError.includes("FAILED_TO_FETCH") ||
              apiError.includes("Unexpected token '<'") ||
              apiError.includes("is not valid JSON") ||
              apiError.includes("Gagal mengurai respon");

            if (isCookieOrFetchError) {
              return (
                <div id="error-bar" className="mb-2 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start gap-4 text-sm text-slate-800 animate-fade-in shadow-sm">
                  <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2 flex-1 text-left">
                    <h4 className="font-bold text-amber-950 text-base">Masalah Koneksi & Cookie Keamanan Terdeteksi</h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Aplikasi mendeteksi bahwa peramban (browser) Anda memblokir cookie keamanan pihak ketiga (third-party cookies) dalam bingkai (iframe) AI Studio. Ini adalah perilaku bawaan perlindungan privasi pada <strong>Safari iOS/macOS</strong>, <strong>Chrome Incognito / Guest Mode</strong>, atau peramban dengan proteksi ketat.
                    </p>
                    <div className="p-3 bg-amber-100/60 rounded-xl border border-amber-200/40 text-xs text-amber-950/90 space-y-1">
                      <p className="font-bold">Langkah Solusi Cepat & Mudah:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        <li>Klik tombol <strong>Buka Aplikasi di Tab Baru</strong> di samping untuk menggunakan aplikasi secara penuh dan lancar tanpa kendala cookie.</li>
                        <li>Atau, izinkan cookie pihak ketiga pada peramban Anda dan segarkan halaman ini.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="w-full md:w-auto shrink-0 self-center">
                    <button
                      onClick={() => window.open(window.location.href, "_blank")}
                      className="w-full md:w-auto px-5 py-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-xl text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-700"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      Buka Aplikasi di Tab Baru
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div id="error-bar" className="mb-2 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-sm text-rose-800 animate-fade-in shadow-sm">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-left">
                  <h4 className="font-bold">Gagal Menyusun Rencana Pembelajaran</h4>
                  <p className="text-xs text-rose-600 leading-relaxed">{apiError}</p>
                </div>
              </div>
            );
          })()
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
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-rose-100 dark:bg-rose-950/40 p-2.5 rounded-full text-rose-500 shrink-0">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-widest mb-1">Love Index</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Sangat Tinggi</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-full text-amber-500 shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-widest mb-1">Diferensiasi</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Aktif (AI Adjusted)</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-sky-100 dark:bg-sky-950/40 p-2.5 rounded-full text-sky-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-widest mb-1">Status Perencanaan</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
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
        <footer className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800 text-center space-y-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xs transition-colors duration-200">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">Kurikulum Merdeka</span>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Fleksibilitas konten pembelajaran, berpusat pada murid, dan penguatan karakter Profil Pelajar Pancasila & Rahmatan Lil Alamin (P2RA).
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xs transition-colors duration-200">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest block mb-1">Deep Learning</span>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Mendorong proses belajar tingkat tinggi dengan 3 pilar: <strong>Mindful</strong> (penuh kesadaran), <strong>Meaningful</strong> (bermakna), dan <strong>Joyful</strong> (menyenangkan).
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xs transition-colors duration-200">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Berbasis Cinta</span>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Mengutamakan iklim kelas yang aman (safe space), restitusi humanis, serta bimbingan bernuansa kasih sayang dari lubuk hati pendidik.
              </p>
            </div>
          </div>
          
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            © 2026 Asisten Penyusunan Perencanaan Pembelajaran Madrasah.
          </div>
        </footer>

      </main>
    </div>
  );
}
