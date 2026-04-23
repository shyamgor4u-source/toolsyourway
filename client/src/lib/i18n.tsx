import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TRANSLATIONS, AVAILABLE_LANGS } from "@/lib/translations";

// Re-export so existing imports keep working
export { AVAILABLE_LANGS };

export interface GeoData {
  country: string;
  currency: string;
  currencySymbol: string;
  rate: number;
  language: string;
  langName: string;
  rtl?: boolean;
}

export function useGeo() {
  return useQuery<GeoData>({
    queryKey: ["/api/geo"],
    queryFn: async () => (await apiRequest("GET", "/api/geo")).json(),
    staleTime: 1000 * 60 * 60,
  });
}

interface I18nContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  country: string;
  currency: string;
  currencySymbol: string;
  rate: number;
  rtl: boolean;
  langName: string;
  formatLocal: (usdCents: number) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

let inMemoryLang: string | null = null;

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: geo } = useGeo();
  const [lang, setLangState] = useState<string>("en");
  const [manuallyChosen, setManuallyChosen] = useState(false);

  useEffect(() => {
    if (geo && !manuallyChosen && !inMemoryLang) {
      if (TRANSLATIONS[geo.language]) {
        setLangState(geo.language);
        inMemoryLang = geo.language;
      }
    }
  }, [geo, manuallyChosen]);

  useEffect(() => {
    const langEntry = AVAILABLE_LANGS.find((l) => l.code === lang);
    const isRtl = !!langEntry?.rtl;
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = (newLang: string) => {
    inMemoryLang = newLang;
    setManuallyChosen(true);
    setLangState(newLang);
  };

  const t = useMemo(() => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const fallback = TRANSLATIONS.en;
    return (key: string, vars?: Record<string, string | number>) => {
      let str = dict[key] || fallback[key] || key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    };
  }, [lang]);

  const currency = geo?.currency || "USD";
  const currencySymbol = geo?.currencySymbol || "$";
  const rate = geo?.rate || 1;

  const formatLocal = (usdCents: number) => {
    const localAmount = Math.round((usdCents / 100) * rate);
    const localeMap: Record<string, string> = {
      en: "en-US", hi: "hi-IN", ar: "ar-SA", bn: "bn-IN", ta: "ta-IN", te: "te-IN",
      mr: "mr-IN", gu: "gu-IN", id: "id-ID", vi: "vi-VN", th: "th-TH",
      es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", nl: "nl-NL", pt: "pt-BR", ms: "ms-MY",
    };
    const locale = localeMap[lang] || "en-US";
    const formatted = new Intl.NumberFormat(locale).format(localAmount);
    return `${currencySymbol}${formatted}`;
  };

  const langEntry = AVAILABLE_LANGS.find((l) => l.code === lang);
  const rtl = !!langEntry?.rtl;

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        country: geo?.country || "US",
        currency,
        currencySymbol,
        rate,
        rtl,
        langName: langEntry?.name || "English",
        formatLocal,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
