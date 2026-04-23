// Translation dictionaries for all supported languages.
// Keys follow namespace.key convention. Unicode characters inline \u2014 NOT escaped.

export type Dict = Record<string, string>;

// ============================================================
// ENGLISH (base, always loaded)
// ============================================================
const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.pricing": "Pricing",
  "nav.login": "Sign In",
  "nav.signup": "Get Started",
  "nav.logout": "Sign Out",
  "nav.admin": "Admin",
  "nav.founders": "Founders",
  "nav.influencers": "Influencers",
  "nav.outreach": "Outreach",

  "hero.badge": "7-Day Free Trial — No Credit Card Required",
  "hero.title": "Your AI Company.",
  "hero.title.accent": "Operating Now.",
  "hero.subtitle": "9 specialized AI bots + Virtual AI Manager. Try everything free for 7 days — no card required. Keep what you need, pay only for what you use.",
  "hero.cta": "Start 7-Day Free Trial",
  "hero.pricing": "See Pricing",

  "trial.daysLeft": "{n} days left",
  "trial.hoursLeft": "{n} hours left",
  "trial.endingSoon": "Trial ending soon",
  "trial.ended": "Your 7-day free trial has ended",
  "trial.resumeCta": "Get 3 More Days Free",
  "trial.upgradeCta": "Upgrade Now",
  "trial.lockInCta": "Lock in Founders Discount",
  "trial.previewMode": "Preview Mode — trial ended",

  "banner.onTrial": "on your free trial — all 9 bots unlocked",

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
  "plan.foundersDiscount": "Founders Discount — 65% off until April 30, 2026",

  "credits.title": "Buy PAYG Credits",
  "credits.subtitle": "Top up credits to use beyond your monthly plan caps. 1 credit = 1 image. 2 credits = 1 video.",
  "credits.neverExpires": "Never expires",
  "credits.bestValue": "BEST VALUE",
  "credits.payWithCard": "Pay with Card",
  "credits.payWithUpi": "Pay with UPI / Razorpay",

  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.continue": "Continue",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
};

// ============================================================
// HINDI (हिन्दी)
// ============================================================
const hi: Dict = {
  "nav.dashboard": "डैशबोर्ड",
  "nav.pricing": "मूल्य निर्धारण",
  "nav.login": "साइन इन",
  "nav.signup": "शुरू करें",
  "nav.logout": "लॉग आउट",
  "nav.admin": "एडमिन",
  "nav.founders": "संस्थापक",
  "nav.influencers": "इन्फ्लुएंसर",
  "nav.outreach": "आउटरीच",

  "hero.badge": "7-दिन का मुफ्त ट्रायल — क्रेडिट कार्ड जरूरी नहीं",
  "hero.title": "आपकी AI कंपनी।",
  "hero.title.accent": "अब काम कर रही है।",
  "hero.subtitle": "9 विशेष AI बॉट + वर्चुअल AI मैनेजर। 7 दिनों तक सब कुछ फ्री ट्राय करें — कार्ड की जरूरत नहीं।",
  "hero.cta": "7-दिन का मुफ्त ट्रायल शुरू करें",
  "hero.pricing": "मूल्य देखें",

  "trial.daysLeft": "{n} दिन बाकी",
  "trial.hoursLeft": "{n} घंटे बाकी",
  "trial.endingSoon": "ट्रायल जल्द समाप्त",
  "trial.ended": "आपका 7-दिन का मुफ्त ट्रायल समाप्त हो गया है",
  "trial.resumeCta": "3 दिन और मुफ्त",
  "trial.upgradeCta": "अपग्रेड करें",
  "trial.lockInCta": "फाउंडर्स डिस्काउंट लॉक करें",
  "trial.previewMode": "प्रीव्यू मोड — ट्रायल समाप्त",

  "banner.onTrial": "आपके मुफ्त ट्रायल पर — सभी 9 बॉट अनलॉक",

  "usage.title": "इस महीने का उपयोग",
  "usage.videos": "AI वीडियो",
  "usage.images": "AI चित्र",
  "usage.remaining": "{n} बाकी",
  "usage.resetsIn": "{n} दिन में रीसेट",
  "usage.resetsTomorrow": "कल रीसेट होगा",
  "usage.buyCredits": "टॉप-अप क्रेडिट खरीदें",
  "usage.upgradeMore": "अधिक के लिए अपग्रेड करें",
  "usage.pickPlan": "प्लान चुनें",
  "usage.unlimited": "असीमित एक्सेस",

  "plan.starter": "स्टार्टर",
  "plan.bundle": "सभी 9 बंडल",
  "plan.premium": "बंडल + AI मैनेजर",
  "plan.trial": "ट्रायल",
  "plan.perMonth": "प्रति माह",
  "plan.foundersDiscount": "फाउंडर्स डिस्काउंट — 30 अप्रैल, 2026 तक 65% ऑफ",

  "credits.title": "PAYG क्रेडिट खरीदें",
  "credits.subtitle": "मासिक प्लान फ़ूल-फ़ुल भरने के बाद क्रेडिट जोड़ें। 1 चित्र = 1 क्रेडिट। 1 वीडियो = 2 क्रेडिट।",
  "credits.neverExpires": "कभी समाप्त नहीं होता",
  "credits.bestValue": "सर्वश्रेष्ठ मूल्य",
  "credits.payWithCard": "कार्ड से भुगतान",
  "credits.payWithUpi": "UPI / Razorpay से",

  "common.loading": "लोड हो रहा है…",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.continue": "जारी रखें",
  "common.delete": "हटाएं",
  "common.edit": "संपादित करें",
  "common.close": "बंद करें",
};

// ============================================================
// ARABIC (العربية) - RTL
// ============================================================
const ar: Dict = {
  "nav.dashboard": "لوحة التحكم",
  "nav.pricing": "الأسعار",
  "nav.login": "تسجيل الدخول",
  "nav.signup": "ابدأ الآن",
  "nav.logout": "تسجيل الخروج",
  "nav.admin": "المسؤول",
  "nav.founders": "المؤسسون",
  "nav.influencers": "المؤثرون",
  "nav.outreach": "التواصل",

  "hero.badge": "تجربة مجانية لمدة 7 أيام — بدون بطاقة ائتمان",
  "hero.title": "شركتك بالذكاء الاصطناعي.",
  "hero.title.accent": "تعمل الآن.",
  "hero.subtitle": "9 روبوتات ذكاء اصطناعي متخصصة + مدير افتراضي. جرّب كل شيء مجاناً لمدة 7 أيام.",
  "hero.cta": "ابدأ تجربة 7 أيام مجاناً",
  "hero.pricing": "شاهد الأسعار",

  "trial.daysLeft": "باقي {n} أيام",
  "trial.hoursLeft": "باقي {n} ساعات",
  "trial.endingSoon": "التجربة تنتهي قريباً",
  "trial.ended": "انتهت تجربتك المجانية",
  "trial.resumeCta": "احصل على 3 أيام إضافية",
  "trial.upgradeCta": "الترقية الآن",
  "trial.lockInCta": "احصل على خصم المؤسسين",
  "trial.previewMode": "وضع المعاينة — انتهت التجربة",

  "banner.onTrial": "في تجربتك المجانية — جميع الروبوتات التسعة مفتوحة",

  "usage.title": "الاستخدام هذا الشهر",
  "usage.videos": "فيديو AI",
  "usage.images": "صور AI",
  "usage.remaining": "متبقي {n}",
  "usage.resetsIn": "يعاد ضبطه خلال {n} أيام",
  "usage.resetsTomorrow": "يعاد ضبطه غداً",
  "usage.buyCredits": "شراء رصيد إضافي",
  "usage.upgradeMore": "ترقية للمزيد",
  "usage.pickPlan": "اختر خطة",
  "usage.unlimited": "وصول غير محدود",

  "plan.starter": "مبتدئ",
  "plan.bundle": "حزمة الـ 9",
  "plan.premium": "حزمة + مدير AI",
  "plan.trial": "تجربة",
  "plan.perMonth": "شهرياً",
  "plan.foundersDiscount": "خصم المؤسسين — 65% حتى 30 أبريل",

  "credits.title": "شراء رصيد PAYG",
  "credits.subtitle": "أضف رصيداً لاستخدامه بعد حدود خطتك الشهرية.",
  "credits.neverExpires": "لا ينتهي أبداً",
  "credits.bestValue": "أفضل قيمة",
  "credits.payWithCard": "الدفع بالبطاقة",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "جاري التحميل…",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.continue": "متابعة",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.close": "إغلاق",
};

// ============================================================
// BENGALI (বাংলা)
// ============================================================
const bn: Dict = {
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.pricing": "মূল্য",
  "nav.login": "সাইন ইন",
  "nav.signup": "শুরু করুন",
  "nav.logout": "লগ আউট",
  "nav.admin": "অ্যাডমিন",
  "nav.founders": "প্রতিষ্ঠাতা",
  "nav.influencers": "ইনফ্লুয়েন্সার",
  "nav.outreach": "আউটরিচ",

  "hero.badge": "৭-দিনের ফ্রি ট্রায়াল — ক্রেডিট কার্ড লাগবে না",
  "hero.title": "আপনার AI কোম্পানি।",
  "hero.title.accent": "এখনই চালু।",
  "hero.subtitle": "৯টি বিশেষ AI বট + ভার্চুয়াল AI ম্যানেজার। ৭ দিন সব কিছু ফ্রি ট্রাই করুন।",
  "hero.cta": "৭-দিনের ফ্রি ট্রায়াল শুরু করুন",
  "hero.pricing": "মূল্য দেখুন",

  "trial.daysLeft": "{n} দিন বাকি",
  "trial.hoursLeft": "{n} ঘণ্টা বাকি",
  "trial.endingSoon": "ট্রায়াল শীঘ্রই শেষ",
  "trial.ended": "আপনার ৭-দিনের ফ্রি ট্রায়াল শেষ হয়েছে",
  "trial.resumeCta": "আরও ৩ দিন ফ্রি",
  "trial.upgradeCta": "আপগ্রেড করুন",
  "trial.lockInCta": "ফাউন্ডার্স ডিসকাউন্ট লক করুন",
  "trial.previewMode": "প্রিভিউ মোড — ট্রায়াল শেষ",

  "banner.onTrial": "আপনার ফ্রি ট্রায়ালে — সব ৯টি বট আনলকড",

  "usage.title": "এই মাসের ব্যবহার",
  "usage.videos": "AI ভিডিও",
  "usage.images": "AI ছবি",
  "usage.remaining": "{n} বাকি",
  "usage.resetsIn": "{n} দিনে রিসেট",
  "usage.resetsTomorrow": "কাল রিসেট হবে",
  "usage.buyCredits": "টপ-আপ ক্রেডিট কিনুন",
  "usage.upgradeMore": "আরও জন্য আপগ্রেড করুন",
  "usage.pickPlan": "একটি প্ল্যান বেছে নিন",
  "usage.unlimited": "সীমাহীন অ্যাক্সেস",

  "plan.starter": "স্টার্টার",
  "plan.bundle": "সব ৯ বান্ডল",
  "plan.premium": "বান্ডল + AI ম্যানেজার",
  "plan.trial": "ট্রায়াল",
  "plan.perMonth": "প্রতি মাসে",
  "plan.foundersDiscount": "ফাউন্ডার্স ডিসকাউন্ট — ৩০ এপ্রিল পর্যন্ত ৬৫% ছাড়",

  "credits.title": "PAYG ক্রেডিট কিনুন",
  "credits.subtitle": "মাসিক প্ল্যান সীমার বাইরে ব্যবহারের জন্য ক্রেডিট যোগ করুন।",
  "credits.neverExpires": "কখনও মেয়াদ শেষ হয় না",
  "credits.bestValue": "সেরা মূল্য",
  "credits.payWithCard": "কার্ড দিয়ে পেমেন্ট",
  "credits.payWithUpi": "UPI / Razorpay দিয়ে",

  "common.loading": "লোড হচ্ছে…",
  "common.save": "সংরক্ষণ করুন",
  "common.cancel": "বাতিল",
  "common.continue": "চালিয়ে যান",
  "common.delete": "মুছুন",
  "common.edit": "সম্পাদনা",
  "common.close": "বন্ধ",
};

// ============================================================
// TAMIL (தமிழ்)
// ============================================================
const ta: Dict = {
  "nav.dashboard": "டாஷ்போர்டு",
  "nav.pricing": "விலை",
  "nav.login": "உள்நுழை",
  "nav.signup": "தொடங்கு",
  "nav.logout": "வெளியேறு",
  "nav.admin": "நிர்வாகி",
  "nav.founders": "நிறுவனர்கள்",
  "nav.influencers": "செல்வாக்காளர்கள்",
  "nav.outreach": "தொடர்பு",

  "hero.badge": "7-நாள் இலவச சோதனை — கிரெடிட் கார்டு தேவையில்லை",
  "hero.title": "உங்கள் AI நிறுவனம்.",
  "hero.title.accent": "இப்போது இயங்குகிறது.",
  "hero.subtitle": "9 சிறப்பு AI பாட்கள் + மெய்நிகர் AI மேலாளர். 7 நாட்களுக்கு அனைத்தையும் இலவசமாக முயற்சிக்கவும்.",
  "hero.cta": "7-நாள் இலவச சோதனை தொடங்கு",
  "hero.pricing": "விலை பார்க்க",

  "trial.daysLeft": "{n} நாட்கள் மீதம்",
  "trial.hoursLeft": "{n} மணி நேரம் மீதம்",
  "trial.endingSoon": "சோதனை விரைவில் முடிகிறது",
  "trial.ended": "உங்கள் இலவச சோதனை முடிந்தது",
  "trial.resumeCta": "மேலும் 3 நாட்கள் இலவசம்",
  "trial.upgradeCta": "இப்போதே மேம்படுத்து",
  "trial.lockInCta": "நிறுவனர் தள்ளுபடி பூட்டு",
  "trial.previewMode": "முன்னோட்ட முறை — சோதனை முடிந்தது",

  "banner.onTrial": "உங்கள் இலவச சோதனையில் — 9 பாட்களும் திறக்கப்பட்டுள்ளன",

  "usage.title": "இந்த மாத பயன்பாடு",
  "usage.videos": "AI வீடியோக்கள்",
  "usage.images": "AI படங்கள்",
  "usage.remaining": "{n} மீதம்",
  "usage.resetsIn": "{n} நாட்களில் மீட்டமை",
  "usage.resetsTomorrow": "நாளை மீட்டமைக்கப்படும்",
  "usage.buyCredits": "கூடுதல் கிரெடிட்கள் வாங்கு",
  "usage.upgradeMore": "மேலும் பெற மேம்படுத்து",
  "usage.pickPlan": "திட்டம் தேர்ந்தெடு",
  "usage.unlimited": "வரம்பற்ற அணுகல்",

  "plan.starter": "தொடக்க",
  "plan.bundle": "9 தொகுப்பு",
  "plan.premium": "தொகுப்பு + AI மேலாளர்",
  "plan.trial": "சோதனை",
  "plan.perMonth": "மாதத்திற்கு",
  "plan.foundersDiscount": "நிறுவனர் தள்ளுபடி — ஏப்ரல் 30 வரை 65% தள்ளுபடி",

  "credits.title": "PAYG கிரெடிட்கள் வாங்கு",
  "credits.subtitle": "மாதாந்திர வரம்புகளுக்கு அப்பால் பயன்படுத்த கிரெடிட்கள் சேர்க்கவும்.",
  "credits.neverExpires": "ஒருபோதும் காலாவதியாகாது",
  "credits.bestValue": "சிறந்த மதிப்பு",
  "credits.payWithCard": "கார்டு மூலம் செலுத்து",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "ஏற்றப்படுகிறது…",
  "common.save": "சேமி",
  "common.cancel": "ரத்து",
  "common.continue": "தொடர",
  "common.delete": "நீக்கு",
  "common.edit": "திருத்து",
  "common.close": "மூடு",
};

// ============================================================
// TELUGU (తెలుగు)
// ============================================================
const te: Dict = {
  "nav.dashboard": "డాష్‌బోర్డ్",
  "nav.pricing": "ధర",
  "nav.login": "సైన్ ఇన్",
  "nav.signup": "ప్రారంభించండి",
  "nav.logout": "సైన్ అవుట్",
  "nav.admin": "అడ్మిన్",
  "nav.founders": "వ్యవస్థాపకులు",
  "nav.influencers": "ప్రభావవంతులు",
  "nav.outreach": "అవుట్‌రీచ్",

  "hero.badge": "7-రోజుల ఉచిత ట్రయల్ — క్రెడిట్ కార్డ్ అవసరం లేదు",
  "hero.title": "మీ AI కంపెనీ.",
  "hero.title.accent": "ఇప్పుడే పనిచేస్తోంది.",
  "hero.subtitle": "9 ప్రత్యేక AI బాట్‌లు + వర్చువల్ AI మేనేజర్. 7 రోజులు అన్నీ ఉచితంగా ప్రయత్నించండి.",
  "hero.cta": "7-రోజుల ఉచిత ట్రయల్ ప్రారంభించండి",
  "hero.pricing": "ధరలు చూడండి",

  "trial.daysLeft": "{n} రోజులు మిగిలాయి",
  "trial.hoursLeft": "{n} గంటలు మిగిలాయి",
  "trial.endingSoon": "ట్రయల్ త్వరలో ముగుస్తుంది",
  "trial.ended": "మీ ఉచిత ట్రయల్ ముగిసింది",
  "trial.resumeCta": "మరో 3 రోజులు ఉచితం",
  "trial.upgradeCta": "ఇప్పుడే అప్‌గ్రేడ్",
  "trial.lockInCta": "ఫౌండర్స్ డిస్కౌంట్ లాక్ చేయండి",
  "trial.previewMode": "ప్రివ్యూ మోడ్ — ట్రయల్ ముగిసింది",

  "banner.onTrial": "మీ ఉచిత ట్రయల్‌లో — అన్ని 9 బాట్‌లు అన్‌లాక్",

  "usage.title": "ఈ నెల వినియోగం",
  "usage.videos": "AI వీడియోలు",
  "usage.images": "AI చిత్రాలు",
  "usage.remaining": "{n} మిగిలింది",
  "usage.resetsIn": "{n} రోజుల్లో రీసెట్",
  "usage.resetsTomorrow": "రేపు రీసెట్ అవుతుంది",
  "usage.buyCredits": "టాప్-అప్ క్రెడిట్‌లు కొనండి",
  "usage.upgradeMore": "మరింత కోసం అప్‌గ్రేడ్",
  "usage.pickPlan": "ప్లాన్ ఎంచుకోండి",
  "usage.unlimited": "అపరిమిత యాక్సెస్",

  "plan.starter": "స్టార్టర్",
  "plan.bundle": "అన్ని 9 బండిల్",
  "plan.premium": "బండిల్ + AI మేనేజర్",
  "plan.trial": "ట్రయల్",
  "plan.perMonth": "నెలకు",
  "plan.foundersDiscount": "ఫౌండర్స్ డిస్కౌంట్ — ఏప్రిల్ 30 వరకు 65%",

  "credits.title": "PAYG క్రెడిట్‌లు కొనండి",
  "credits.subtitle": "నెలవారీ ప్లాన్ పరిమితులను మించి ఉపయోగించడానికి క్రెడిట్‌లు జోడించండి.",
  "credits.neverExpires": "ఎప్పటికీ ముగియదు",
  "credits.bestValue": "ఉత్తమ విలువ",
  "credits.payWithCard": "కార్డుతో చెల్లించండి",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "లోడ్ అవుతోంది…",
  "common.save": "సేవ్",
  "common.cancel": "రద్దు",
  "common.continue": "కొనసాగించు",
  "common.delete": "తొలగించు",
  "common.edit": "సవరించు",
  "common.close": "మూసివేయి",
};

// ============================================================
// MARATHI (मराठी)
// ============================================================
const mr: Dict = {
  "nav.dashboard": "डॅशबोर्ड",
  "nav.pricing": "किंमत",
  "nav.login": "साइन इन",
  "nav.signup": "सुरू करा",
  "nav.logout": "लॉग आउट",
  "nav.admin": "अॅडमिन",
  "nav.founders": "संस्थापक",
  "nav.influencers": "इन्फ्लुएंसर",
  "nav.outreach": "आउटरीच",

  "hero.badge": "7-दिवसांची मोफत चाचणी — क्रेडिट कार्डची गरज नाही",
  "hero.title": "तुमची AI कंपनी.",
  "hero.title.accent": "आता कार्यरत.",
  "hero.subtitle": "9 विशेष AI बॉट + व्हर्च्युअल AI मॅनेजर. 7 दिवस सर्व काही मोफत वापरा.",
  "hero.cta": "7-दिवसांची मोफत चाचणी सुरू करा",
  "hero.pricing": "किंमत पहा",

  "trial.daysLeft": "{n} दिवस बाकी",
  "trial.hoursLeft": "{n} तास बाकी",
  "trial.endingSoon": "चाचणी लवकरच संपेल",
  "trial.ended": "तुमची मोफत चाचणी संपली आहे",
  "trial.resumeCta": "आणखी 3 दिवस मोफत",
  "trial.upgradeCta": "आत्ता अपग्रेड करा",
  "trial.lockInCta": "फाउंडर्स डिस्काउंट लॉक करा",
  "trial.previewMode": "प्रीव्ह्यू मोड — चाचणी संपली",

  "banner.onTrial": "तुमच्या मोफत चाचणीवर — सर्व 9 बॉट अनलॉक्ड",

  "usage.title": "या महिन्याचा वापर",
  "usage.videos": "AI व्हिडिओ",
  "usage.images": "AI प्रतिमा",
  "usage.remaining": "{n} शिल्लक",
  "usage.resetsIn": "{n} दिवसांत रीसेट",
  "usage.resetsTomorrow": "उद्या रीसेट होईल",
  "usage.buyCredits": "टॉप-अप क्रेडिट खरेदी करा",
  "usage.upgradeMore": "अधिकसाठी अपग्रेड करा",
  "usage.pickPlan": "प्लॅन निवडा",
  "usage.unlimited": "अमर्यादित प्रवेश",

  "plan.starter": "स्टार्टर",
  "plan.bundle": "सर्व 9 बंडल",
  "plan.premium": "बंडल + AI मॅनेजर",
  "plan.trial": "चाचणी",
  "plan.perMonth": "दरमहा",
  "plan.foundersDiscount": "फाउंडर्स डिस्काउंट — 30 एप्रिलपर्यंत 65%",

  "credits.title": "PAYG क्रेडिट्स खरेदी करा",
  "credits.subtitle": "मासिक प्लॅन मर्यादेपलीकडे वापरण्यासाठी क्रेडिट जोडा.",
  "credits.neverExpires": "कधीही कालबाह्य होत नाही",
  "credits.bestValue": "सर्वोत्तम मूल्य",
  "credits.payWithCard": "कार्डने पैसे द्या",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "लोड होत आहे…",
  "common.save": "जतन करा",
  "common.cancel": "रद्द",
  "common.continue": "सुरू ठेवा",
  "common.delete": "हटवा",
  "common.edit": "संपादित",
  "common.close": "बंद",
};

// ============================================================
// GUJARATI (ગુજરાતી)
// ============================================================
const gu: Dict = {
  "nav.dashboard": "ડેશબોર્ડ",
  "nav.pricing": "ભાવ",
  "nav.login": "સાઇન ઇન",
  "nav.signup": "શરૂ કરો",
  "nav.logout": "લોગ આઉટ",
  "nav.admin": "એડમિન",
  "nav.founders": "સ્થાપકો",
  "nav.influencers": "ઇન્ફ્લુએન્સર",
  "nav.outreach": "આઉટરીચ",

  "hero.badge": "7-દિવસની મફત ટ્રાયલ — ક્રેડિટ કાર્ડ જરૂરી નથી",
  "hero.title": "તમારી AI કંપની.",
  "hero.title.accent": "હવે કાર્યરત.",
  "hero.subtitle": "9 વિશેષ AI બોટ + વર્ચ્યુઅલ AI મેનેજર. 7 દિવસ બધું મફત અજમાવો.",
  "hero.cta": "7-દિવસની મફત ટ્રાયલ શરૂ કરો",
  "hero.pricing": "ભાવ જુઓ",

  "trial.daysLeft": "{n} દિવસ બાકી",
  "trial.hoursLeft": "{n} કલાક બાકી",
  "trial.endingSoon": "ટ્રાયલ ટૂંક સમયમાં સમાપ્ત",
  "trial.ended": "તમારી મફત ટ્રાયલ સમાપ્ત થઈ ગઈ છે",
  "trial.resumeCta": "વધુ 3 દિવસ મફત",
  "trial.upgradeCta": "હવે અપગ્રેડ કરો",
  "trial.lockInCta": "ફાઉન્ડર્સ ડિસ્કાઉન્ટ લોક કરો",
  "trial.previewMode": "પ્રીવ્યૂ મોડ — ટ્રાયલ સમાપ્ત",

  "banner.onTrial": "તમારી મફત ટ્રાયલ પર — બધા 9 બોટ અનલોક",

  "usage.title": "આ મહિનાનો ઉપયોગ",
  "usage.videos": "AI વિડિઓ",
  "usage.images": "AI છબીઓ",
  "usage.remaining": "{n} બાકી",
  "usage.resetsIn": "{n} દિવસમાં રીસેટ",
  "usage.resetsTomorrow": "કાલે રીસેટ થશે",
  "usage.buyCredits": "ટોપ-અપ ક્રેડિટ્સ ખરીદો",
  "usage.upgradeMore": "વધુ માટે અપગ્રેડ કરો",
  "usage.pickPlan": "પ્લાન પસંદ કરો",
  "usage.unlimited": "અસીમિત એક્સેસ",

  "plan.starter": "સ્ટાર્ટર",
  "plan.bundle": "બધા 9 બંડલ",
  "plan.premium": "બંડલ + AI મેનેજર",
  "plan.trial": "ટ્રાયલ",
  "plan.perMonth": "દર મહિને",
  "plan.foundersDiscount": "ફાઉન્ડર્સ ડિસ્કાઉન્ટ — 30 એપ્રિલ સુધી 65%",

  "credits.title": "PAYG ક્રેડિટ્સ ખરીદો",
  "credits.subtitle": "માસિક પ્લાન મર્યાદાની બહાર ઉપયોગ કરવા માટે ક્રેડિટ્સ ઉમેરો.",
  "credits.neverExpires": "ક્યારેય સમાપ્ત થતું નથી",
  "credits.bestValue": "શ્રેષ્ઠ મૂલ્ય",
  "credits.payWithCard": "કાર્ડથી ચૂકવો",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "લોડ થઈ રહ્યું છે…",
  "common.save": "સાચવો",
  "common.cancel": "રદ કરો",
  "common.continue": "ચાલુ રાખો",
  "common.delete": "કાઢી નાખો",
  "common.edit": "સંપાદિત કરો",
  "common.close": "બંધ કરો",
};

// ============================================================
// INDONESIAN (Bahasa Indonesia)
// ============================================================
const id: Dict = {
  "nav.dashboard": "Dasbor",
  "nav.pricing": "Harga",
  "nav.login": "Masuk",
  "nav.signup": "Mulai",
  "nav.logout": "Keluar",
  "nav.admin": "Admin",
  "nav.founders": "Pendiri",
  "nav.influencers": "Influencer",
  "nav.outreach": "Penjangkauan",

  "hero.badge": "Uji Coba Gratis 7 Hari — Tanpa Kartu Kredit",
  "hero.title": "Perusahaan AI Anda.",
  "hero.title.accent": "Beroperasi Sekarang.",
  "hero.subtitle": "9 bot AI khusus + Manajer AI Virtual. Coba semuanya gratis selama 7 hari.",
  "hero.cta": "Mulai Uji Coba 7 Hari Gratis",
  "hero.pricing": "Lihat Harga",

  "trial.daysLeft": "{n} hari tersisa",
  "trial.hoursLeft": "{n} jam tersisa",
  "trial.endingSoon": "Uji coba segera berakhir",
  "trial.ended": "Uji coba 7 hari Anda telah berakhir",
  "trial.resumeCta": "Dapatkan 3 Hari Lagi Gratis",
  "trial.upgradeCta": "Tingkatkan Sekarang",
  "trial.lockInCta": "Kunci Diskon Founders",
  "trial.previewMode": "Mode Pratinjau — uji coba berakhir",

  "banner.onTrial": "pada uji coba gratis Anda — semua 9 bot terbuka",

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
  "plan.foundersDiscount": "Diskon Founders — 65% hingga 30 April 2026",

  "credits.title": "Beli Kredit PAYG",
  "credits.subtitle": "Tambah kredit untuk pemakaian di luar batas paket bulanan.",
  "credits.neverExpires": "Tidak pernah kedaluwarsa",
  "credits.bestValue": "NILAI TERBAIK",
  "credits.payWithCard": "Bayar dengan Kartu",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "Memuat…",
  "common.save": "Simpan",
  "common.cancel": "Batal",
  "common.continue": "Lanjutkan",
  "common.delete": "Hapus",
  "common.edit": "Edit",
  "common.close": "Tutup",
};

// ============================================================
// VIETNAMESE (Tiếng Việt)
// ============================================================
const vi: Dict = {
  "nav.dashboard": "Bảng điều khiển",
  "nav.pricing": "Giá",
  "nav.login": "Đăng nhập",
  "nav.signup": "Bắt đầu",
  "nav.logout": "Đăng xuất",
  "nav.admin": "Quản trị",
  "nav.founders": "Người sáng lập",
  "nav.influencers": "Influencer",
  "nav.outreach": "Tiếp cận",

  "hero.badge": "Dùng thử miễn phí 7 ngày — Không cần thẻ tín dụng",
  "hero.title": "Công ty AI của bạn.",
  "hero.title.accent": "Đang vận hành.",
  "hero.subtitle": "9 bot AI chuyên biệt + Quản lý AI ảo. Dùng thử miễn phí 7 ngày.",
  "hero.cta": "Bắt đầu dùng thử 7 ngày miễn phí",
  "hero.pricing": "Xem giá",

  "trial.daysLeft": "Còn {n} ngày",
  "trial.hoursLeft": "Còn {n} giờ",
  "trial.endingSoon": "Dùng thử sắp kết thúc",
  "trial.ended": "Bản dùng thử của bạn đã kết thúc",
  "trial.resumeCta": "Nhận thêm 3 ngày miễn phí",
  "trial.upgradeCta": "Nâng cấp ngay",
  "trial.lockInCta": "Khóa giảm giá Founders",
  "trial.previewMode": "Chế độ xem trước — dùng thử kết thúc",

  "banner.onTrial": "trong bản dùng thử miễn phí — tất cả 9 bot mở khóa",

  "usage.title": "Sử dụng tháng này",
  "usage.videos": "Video AI",
  "usage.images": "Hình ảnh AI",
  "usage.remaining": "Còn {n}",
  "usage.resetsIn": "Đặt lại sau {n} ngày",
  "usage.resetsTomorrow": "Đặt lại vào ngày mai",
  "usage.buyCredits": "Mua tín dụng bổ sung",
  "usage.upgradeMore": "Nâng cấp để có thêm",
  "usage.pickPlan": "Chọn gói",
  "usage.unlimited": "Truy cập không giới hạn",

  "plan.starter": "Khởi đầu",
  "plan.bundle": "Gói 9 Bot",
  "plan.premium": "Gói + Quản lý AI",
  "plan.trial": "Dùng thử",
  "plan.perMonth": "mỗi tháng",
  "plan.foundersDiscount": "Giảm giá Founders — 65% đến 30/4/2026",

  "credits.title": "Mua tín dụng PAYG",
  "credits.subtitle": "Thêm tín dụng để sử dụng vượt hạn mức gói hàng tháng.",
  "credits.neverExpires": "Không bao giờ hết hạn",
  "credits.bestValue": "GIÁ TRỊ TỐT NHẤT",
  "credits.payWithCard": "Thanh toán bằng thẻ",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "Đang tải…",
  "common.save": "Lưu",
  "common.cancel": "Hủy",
  "common.continue": "Tiếp tục",
  "common.delete": "Xóa",
  "common.edit": "Sửa",
  "common.close": "Đóng",
};

// ============================================================
// THAI (ไทย)
// ============================================================
const th: Dict = {
  "nav.dashboard": "แดชบอร์ด",
  "nav.pricing": "ราคา",
  "nav.login": "เข้าสู่ระบบ",
  "nav.signup": "เริ่มต้น",
  "nav.logout": "ออกจากระบบ",
  "nav.admin": "ผู้ดูแล",
  "nav.founders": "ผู้ก่อตั้ง",
  "nav.influencers": "อินฟลูเอนเซอร์",
  "nav.outreach": "การเข้าถึง",

  "hero.badge": "ทดลองใช้ฟรี 7 วัน — ไม่ต้องใช้บัตรเครดิต",
  "hero.title": "บริษัท AI ของคุณ",
  "hero.title.accent": "เปิดทำการแล้ว",
  "hero.subtitle": "บอท AI เฉพาะทาง 9 ตัว + ผู้จัดการ AI เสมือน ทดลองใช้ฟรี 7 วัน",
  "hero.cta": "เริ่มทดลองใช้ฟรี 7 วัน",
  "hero.pricing": "ดูราคา",

  "trial.daysLeft": "เหลือ {n} วัน",
  "trial.hoursLeft": "เหลือ {n} ชั่วโมง",
  "trial.endingSoon": "การทดลองใช้จะสิ้นสุดเร็ว ๆ นี้",
  "trial.ended": "การทดลองใช้ 7 วันของคุณสิ้นสุดแล้ว",
  "trial.resumeCta": "รับอีก 3 วันฟรี",
  "trial.upgradeCta": "อัปเกรดทันที",
  "trial.lockInCta": "ล็อคส่วนลด Founders",
  "trial.previewMode": "โหมดดูตัวอย่าง — ทดลองใช้สิ้นสุด",

  "banner.onTrial": "อยู่ในการทดลองใช้ฟรี — บอททั้ง 9 ตัวปลดล็อค",

  "usage.title": "การใช้งานเดือนนี้",
  "usage.videos": "วิดีโอ AI",
  "usage.images": "รูปภาพ AI",
  "usage.remaining": "เหลือ {n}",
  "usage.resetsIn": "รีเซ็ตใน {n} วัน",
  "usage.resetsTomorrow": "รีเซ็ตพรุ่งนี้",
  "usage.buyCredits": "ซื้อเครดิตเพิ่ม",
  "usage.upgradeMore": "อัปเกรดเพื่อเพิ่มเติม",
  "usage.pickPlan": "เลือกแผน",
  "usage.unlimited": "การเข้าถึงไม่จำกัด",

  "plan.starter": "เริ่มต้น",
  "plan.bundle": "แพ็คเกจ 9",
  "plan.premium": "แพ็คเกจ + ผู้จัดการ AI",
  "plan.trial": "ทดลองใช้",
  "plan.perMonth": "ต่อเดือน",
  "plan.foundersDiscount": "ส่วนลด Founders — 65% ถึง 30 เม.ย. 2026",

  "credits.title": "ซื้อเครดิต PAYG",
  "credits.subtitle": "เพิ่มเครดิตเพื่อใช้งานเกินขีดจำกัดรายเดือน",
  "credits.neverExpires": "ไม่มีวันหมดอายุ",
  "credits.bestValue": "คุ้มค่าที่สุด",
  "credits.payWithCard": "ชำระด้วยบัตร",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "กำลังโหลด…",
  "common.save": "บันทึก",
  "common.cancel": "ยกเลิก",
  "common.continue": "ดำเนินการต่อ",
  "common.delete": "ลบ",
  "common.edit": "แก้ไข",
  "common.close": "ปิด",
};

// ============================================================
// SPANISH (Español)
// ============================================================
const es: Dict = {
  "nav.dashboard": "Panel",
  "nav.pricing": "Precios",
  "nav.login": "Iniciar sesión",
  "nav.signup": "Empezar",
  "nav.logout": "Cerrar sesión",
  "nav.admin": "Admin",
  "nav.founders": "Fundadores",
  "nav.influencers": "Influencers",
  "nav.outreach": "Outreach",

  "hero.badge": "Prueba gratis de 7 días — Sin tarjeta de crédito",
  "hero.title": "Tu empresa de IA.",
  "hero.title.accent": "Operando ahora.",
  "hero.subtitle": "9 bots de IA especializados + Gerente virtual de IA. Prueba todo gratis durante 7 días.",
  "hero.cta": "Inicia prueba gratuita de 7 días",
  "hero.pricing": "Ver precios",

  "trial.daysLeft": "Quedan {n} días",
  "trial.hoursLeft": "Quedan {n} horas",
  "trial.endingSoon": "La prueba termina pronto",
  "trial.ended": "Tu prueba gratuita terminó",
  "trial.resumeCta": "Obtén 3 días más gratis",
  "trial.upgradeCta": "Mejorar ahora",
  "trial.lockInCta": "Asegura el descuento Founders",
  "trial.previewMode": "Modo vista previa — prueba terminada",

  "banner.onTrial": "en tu prueba gratuita — los 9 bots desbloqueados",

  "usage.title": "Uso de este mes",
  "usage.videos": "Videos IA",
  "usage.images": "Imágenes IA",
  "usage.remaining": "{n} restantes",
  "usage.resetsIn": "Se reinicia en {n} días",
  "usage.resetsTomorrow": "Se reinicia mañana",
  "usage.buyCredits": "Comprar créditos adicionales",
  "usage.upgradeMore": "Mejora para más",
  "usage.pickPlan": "Elegir plan",
  "usage.unlimited": "Acceso ilimitado",

  "plan.starter": "Básico",
  "plan.bundle": "Paquete de 9",
  "plan.premium": "Paquete + Gerente IA",
  "plan.trial": "Prueba",
  "plan.perMonth": "al mes",
  "plan.foundersDiscount": "Descuento Founders — 65% hasta el 30 de abril",

  "credits.title": "Comprar créditos PAYG",
  "credits.subtitle": "Añade créditos para usar más allá de los límites de tu plan mensual.",
  "credits.neverExpires": "Nunca caducan",
  "credits.bestValue": "MEJOR VALOR",
  "credits.payWithCard": "Pagar con tarjeta",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "Cargando…",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.continue": "Continuar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.close": "Cerrar",
};

// ============================================================
// FRENCH (Français)
// ============================================================
const fr: Dict = {
  "nav.dashboard": "Tableau de bord",
  "nav.pricing": "Tarifs",
  "nav.login": "Se connecter",
  "nav.signup": "Commencer",
  "nav.logout": "Déconnexion",
  "nav.admin": "Admin",
  "nav.founders": "Fondateurs",
  "nav.influencers": "Influenceurs",
  "nav.outreach": "Prospection",

  "hero.badge": "Essai gratuit de 7 jours — Sans carte bancaire",
  "hero.title": "Votre entreprise IA.",
  "hero.title.accent": "Opérationnelle maintenant.",
  "hero.subtitle": "9 bots IA spécialisés + Gestionnaire IA virtuel. Testez tout gratuitement pendant 7 jours.",
  "hero.cta": "Démarrer l'essai gratuit de 7 jours",
  "hero.pricing": "Voir les tarifs",

  "trial.daysLeft": "{n} jours restants",
  "trial.hoursLeft": "{n} heures restantes",
  "trial.endingSoon": "L'essai se termine bientôt",
  "trial.ended": "Votre essai gratuit est terminé",
  "trial.resumeCta": "Obtenez 3 jours de plus gratuits",
  "trial.upgradeCta": "Mettre à niveau",
  "trial.lockInCta": "Verrouiller la remise Founders",
  "trial.previewMode": "Mode aperçu — essai terminé",

  "banner.onTrial": "sur votre essai gratuit — les 9 bots débloqués",

  "usage.title": "Utilisation ce mois-ci",
  "usage.videos": "Vidéos IA",
  "usage.images": "Images IA",
  "usage.remaining": "{n} restants",
  "usage.resetsIn": "Réinitialisation dans {n} jours",
  "usage.resetsTomorrow": "Réinitialisation demain",
  "usage.buyCredits": "Acheter des crédits",
  "usage.upgradeMore": "Améliorer pour plus",
  "usage.pickPlan": "Choisir un plan",
  "usage.unlimited": "Accès illimité",

  "plan.starter": "Débutant",
  "plan.bundle": "Pack de 9",
  "plan.premium": "Pack + Gestionnaire IA",
  "plan.trial": "Essai",
  "plan.perMonth": "par mois",
  "plan.foundersDiscount": "Remise Founders — 65% jusqu'au 30 avril",

  "credits.title": "Acheter des crédits PAYG",
  "credits.subtitle": "Ajoutez des crédits pour utiliser au-delà des limites de votre plan mensuel.",
  "credits.neverExpires": "N'expire jamais",
  "credits.bestValue": "MEILLEURE VALEUR",
  "credits.payWithCard": "Payer par carte",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "Chargement…",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.continue": "Continuer",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.close": "Fermer",
};

// ============================================================
// PORTUGUESE (Português)
// ============================================================
const pt: Dict = {
  "nav.dashboard": "Painel",
  "nav.pricing": "Preços",
  "nav.login": "Entrar",
  "nav.signup": "Começar",
  "nav.logout": "Sair",
  "nav.admin": "Admin",
  "nav.founders": "Fundadores",
  "nav.influencers": "Influenciadores",
  "nav.outreach": "Prospecção",

  "hero.badge": "Teste grátis de 7 dias — Sem cartão de crédito",
  "hero.title": "Sua empresa de IA.",
  "hero.title.accent": "Operando agora.",
  "hero.subtitle": "9 bots de IA especializados + Gerente de IA virtual. Teste tudo grátis por 7 dias.",
  "hero.cta": "Iniciar teste grátis de 7 dias",
  "hero.pricing": "Ver preços",

  "trial.daysLeft": "{n} dias restantes",
  "trial.hoursLeft": "{n} horas restantes",
  "trial.endingSoon": "Teste terminando em breve",
  "trial.ended": "Seu teste grátis terminou",
  "trial.resumeCta": "Ganhe mais 3 dias grátis",
  "trial.upgradeCta": "Atualizar agora",
  "trial.lockInCta": "Garantir desconto Founders",
  "trial.previewMode": "Modo visualização — teste terminado",

  "banner.onTrial": "no seu teste grátis — todos os 9 bots desbloqueados",

  "usage.title": "Uso deste mês",
  "usage.videos": "Vídeos IA",
  "usage.images": "Imagens IA",
  "usage.remaining": "{n} restantes",
  "usage.resetsIn": "Reinicia em {n} dias",
  "usage.resetsTomorrow": "Reinicia amanhã",
  "usage.buyCredits": "Comprar créditos",
  "usage.upgradeMore": "Atualizar para mais",
  "usage.pickPlan": "Escolher plano",
  "usage.unlimited": "Acesso ilimitado",

  "plan.starter": "Inicial",
  "plan.bundle": "Pacote de 9",
  "plan.premium": "Pacote + Gerente IA",
  "plan.trial": "Teste",
  "plan.perMonth": "por mês",
  "plan.foundersDiscount": "Desconto Founders — 65% até 30 de abril",

  "credits.title": "Comprar créditos PAYG",
  "credits.subtitle": "Adicione créditos para usar além dos limites do plano mensal.",
  "credits.neverExpires": "Nunca expira",
  "credits.bestValue": "MELHOR VALOR",
  "credits.payWithCard": "Pagar com cartão",
  "credits.payWithUpi": "UPI / Razorpay",

  "common.loading": "Carregando…",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.continue": "Continuar",
  "common.delete": "Excluir",
  "common.edit": "Editar",
  "common.close": "Fechar",
};

// ============================================================
// EXPORT ALL
// ============================================================
export const TRANSLATIONS: Record<string, Dict> = {
  en, hi, ar, bn, ta, te, mr, gu, id, vi, th, es, fr, pt,
};

export const AVAILABLE_LANGS = [
  { code: "en", name: "English", region: "Global" },
  { code: "hi", name: "हिन्दी (Hindi)", region: "India" },
  { code: "bn", name: "বাংলা (Bangla)", region: "India / Bangladesh" },
  { code: "ta", name: "தமிழ் (Tamil)", region: "India / Sri Lanka" },
  { code: "te", name: "తెలుగు (Telugu)", region: "India" },
  { code: "mr", name: "मराठी (Marathi)", region: "India" },
  { code: "gu", name: "ગુજરાતી (Gujarati)", region: "India" },
  { code: "ar", name: "العربية (Arabic)", region: "MENA", rtl: true },
  { code: "id", name: "Bahasa Indonesia", region: "Indonesia" },
  { code: "vi", name: "Tiếng Việt", region: "Vietnam" },
  { code: "th", name: "ไทย (Thai)", region: "Thailand" },
  { code: "es", name: "Español", region: "Latin America / Spain" },
  { code: "fr", name: "Français", region: "France / West Africa" },
  { code: "pt", name: "Português", region: "Brazil / Portugal" },
];
