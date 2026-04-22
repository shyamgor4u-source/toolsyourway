import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================
// TRANSLATION DICTIONARIES
// ============================================================
type Dict = Record<string, string>;

const TRANSLATIONS: Record<string, Dict> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.pricing": "Pricing",
    "nav.login": "Sign In",
    "nav.signup": "Get Started",
    "nav.logout": "Sign Out",
    "hero.badge": "7-Day Free Trial \u2014 No Credit Card Required",
    "hero.title": "Your AI Company.",
    "hero.title.accent": "Operating Now.",
    "hero.subtitle": "9 specialized AI bots + Virtual AI Manager. Try everything free for 7 days \u2014 no card required. Keep what you need, pay only for what you use.",
    "hero.cta": "Start 7-Day Free Trial",
    "trial.daysLeft": "{n} days left",
    "trial.hoursLeft": "{n} hours left",
    "trial.endingSoon": "Trial ending soon",
    "trial.ended": "Your 7-day free trial has ended",
    "trial.resumeCta": "Get 3 More Days Free",
    "trial.upgradeCta": "Upgrade Now",
    "trial.lockInCta": "Lock in Founders Discount",
    "banner.onTrial": "on your free trial \u2014 all 9 bots unlocked",
    "usage.title": "Usage This Month",
    "usage.videos": "AI Videos",
    "usage.images": "AI Images",
    "usage.remaining": "{n} remaining",
    "usage.resetsIn": "Resets in {n} days",
    "usage.resetsTomorrow": "Resets tomorrow",
    "usage.buyCredits": "Buy Top-up Credits",
    "usage.upgradeMore": "Upgrade for more",
    "usage.pickPlan": "Pick a Plan",
    "usage.unlimited": "Unlimited Access",
    "plan.starter": "Starter",
    "plan.bundle": "All-9 Bundle",
    "plan.premium": "Bundle + AI Manager",
    "plan.trial": "Trial",
    "plan.perMonth": "per month",
    "plan.foundersDiscount": "Founders Discount \u2014 65% off until April 30, 2026",
    "credits.title": "Buy PAYG Credits",
    "credits.subtitle": "Top up credits to use beyond your monthly plan caps. 1 credit = 1 image. 2 credits = 1 video.",
    "credits.neverExpires": "Never expires",
    "credits.bestValue": "BEST VALUE",
    "credits.payWithCard": "Pay with Card",
    "credits.payWithUpi": "Pay with UPI / Razorpay",
    "common.loading": "Loading\u2026",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.continue": "Continue",
  },
  hi: {
    "nav.dashboard": "\u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921",
    "nav.pricing": "\u092E\u0942\u0932\u094D\u092F \u0928\u093F\u0930\u094D\u0927\u093E\u0930\u0923",
    "nav.login": "\u0938\u093E\u0907\u0928 \u0907\u0928",
    "nav.signup": "\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
    "nav.logout": "\u0932\u0949\u0917 \u0906\u0909\u091F",
    "hero.badge": "7-\u0926\u093F\u0928 \u0915\u093E \u092E\u0941\u092B\u094D\u0924 \u091F\u094D\u0930\u093E\u092F\u0932 \u2014 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u091C\u093C\u0930\u0942\u0930\u0940 \u0928\u0939\u0940\u0902",
    "hero.title": "\u0906\u092A\u0915\u0940 AI \u0915\u0902\u092A\u0928\u0940\u0964",
    "hero.title.accent": "\u0905\u092C \u0915\u093E\u092E \u0915\u0930 \u0930\u0939\u0940 \u0939\u0948\u0964",
    "hero.subtitle": "9 \u0935\u093F\u0936\u0947\u0937 AI \u092C\u0949\u091F + \u0935\u0930\u094D\u091A\u0941\u0905\u0932 AI \u092E\u0948\u0928\u0947\u091C\u0930\u0964 7 \u0926\u093F\u0928\u094B\u0902 \u0924\u0915 \u0938\u092C \u0915\u0941\u091B \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F \u0915\u0930\u0947\u0902 \u2014 \u0915\u093E\u0930\u094D\u0921 \u0915\u0940 \u091C\u0930\u0942\u0930\u0924 \u0928\u0939\u0940\u0902\u0964",
    "hero.cta": "7-\u0926\u093F\u0928 \u0915\u093E \u092E\u0941\u092B\u094D\u0924 \u091F\u094D\u0930\u093E\u092F\u0932 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
    "trial.daysLeft": "{n} \u0926\u093F\u0928 \u092C\u093E\u0915\u0940",
    "trial.hoursLeft": "{n} \u0918\u0902\u091F\u0947 \u092C\u093E\u0915\u0940",
    "trial.endingSoon": "\u091F\u094D\u0930\u093E\u092F\u0932 \u091C\u0932\u094D\u0926 \u0938\u092E\u093E\u092A\u094D\u0924",
    "trial.ended": "\u0906\u092A\u0915\u093E 7-\u0926\u093F\u0928 \u0915\u093E \u092E\u0941\u092B\u094D\u0924 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u092F\u093E \u0939\u0948",
    "trial.resumeCta": "3 \u0926\u093F\u0928 \u0914\u0930 \u092E\u0941\u092B\u094D\u0924",
    "trial.upgradeCta": "\u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902",
    "trial.lockInCta": "\u092B\u093E\u0909\u0902\u0921\u0930\u094D\u0938 \u0921\u093F\u0938\u094D\u0915\u093E\u0909\u0902\u091F \u0932\u0949\u0915 \u0915\u0930\u0947\u0902",
    "banner.onTrial": "\u0906\u092A\u0915\u0947 \u092E\u0941\u092B\u094D\u0924 \u091F\u094D\u0930\u093E\u092F\u0932 \u092A\u0930 \u2014 \u0938\u092D\u0940 9 \u092C\u0949\u091F \u0905\u0928\u0932\u0949\u0915",
    "usage.title": "\u0907\u0938 \u092E\u0939\u0940\u0928\u0947 \u0915\u093E \u0909\u092A\u092F\u094B\u0917",
    "usage.videos": "AI \u0935\u0940\u0921\u093F\u092F\u094B",
    "usage.images": "AI \u091A\u093F\u0924\u094D\u0930",
    "usage.remaining": "{n} \u092C\u093E\u0915\u0940",
    "usage.resetsIn": "{n} \u0926\u093F\u0928 \u092E\u0947\u0902 \u0930\u0940\u0938\u0947\u091F",
    "usage.resetsTomorrow": "\u0915\u0932 \u0930\u0940\u0938\u0947\u091F \u0939\u094B\u0917\u093E",
    "usage.buyCredits": "\u091F\u0949\u092A-\u0905\u092A \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0916\u0930\u0940\u0926\u0947\u0902",
    "usage.upgradeMore": "\u0905\u0927\u093F\u0915 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902",
    "usage.pickPlan": "\u092A\u094D\u0932\u093E\u0928 \u091A\u0941\u0928\u0947\u0902",
    "usage.unlimited": "\u0905\u0938\u0940\u092E\u093F\u0924 \u0910\u0915\u094D\u0938\u0947\u0938",
    "plan.starter": "\u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0930",
    "plan.bundle": "\u0938\u092D\u0940 9 \u092C\u0902\u0921\u0932",
    "plan.premium": "\u092C\u0902\u0921\u0932 + AI \u092E\u0948\u0928\u0947\u091C\u0930",
    "plan.trial": "\u091F\u094D\u0930\u093E\u092F\u0932",
    "plan.perMonth": "\u092A\u094D\u0930\u0924\u093F \u092E\u093E\u0939",
    "plan.foundersDiscount": "\u092B\u093E\u0909\u0902\u0921\u0930\u094D\u0938 \u0921\u093F\u0938\u094D\u0915\u093E\u0909\u0902\u091F \u2014 30 \u0905\u092A\u094D\u0930\u0948\u0932, 2026 \u0924\u0915 65% \u0911\u092B",
    "credits.title": "PAYG \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0916\u0930\u0940\u0926\u0947\u0902",
    "credits.subtitle": "\u092E\u093E\u0938\u093F\u0915 \u092A\u094D\u0932\u093E\u0928 \u092B\u093C\u0942\u0932-\u092B\u093C\u0941\u0932 \u092D\u0930\u0928\u0947 \u0915\u0947 \u092C\u093E\u0926 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u091C\u094B\u0921\u093C\u0947\u0902\u0964 1 \u091A\u093F\u0924\u094D\u0930 = 1 \u0915\u094D\u0930\u0947\u0921\u093F\u091F\u0964 1 \u0935\u0940\u0921\u093F\u092F\u094B = 2 \u0915\u094D\u0930\u0947\u0921\u093F\u091F\u0964",
    "credits.neverExpires": "\u0915\u092D\u0940 \u0938\u092E\u093E\u092A\u094D\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u093E",
    "credits.bestValue": "\u0938\u0930\u094D\u0935\u0936\u094D\u0930\u0947\u0937\u094D\u0920 \u092E\u0942\u0932\u094D\u092F",
    "credits.payWithCard": "\u0915\u093E\u0930\u094D\u0921 \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928",
    "credits.payWithUpi": "UPI / Razorpay \u0938\u0947",
    "common.loading": "\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026",
    "common.save": "\u0938\u0939\u0947\u091C\u0947\u0902",
    "common.cancel": "\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902",
    "common.continue": "\u091C\u093E\u0930\u0940 \u0930\u0916\u0947\u0902",
  },
  ar: {
    "nav.dashboard": "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
    "nav.pricing": "\u0627\u0644\u0623\u0633\u0639\u0627\u0631",
    "nav.login": "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
    "nav.signup": "\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646",
    "nav.logout": "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C",
    "hero.badge": "\u062A\u062C\u0631\u0628\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0645\u062F\u0629 7 \u0623\u064A\u0627\u0645 \u2014 \u0628\u062F\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062A\u0645\u0627\u0646",
    "hero.title": "\u0634\u0631\u0643\u062A\u0643 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
    "hero.title.accent": "\u062A\u0639\u0645\u0644 \u0627\u0644\u0622\u0646.",
    "hero.subtitle": "9 \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062A\u062E\u0635\u0635\u0629 + \u0645\u062F\u064A\u0631 \u0627\u0641\u062A\u0631\u0627\u0636\u064A. \u062C\u0631\u0651\u0628 \u0643\u0644 \u0634\u064A\u0621 \u0645\u062C\u0627\u0646\u064B\u0627 \u0644\u0645\u062F\u0629 7 \u0623\u064A\u0627\u0645.",
    "hero.cta": "\u0627\u0628\u062F\u0623 \u062A\u062C\u0631\u0628\u0629 7 \u0623\u064A\u0627\u0645 \u0645\u062C\u0627\u0646\u064B\u0627",
    "trial.daysLeft": "\u0628\u0627\u0642\u064A {n} \u0623\u064A\u0627\u0645",
    "trial.hoursLeft": "\u0628\u0627\u0642\u064A {n} \u0633\u0627\u0639\u0627\u062A",
    "trial.endingSoon": "\u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u064B\u0627",
    "trial.ended": "\u0627\u0646\u062A\u0647\u062A \u062A\u062C\u0631\u0628\u062A\u0643 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629",
    "trial.resumeCta": "\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 3 \u0623\u064A\u0627\u0645 \u0625\u0636\u0627\u0641\u064A\u0629",
    "trial.upgradeCta": "\u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0622\u0646",
    "trial.lockInCta": "\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u062E\u0635\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u064A\u0646",
    "banner.onTrial": "\u0641\u064A \u062A\u062C\u0631\u0628\u062A\u0643 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u062A\u0633\u0639\u0629 \u0645\u0641\u062A\u0648\u062D\u0629",
    "usage.title": "\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",
    "usage.videos": "\u0641\u064A\u062F\u064A\u0648 AI",
    "usage.images": "\u0635\u0648\u0631 AI",
    "usage.remaining": "\u0645\u062A\u0628\u0642\u064A {n}",
    "usage.resetsIn": "\u064A\u0639\u0627\u062F \u0636\u0628\u0637\u0647 \u062E\u0644\u0627\u0644 {n} \u0623\u064A\u0627\u0645",
    "usage.resetsTomorrow": "\u064A\u0639\u0627\u062F \u0636\u0628\u0637\u0647 \u063A\u062F\u064B\u0627",
    "usage.buyCredits": "\u0634\u0631\u0627\u0621 \u0631\u0635\u064A\u062F \u0625\u0636\u0627\u0641\u064A",
    "usage.upgradeMore": "\u062A\u0631\u0642\u064A\u0629 \u0644\u0644\u0645\u0632\u064A\u062F",
    "usage.pickPlan": "\u0627\u062E\u062A\u0631 \u062E\u0637\u0629",
    "usage.unlimited": "\u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F",
    "plan.starter": "\u0645\u0628\u062A\u062F\u0626",
    "plan.bundle": "\u062D\u0632\u0645\u0629 \u0627\u0644\u0640 9",
    "plan.premium": "\u062D\u0632\u0645\u0629 + \u0645\u062F\u064A\u0631 AI",
    "plan.trial": "\u062A\u062C\u0631\u0628\u0629",
    "plan.perMonth": "\u0634\u0647\u0631\u064A\u0627\u064B",
    "plan.foundersDiscount": "\u062E\u0635\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u064A\u0646 \u2014 65% \u062D\u062A\u0649 30 \u0623\u0628\u0631\u064A\u0644",
    "credits.title": "\u0634\u0631\u0627\u0621 \u0631\u0635\u064A\u062F PAYG",
    "credits.subtitle": "\u0623\u0636\u0641 \u0631\u0635\u064A\u062F\u064B\u0627 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647 \u0628\u0639\u062F \u062D\u062F\u0648\u062F \u062E\u0637\u062A\u0643 \u0627\u0644\u0634\u0647\u0631\u064A\u0629.",
    "credits.neverExpires": "\u0644\u0627 \u064A\u0646\u062A\u0647\u064A \u0623\u0628\u062F\u064B\u0627",
    "credits.bestValue": "\u0623\u0641\u0636\u0644 \u0642\u064A\u0645\u0629",
    "credits.payWithCard": "\u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629",
    "credits.payWithUpi": "UPI / Razorpay",
    "common.loading": "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026",
    "common.save": "\u062D\u0641\u0638",
    "common.cancel": "\u0625\u0644\u063A\u0627\u0621",
    "common.continue": "\u0645\u062A\u0627\u0628\u0639\u0629",
  },
  id: {
    "nav.dashboard": "Dasbor",
    "nav.pricing": "Harga",
    "nav.login": "Masuk",
    "nav.signup": "Mulai",
    "nav.logout": "Keluar",
    "hero.badge": "Uji Coba Gratis 7 Hari \u2014 Tanpa Kartu Kredit",
    "hero.title": "Perusahaan AI Anda.",
    "hero.title.accent": "Beroperasi Sekarang.",
    "hero.subtitle": "9 bot AI khusus + Manajer AI Virtual. Coba semuanya gratis selama 7 hari \u2014 tanpa kartu.",
    "hero.cta": "Mulai Uji Coba 7 Hari Gratis",
    "trial.daysLeft": "{n} hari tersisa",
    "trial.hoursLeft": "{n} jam tersisa",
    "trial.endingSoon": "Uji coba segera berakhir",
    "trial.ended": "Uji coba 7 hari Anda telah berakhir",
    "trial.resumeCta": "Dapatkan 3 Hari Lagi Gratis",
    "trial.upgradeCta": "Tingkatkan Sekarang",
    "trial.lockInCta": "Kunci Diskon Founders",
    "banner.onTrial": "pada uji coba gratis Anda \u2014 semua 9 bot terbuka",
    "usage.title": "Penggunaan Bulan Ini",
    "usage.videos": "Video AI",
    "usage.images": "Gambar AI",
    "usage.remaining": "{n} tersisa",
    "usage.resetsIn": "Reset dalam {n} hari",
    "usage.resetsTomorrow": "Reset besok",
    "usage.buyCredits": "Beli Kredit Tambahan",
    "usage.upgradeMore": "Tingkatkan untuk lebih",
    "usage.pickPlan": "Pilih Paket",
    "usage.unlimited": "Akses Tak Terbatas",
    "plan.starter": "Pemula",
    "plan.bundle": "Paket 9 Bot",
    "plan.premium": "Paket + Manajer AI",
    "plan.trial": "Uji Coba",
    "plan.perMonth": "per bulan",
    "plan.foundersDiscount": "Diskon Founders \u2014 65% hingga 30 April 2026",
    "credits.title": "Beli Kredit PAYG",
    "credits.subtitle": "Tambah kredit untuk pemakaian di luar batas paket bulanan.",
    "credits.neverExpires": "Tidak pernah kedaluwarsa",
    "credits.bestValue": "NILAI TERBAIK",
    "credits.payWithCard": "Bayar dengan Kartu",
    "credits.payWithUpi": "UPI / Razorpay",
    "common.loading": "Memuat\u2026",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.continue": "Lanjutkan",
  },
};

// ============================================================
// GEO DATA
// ============================================================
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
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ============================================================
// I18N CONTEXT
// ============================================================
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

// In-memory language preference (sandbox-safe; persists for session)
let inMemoryLang: string | null = null;

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: geo } = useGeo();
  const [lang, setLangState] = useState<string>("en");
  const [manuallyChosen, setManuallyChosen] = useState(false);

  // Auto-set language from geo on first load
  useEffect(() => {
    if (geo && !manuallyChosen && !inMemoryLang) {
      if (TRANSLATIONS[geo.language]) {
        setLangState(geo.language);
        inMemoryLang = geo.language;
      }
    }
  }, [geo, manuallyChosen]);

  // Apply dir=rtl to <html> when Arabic
  useEffect(() => {
    const isRtl = lang === "ar";
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
    // Use locale-aware number formatting
    const localeMap: Record<string, string> = {
      en: "en-US", hi: "hi-IN", ar: "ar-SA", id: "id-ID", vi: "vi-VN", th: "th-TH",
      es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", nl: "nl-NL", pt: "pt-BR", ms: "ms-MY",
    };
    const locale = localeMap[lang] || "en-US";
    const formatted = new Intl.NumberFormat(locale).format(localAmount);
    return `${currencySymbol}${formatted}`;
  };

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
        rtl: geo?.rtl || lang === "ar",
        langName: geo?.langName || "English",
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

// Available languages for the switcher
export const AVAILABLE_LANGS = [
  { code: "en", name: "English" },
  { code: "hi", name: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "id", name: "Bahasa Indonesia" },
];
