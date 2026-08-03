import { useState, useEffect } from "react";
import { SavedLessonPlan, LessonPlanParams } from "./types";
import LessonPlanForm from "./components/LessonPlanForm";
import LessonPlanPreview from "./components/LessonPlanPreview";
import LkpdPreview from "./components/LkpdPreview";
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
  const [isGeneratingLKPD, setIsGeneratingLKPD] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<"preview" | "lkpd" | "riwayat">("preview");
  const [leftTab, setLeftTab] = useState<"form" | "lkpd">("form");
  const [mobileTab, setMobileTab] = useState<"form" | "preview" | "notifications">("form");
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

  // Sync theme to document element
  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
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

  // Toggle tema secara manual dan simpan preferensi ke localStorage
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch (_) {}
  };

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

  // Helper function to add real-time notifications with HH:mm time format
  const addNotification = (type: "info" | "success" | "error" | "loading", message: string) => {
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setNotifications(prev => [
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        message,
        time: timeNow
      },
      ...prev
    ]);
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
    setActiveCenterTab("preview");
    setMobileTab("preview");
    const loadId = Date.now();
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // Sanitize API Key on-the-fly
    const rawApiKey = params.geminiApiKey || "";
    const sanitizedApiKey = rawApiKey.trim();
    const sanitizedParams = {
      ...params,
      geminiApiKey: sanitizedApiKey
    };

    if (!sanitizedApiKey) {
      const emptyKeyMsg = "API Key Gemini wajib diisi untuk mengaktifkan pembuat perencanaan pembelajaran.";
      setApiError(emptyKeyMsg);
      addNotification("error", emptyKeyMsg);
      setIsGenerating(false);
      return;
    }

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
      // 2. Saat Proses Berjalan
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
      Object.keys(sanitizedParams).forEach(key => {
        const val = (sanitizedParams as any)[key];
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
              console.log("Response Gemini Error:", errorJson);
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
        type: 'modul',
        typeDoc: 'modul',
        title: `${sanitizedParams.mataPelajaran} - ${sanitizedParams.babTema}`,
        judul: `${sanitizedParams.mataPelajaran} - ${sanitizedParams.babTema}`,
        matpel: sanitizedParams.mataPelajaran,
        kelas: sanitizedParams.kelas,
        fase: sanitizedParams.fase,
        jenjang: sanitizedParams.jenjang,
        tanggal: new Date().toISOString(),
        content: data.result,
        params: sanitizedParams,
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
            id: `save-${Date.now()}`,
            type: "success",
            message: "Modul Ajar berhasil disimpan ke Riwayat Tersimpan.",
            time: successTime
          },
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
      if (
        errMsg.toLowerCase().includes("invalid argument") ||
        errMsg.toLowerCase().includes("invalid_argument") ||
        errMsg.includes("API key not valid")
      ) {
        errMsg = "Gagal memproses request. Pastikan API Key Gemini yang dimasukkan valid dan aktif di Google AI Studio.";
      } else if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
        errMsg = "FAILED_TO_FETCH: Gagal menghubungi server atau koneksi diblokir oleh browser. Hal ini biasanya terjadi jika cookie keamanan diblokir atau terjadi masalah CORS.";
      }
      setApiError(errMsg);

      // 4. Jika Proses Gagal
      const errorTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== loadId);
        return [
          {
            id: Date.now(),
            type: "error",
            message: errMsg.startsWith("Gagal memproses request") || errMsg.startsWith("Format API Key")
              ? errMsg
              : `❌ Pembuatan Modul Ajar gagal: ${errMsg}`,
            time: errorTime
          },
          ...filtered
        ];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit handler to call our Express API route for generating LKPD AI
  const handleGenerateLKPD = async (selectedModule: SavedLessonPlan, selectedPertemuan: string) => {
    if (!selectedModule) return;
    
    // Auto-switch middle column to LKPD tab
    setIsGeneratingLKPD(true);
    setApiError(null);
    setActiveCenterTab("lkpd");
    setMobileTab("preview");

    const loadId = Date.now();
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const moduleTitle = selectedModule.params?.babTema || selectedModule.title || "Perencanaan Pembelajaran";
    const apiKey = (selectedModule.params?.geminiApiKey || "").trim();

    if (!apiKey) {
      const emptyKeyMsg = "API Key Gemini wajib diisi untuk mengaktifkan pembuat LKPD AI.";
      setApiError(emptyKeyMsg);
      addNotification("error", emptyKeyMsg);
      setIsGeneratingLKPD(false);
      return;
    }

    setNotifications(prev => [
      {
        id: loadId,
        type: "loading",
        message: `🔄 Menghubungkan ke Gemini... Memulai penyusunan LKPD (${selectedPertemuan}) untuk: ${moduleTitle}.`,
        time: timeNow
      },
      ...prev
    ]);

    try {
      const progressTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => [
        {
          id: `progress-lkpd-${Date.now()}`,
          type: "info",
          message: "⚡ Menyusun Stimulus, Aktivitas Pembelajaran, Line-Art SVG, dan Asesmen Sumatif...",
          time: progressTime
        },
        ...prev
      ]);

      const response = await fetch("/api/generate-lkpd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          geminiApiKey: apiKey,
          selectedModule: selectedModule,
          selectedPertemuan: selectedPertemuan
        })
      });

      const text = await response.text();

      if (
        text.includes("Cookie check") || 
        text.includes("Action required to load your app") || 
        text.includes("redirectToReturnUrl") || 
        text.trim().startsWith("<!doctype html>") || 
        text.trim().startsWith("<!DOCTYPE html>")
      ) {
        throw new Error("COOKIE_CHECK_BLOCKED: Browser Anda memblokir cookie keamanan pihak ketiga. Silakan buka aplikasi di tab baru.");
      }

      if (!response.ok) {
        let errorMessage = `API error ${response.status}: ${text.slice(0, 200)}`;
        try {
          if (text.trim().startsWith("{")) {
            const errorJson = JSON.parse(text);
            if (errorJson.error) errorMessage = errorJson.error;
          }
        } catch (e) {
          console.error("Failed parsing error json:", e);
        }
        throw new Error(errorMessage);
      }

      const resData = JSON.parse(text);
      if (resData.status === "error" || !resData.lkpdContent) {
        throw new Error(resData.error || "Gagal memperoleh respon LKPD dari Gemini.");
      }

      const lkpdContent = resData.lkpdContent;

      const lkpdTitle = `LKPD: ${selectedModule.params?.mataPelajaran || selectedModule.matpel || "Pelajaran"} - ${selectedModule.params?.babTema || selectedModule.title || selectedModule.judul || "Bab"}`;

      const lkpdPlan: SavedLessonPlan = {
        id: `lkpd-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`,
        type: 'lkpd',
        typeDoc: 'lkpd',
        title: lkpdTitle,
        judul: lkpdTitle,
        matpel: selectedModule.params?.mataPelajaran || selectedModule.matpel || "",
        kelas: selectedModule.params?.kelas || selectedModule.kelas || "",
        fase: selectedModule.params?.fase || selectedModule.fase || "",
        jenjang: selectedModule.params?.jenjang || selectedModule.jenjang || "",
        tanggal: new Date().toISOString(),
        content: lkpdContent,
        params: selectedModule.params,
        markdownContent: selectedModule.markdownContent,
        lkpdContent: lkpdContent,
        createdAt: new Date().toISOString()
      };

      // Also update selected module with lkpdContent
      const updatedModule: SavedLessonPlan = {
        ...selectedModule,
        lkpdContent: lkpdContent
      };

      setActivePlan(lkpdPlan);

      const updatedHistory = [lkpdPlan, ...history.map(h => h.id === selectedModule.id ? updatedModule : h)];
      setHistory(updatedHistory);
      saveToLocalStorage(updatedHistory);

      const finishTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setNotifications(prev => [
        {
          id: `success-lkpd-${Date.now()}`,
          type: "success",
          message: `✅ LKPD AI (${selectedPertemuan}) berhasil digenerate dan tersimpan ke Riwayat!`,
          time: finishTime
        },
        ...prev
      ]);
    } catch (error: any) {
      console.error("Error generating LKPD:", error);
      let errMsg = error.message || "Terjadi kesalahan saat membuat LKPD AI.";
      setApiError(errMsg);
      addNotification("error", errMsg);
    } finally {
      setIsGeneratingLKPD(false);
    }
  };

  // Select an item from local history
  const handleSelectPlan = (plan: SavedLessonPlan) => {
    setActivePlan(plan);
    setApiError(null);

    // Auto-switch preview tab depending on document type
    if (plan.type === 'lkpd') {
      setActiveCenterTab("lkpd");
    } else {
      setActiveCenterTab("preview");
    }
    setMobileTab("preview");

    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const docTypeName = plan.type === 'lkpd' ? 'LKPD' : 'Modul Ajar';
    const docTitle = plan.params?.mataPelajaran
      ? `${plan.params.mataPelajaran} - ${plan.params.babTema}`
      : plan.title || plan.judul || "Dokumen";

    setNotifications(prev => [
      {
        id: Date.now(),
        type: "info",
        message: `Membuka draf ${docTypeName}: ${docTitle}`,
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
    const docTypeName = planToDelete?.type === 'lkpd' ? 'LKPD' : 'Modul Ajar';
    setNotifications(prev => [
      {
        id: Date.now(),
        type: "info",
        message: `Draf ${docTypeName} dihapus: ${planToDelete?.title || planToDelete?.judul || "Dokumen"}`,
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
    const docTypeName = updatedPlan.type === 'lkpd' ? 'LKPD' : 'Modul Ajar';
    addNotification("success", `${docTypeName} berhasil disimpan ke Riwayat Tersimpan.`);
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto lg:h-screen lg:max-h-screen lg:w-screen lg:overflow-hidden flex flex-col bg-slate-100 text-slate-900 dark:bg-[#0b1021] dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Application Header */}
      <header id="app-header" className="flex-none py-2.5 px-4 sm:px-6 md:px-8 bg-indigo-900 text-white border-b border-indigo-800 dark:bg-[#0f172a] dark:text-white dark:border-slate-800 flex items-center justify-between gap-4 shadow-md z-50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="border border-white/20 bg-white/10 p-1.5 rounded-lg shrink-0 flex items-center justify-center">
            <Files className="h-5 w-5 text-white stroke-[1.5]" />
          </div>
          <div className="flex flex-col justify-center text-left min-w-0">
            <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate flex items-center gap-2">
              <span className="truncate">Asisten Penyusunan Modul Ajar Madrasah</span>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-300/20 text-amber-100 border border-amber-200/30 dark:bg-sky-400/20 dark:text-sky-200 dark:border-sky-400/30 shadow-xs">
                v1.2.0
              </span>
            </h1>
            <p className="text-xs leading-tight font-normal text-amber-50/90 dark:text-blue-200/80 truncate mt-0.5">Cerdas dengan Deep Learning, Hangat dengan Kurikulum Berbasis Cinta (KBC)</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 text-xs font-medium">
          <button
            onClick={toggleTheme}
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
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
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            title="Hubungi Bantuan di WhatsApp"
          >
            Bantuan
          </a>
        </div>
      </header>

      {/* Mobile Navigation Tab Bar */}
      <div id="mobile-tab-bar" className="flex lg:hidden items-center justify-around bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 p-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-xs z-40 sticky top-0 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === "form"
              ? "bg-blue-600 text-white font-semibold shadow-xs"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Formulir</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === "preview"
              ? "bg-blue-600 text-white font-semibold shadow-xs"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("notifications")}
          className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
            mobileTab === "notifications"
              ? "bg-blue-600 text-white font-semibold shadow-xs"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifikasi</span>
          {notifications.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 lg:h-full w-full max-w-[1600px] mx-auto flex flex-col overflow-visible lg:overflow-hidden">
        
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
                <div id="error-bar" className="m-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start gap-4 text-sm text-slate-800 animate-fade-in shadow-sm shrink-0">
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
              <div id="error-bar" className="m-2 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-sm text-rose-800 animate-fade-in shadow-sm shrink-0">
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
        <div className="flex flex-col gap-4 p-3 w-full lg:grid lg:grid-cols-12 lg:gap-4 lg:p-4 lg:flex-1 lg:min-h-0 lg:h-full">
          
          {/* Column 1 (Left): Form & Quick Guide */}
          <div className={`col-span-12 lg:col-span-4 xl:col-span-4 h-auto lg:h-full min-h-0 ${mobileTab === "form" ? "flex" : "hidden lg:flex"} flex-col overflow-visible lg:overflow-hidden`}>
            <LessonPlanForm
              onSubmit={handleGeneratePlan}
              isGenerating={isGenerating}
              activePlan={activePlan}
              history={history}
              onSelectPlan={handleSelectPlan}
              onGenerateLKPD={handleGenerateLKPD}
              leftTab={leftTab}
              setLeftTab={setLeftTab}
              onSelectCenterTab={setActiveCenterTab}
              setNotifications={setNotifications}
            />
          </div>

          {/* Column 2 (Middle): Active Preview panel & history */}
          <div className={`col-span-12 lg:col-span-5 xl:col-span-5 h-auto lg:h-full min-h-0 ${mobileTab === "preview" ? "flex" : "hidden lg:flex"} flex-col overflow-visible lg:overflow-hidden`}>
            {/* Tab Contents */}
            <div className="flex-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-hidden flex flex-col">
              {activeCenterTab === "preview" && (
                <LessonPlanPreview
                  plan={activePlan}
                  onUpdatePlan={handleUpdatePlan}
                  isGenerating={isGenerating}
                  addNotification={addNotification}
                />
              )}

              {activeCenterTab === "lkpd" && (
                <LkpdPreview
                  plan={activePlan}
                  isGenerating={isGeneratingLKPD}
                  onUpdatePlan={handleUpdatePlan}
                  addNotification={addNotification}
                  onSwitchToLkpdTab={() => {
                    setLeftTab("lkpd");
                    setMobileTab("form");
                  }}
                />
              )}

              {activeCenterTab === "riwayat" && (
                <HistoryList
                  history={history}
                  onSelect={handleSelectPlan}
                  onDelete={handleDeletePlan}
                  selectedId={activePlan ? activePlan.id : null}
                />
              )}
            </div>

            {/* Tab Switcher - Compact bottom tab bar with 3 tabs */}
            <div className="sticky bottom-2 z-10 flex gap-1.5 p-1.5 bg-slate-100 dark:bg-[#0b1021]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl mt-2 flex-none shadow-xs backdrop-blur-md lg:static lg:shadow-none lg:backdrop-blur-none">
              <button
                type="button"
                id="tab-center-preview"
                onClick={() => setActiveCenterTab("preview")}
                className={`flex-1 py-1.5 px-2 h-8 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeCenterTab === "preview"
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
              >
                <span className="truncate">Preview Modul Ajar</span>
              </button>
              <button
                type="button"
                id="tab-center-lkpd"
                onClick={() => setActiveCenterTab("lkpd")}
                className={`flex-1 py-1.5 px-2 h-8 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeCenterTab === "lkpd"
                    ? "bg-amber-600 text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
              >
                <span className="truncate">Preview Lembar Kerja Peserta Didik</span>
              </button>
              <button
                type="button"
                id="tab-center-riwayat"
                onClick={() => setActiveCenterTab("riwayat")}
                className={`flex-1 py-1.5 px-2 h-8 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeCenterTab === "riwayat"
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
              >
                <span className="truncate">Riwayat</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0 ${
                  activeCenterTab === "riwayat"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}>
                  {history.length}
                </span>
              </button>
            </div>
          </div>

          {/* Column 3 (Right): Status & Pusat Notifikasi */}
          <div className={`col-span-12 lg:col-span-3 xl:col-span-3 h-auto lg:h-full min-h-0 ${mobileTab === "notifications" ? "flex" : "hidden lg:flex"} flex-col gap-3 overflow-visible lg:overflow-hidden`}>
            {/* Indicator panels from Vibrant Palette */}
            <div className="flex-none flex flex-col gap-2.5 w-full text-left">
              <div className="bg-white dark:bg-[#131b2e] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex items-center gap-3 shadow-xs dark:shadow-none transition-colors duration-200">
                <div className="bg-rose-100 dark:bg-rose-950/40 p-1.5 rounded-full text-rose-500 shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider mb-0.5">Love Index</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Sangat Tinggi</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex items-center gap-3 shadow-xs dark:shadow-none transition-colors duration-200">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-1.5 rounded-full text-amber-500 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider mb-0.5">Diferensiasi</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Aktif (AI Adjusted)</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex items-center gap-3 shadow-xs dark:shadow-none transition-colors duration-200">
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
            <div className="w-full flex-1 min-h-0 h-auto lg:h-full bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/70 shadow-sm dark:shadow-none rounded-2xl p-4 flex flex-col overflow-hidden transition-colors duration-200">
              <div className="flex-none flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <Bell className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-sky-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Pusat Notifikasi</span>
                    {notifications.length > 0 && (
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {notifications.length}
                      </span>
                    )}
                  </h3>
                </div>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="p-1.5 flex items-center justify-center text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
                    title="Bersihkan semua notifikasi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex-none border-b border-slate-100 dark:border-slate-800 my-2.5"></div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
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
                      className={`p-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 transition-all duration-200 animate-notif ${styleClasses}`}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${item.type === "loading" ? "animate-spin" : ""}`} />
                      <span className="flex-1 text-left font-medium">{item.message}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto whitespace-nowrap pt-0.5 font-mono">{item.time}</span>
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

      </main>

      {/* Footer */}
      <footer className="flex-none text-xs py-1.5 px-4 sm:px-6 md:px-8 text-center text-slate-500 dark:text-slate-400 w-full">
        © 2026 Asisten Penyusunan Modul Ajar Madrasah
      </footer>
    </div>
  );
}
