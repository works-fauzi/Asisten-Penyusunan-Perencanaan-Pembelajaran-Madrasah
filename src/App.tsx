import { useState, useEffect } from "react";
import { SavedLessonPlan, LessonPlanParams } from "./types";
import LessonPlanForm from "./components/LessonPlanForm";
import LessonPlanPreview from "./components/LessonPlanPreview";
import HistoryList from "./components/HistoryList";
import {
  Files,
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
  Moon,
  Bell,
  CheckCircle2,
  Loader2,
  Trash2
} from "lucide-react";

export default function App() {
  const [history, setHistory] = useState<SavedLessonPlan[]>([]);
  const [activePlan, setActivePlan] = useState<SavedLessonPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<"preview" | "riwayat">("preview");
  const [notifications, setNotifications] = useState<Array<{
    id: number | string;
    type: "info" | "success" | "error" | "loading";
    message: string;
    time: string;
  }>>([
    {
      id: 1,
      type: "info",
      message: "Sistem siap. Silakan isi formulir dan masukkan Token API Anda.",
      time: "Sekarang"
    }
  ]);
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

  // Listener untuk perubahan skema warna sistem operasi/browser secara real-time
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Mengubah ikon tab browser (favicon) secara dinamis
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const svgDataUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%232563eb" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>';
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.type = 'image/svg+xml';
      link.href = svgDataUri;
    } catch (_) {}
  }, []);

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
    const loadId = Date.now();
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // 1. Saat Tombol Generate Diklik (Proses Dimulai)
    setNotifications(prev => [
      {
        id: loadId,
        type: "loading",
        message: "🔄 Menghubungkan ke Gemini... Memulai penyusunan Perencanaan Pembelajaran.",
        time: timeNow
      },
      ...prev
    ]);

    try {
      // 2. Saat Proses Berjalan (Optional jika ada pembagian tahap)
      const progressTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => [
        {
          id: `progress-${Date.now()}`,
          type: "info",
          message: "⚡ Menyusun materi inti, pendekatan Deep Learning, dan target karakter P2RA...",
          time: progressTime
        },
        ...prev
      ]);

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
      setActiveCenterTab("preview");
      saveToLocalStorage(updatedHistory);

      // 3. Jika Pembuatan RPP Berhasil (Success Block)
      const successTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== loadId);
        return [
          {
            id: Date.now(),
            type: "success",
            message: "🎉 Sukses! Modul Ajar telah berhasil disusun dan siap ditinjau/diekspor.",
            time: successTime
          },
          ...filtered
        ];
      });
    } catch (error: any) {
      console.error("Error generating lesson plan:", error);
      let errMsg = error.message || "";
      if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
        errMsg = "FAILED_TO_FETCH: Gagal menghubungi server atau koneksi diblokir oleh browser. Hal ini biasanya terjadi jika cookie keamanan diblokir atau terjadi masalah CORS.";
      }
      setApiError(errMsg);

      // 4. Jika Proses Gagal atau Terjadi Timeout (Catch Block)
      const errorTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== loadId);
        return [
          {
            id: Date.now(),
            type: "error",
            message: "❌ Pembuatan Modul Ajar gagal. Silakan coba klik Generate ulang atau periksa jaringan Anda.",
            time: errorTime
          },
          ...filtered
        ];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Select an item from local history
  const handleSelectPlan = (plan: SavedLessonPlan) => {
    setActivePlan(plan);
    setApiError(null);
    setActiveCenterTab("preview");

    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setNotifications(prev => [
      {
        id: Date.now(),
        type: "info",
        message: `Membuka draf: ${plan.title}`,
        time: timeNow
      },
      ...prev
    ]);
  };

  // Delete an item from local history
  const handleDeletePlan = (id: string) => {
    const planToDelete = history.find(p => p.id === id);
    const updatedHistory = history.filter(p => p.id !== id);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedHistory);

    if (activePlan?.id === id) {
      setActivePlan(updatedHistory.length > 0 ? updatedHistory[0] : null);
    }

    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setNotifications(prev => [
      {
        id: Date.now(),
        type: "info",
        message: `Draf dihapus: ${planToDelete?.title || "Modul Ajar"}`,
        time: timeNow
      },
      ...prev
    ]);
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
      <header id="app-header" className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 h-auto py-4 px-4 sm:px-6 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white shrink-0 shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="border border-white/20 bg-white/10 p-2 rounded-lg shrink-0 flex items-center justify-center">
            <Files className="h-7 w-7 sm:h-8 sm:w-8 text-white stroke-[1.5]" />
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
          <a
            href="https://wa.me/082131752220"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            title="Hubungi Bantuan di WhatsApp"
          >
            Bantuan
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-[180px] md:pt-[110px] pb-4 flex flex-col gap-6">
        
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
        <div className="grid grid-cols-1 gap-6 lg:grid lg:grid-cols-12 lg:gap-8 xl:grid xl:grid-cols-12 xl:gap-6 items-start">
          
          {/* Column 1 (Left): Form & Quick Guide */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 xl:h-[calc(100vh-7rem)] xl:flex xl:flex-col">
            <LessonPlanForm onSubmit={handleGeneratePlan} isGenerating={isGenerating} setNotifications={setNotifications} />
          </div>

          {/* Column 2 (Right): Active Preview panel, indicators, and history */}
          <div className="lg:col-span-7 xl:col-span-5 flex flex-col lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)] h-auto overflow-hidden xl:h-[calc(100vh-7rem)] xl:flex xl:flex-col">
            {/* Tab Contents */}
            {activeCenterTab === "preview" ? (
              <LessonPlanPreview
                plan={activePlan}
                onUpdatePlan={handleUpdatePlan}
                isGenerating={isGenerating}
              />
            ) : (
              <HistoryList
                history={history}
                onSelect={handleSelectPlan}
                onDelete={handleDeletePlan}
                selectedId={activePlan ? activePlan.id : null}
              />
            )}

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/40 rounded-lg mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveCenterTab("preview")}
                className={`flex-1 transition-all duration-200 text-xs py-1.5 px-3 rounded-md text-center cursor-pointer ${
                  activeCenterTab === "preview"
                    ? "bg-blue-600 text-white font-medium shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                }`}
              >
                Preview Modul Ajar
              </button>
              <button
                type="button"
                onClick={() => setActiveCenterTab("riwayat")}
                className={`flex-1 transition-all duration-200 text-xs py-1.5 px-3 rounded-md text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeCenterTab === "riwayat"
                    ? "bg-blue-600 text-white font-medium shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                }`}
              >
                <span>Riwayat Tersimpan</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeCenterTab === "riwayat"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}>
                  {history.length}
                </span>
              </button>
            </div>
          </div>

          {/* Kolom Kanan Baru (Tempat Status & Edukasi) */}
          <div className="xl:col-span-3 lg:col-span-12 w-full xl:h-[calc(100vh-7rem)] xl:overflow-y-auto flex flex-col gap-4">
            {/* Indicator panels from Vibrant Palette */}
            <div className="flex flex-col gap-3 w-full text-left">
              <div className="bg-white dark:bg-slate-800 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-rose-100 dark:bg-rose-950/40 p-1.5 rounded-full text-rose-500 shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider mb-0.5">Love Index</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Sangat Tinggi</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-1.5 rounded-full text-amber-500 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider mb-0.5">Diferensiasi</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Aktif (AI Adjusted)</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs transition-colors duration-200">
                <div className="bg-sky-100 dark:bg-sky-950/40 p-1.5 rounded-full text-sky-500 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider mb-0.5">Status Perencanaan</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {activePlan ? "Siap Diekspor" : "Isi Parameter"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pusat Notifikasi & Aktivitas */}
            <div className="w-full flex-1 min-h-[250px] bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pusat Notifikasi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications([])}
                  className="p-1 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  title="Bersihkan semua notifikasi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="border-b border-slate-100 dark:border-slate-800 my-3"></div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {notifications.map((item) => {
                  let styleClasses = "";
                  let IconComponent = Info;

                  if (item.type === "error") {
                    styleClasses = "bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400";
                    IconComponent = AlertCircle;
                  } else if (item.type === "success") {
                    styleClasses = "bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-700 dark:text-green-400";
                    IconComponent = CheckCircle2;
                  } else if (item.type === "info") {
                    styleClasses = "bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400";
                    IconComponent = Info;
                  } else if (item.type === "loading") {
                    styleClasses = "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 animate-pulse";
                    IconComponent = Loader2;
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 transition-all duration-200 ${styleClasses}`}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${item.type === "loading" ? "animate-spin" : ""}`} />
                      <span className="flex-1 text-left">{item.message}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto whitespace-nowrap pt-0.5">{item.time}</span>
                    </div>
                  );
                })}
                {notifications.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4">Tidak ada aktivitas baru</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-4 mb-2 py-2 w-full text-center">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            © 2026 Asisten Penyusunan Perencanaan Pembelajaran Madrasah v1.2.0 (Release)
          </div>
        </footer>

      </main>
    </div>
  );
}
