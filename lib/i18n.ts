// The whole app runs in one language at a time: English or Arabic.
// Lessons are built per language too, so no question mixes the two.

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "locale";

// Arabic unless NEXT_PUBLIC_DEFAULT_LOCALE=en.
export const DEFAULT_LOCALE: Locale =
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "ar";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.includes(value as Locale);

export const dir = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

// Arabic-Indic digits in Arabic, Western digits in English.
export const formatNumber = (locale: Locale, n: number) =>
  locale === "ar" ? n.toLocaleString("ar-EG") : String(n);

const en = {
  language: { switchTo: "العربية", name: "English" },
  app: {
    tagline: "Learn Quran, Hadith & Sirah",
    hero: "Learn the Quran, Hadith and Sirah — a few minutes a day.",
    tracks: ["Quran", "Hadith", "Sirah", "Adhkar", "Fiqh"],
  },
  auth: {
    login: "Login",
    getStarted: "Get Started",
    haveAccount: "I already have an account",
    continueLearning: "Continue Learning",
    devUser: "Dev User",
  },
  nav: {
    learn: "Learn",
    leaderboard: "Leaderboard",
    quests: "Quests",
    shop: "Shop",
  },
  courses: { title: "Courses" },
  learn: { continue: "Continue", start: "Start" },
  quests: {
    title: "Quests",
    viewAll: "View all",
    description: "Complete quests by earning points.",
    earn: (xp: string) => `Earn ${xp} XP`,
  },
  leaderboard: {
    title: "Leaderboard",
    description: "See where you stand among other learners in the community.",
    xp: (n: string) => `${n} XP`,
  },
  shop: {
    title: "Shop",
    description: "Spend your points on cool stuff.",
    refillHearts: "Refill hearts",
    unlimitedHearts: "Unlimited hearts",
    full: "full",
    upgrade: "upgrade",
    settings: "settings",
  },
  lesson: {
    defaultPrompt: "Select the correct answer",
    correct: "Nicely done!",
    wrong: "Try again.",
    check: "Check",
    next: "Next",
    retry: "Retry",
    continue: "Continue",
    practiceAgain: "Practice again",
    finished: "Great job! You've completed the lesson.",
    totalXp: "Total XP",
    heartsLeft: "Hearts left",
    error: "Something went wrong. Please try again.",
  },
  source: {
    label: "Source",
    translation: "Translation",
    draft: "Draft: not yet reviewed by a scholar",
    referencePending: "hadith reference pending",
  },
  modals: {
    exitTitle: "Wait, don't go!",
    exitBody: "You're about to leave the lesson. Are you sure?",
    keepLearning: "Keep learning",
    endSession: "End session",
    heartsTitle: "You ran out of hearts!",
    heartsBody: "Practice an earlier lesson or refill hearts in the shop.",
    heartsAction: "Go to shop",
    noThanks: "No thanks",
    practiceTitle: "Practice lesson",
    practiceBody:
      "Use practice lessons to regain hearts and points. You cannot lose hearts or points in practice lessons.",
    understand: "I understand",
  },
  error: "Something went wrong.",
};

export type Messages = typeof en;

const ar: Messages = {
  language: { switchTo: "English", name: "العربية" },
  app: {
    tagline: "تعلّم القرآن والحديث والسيرة",
    hero: "تعلّم القرآن والحديث والسيرة — دقائق قليلة كل يوم.",
    tracks: ["القرآن", "الحديث", "السيرة", "الأذكار", "الفقه"],
  },
  auth: {
    login: "تسجيل الدخول",
    getStarted: "ابدأ الآن",
    haveAccount: "لدي حساب بالفعل",
    continueLearning: "تابع التعلّم",
    devUser: "مستخدم تجريبي",
  },
  nav: {
    learn: "تعلّم",
    leaderboard: "المتصدّرون",
    quests: "المهام",
    shop: "المتجر",
  },
  courses: { title: "الدورات" },
  learn: { continue: "تابع", start: "ابدأ" },
  quests: {
    title: "المهام",
    viewAll: "عرض الكل",
    description: "أكمل المهام بجمع النقاط.",
    earn: (xp: string) => `اجمع ${xp} نقطة`,
  },
  leaderboard: {
    title: "المتصدّرون",
    description: "اعرف ترتيبك بين المتعلّمين في المجتمع.",
    xp: (n: string) => `${n} نقطة`,
  },
  shop: {
    title: "المتجر",
    description: "استخدم نقاطك هنا.",
    refillHearts: "استعادة القلوب",
    unlimitedHearts: "قلوب غير محدودة",
    full: "ممتلئ",
    upgrade: "ترقية",
    settings: "الإعدادات",
  },
  lesson: {
    defaultPrompt: "اختر الإجابة الصحيحة",
    correct: "أحسنت!",
    wrong: "حاول مرة أخرى.",
    check: "تحقّق",
    next: "التالي",
    retry: "أعد المحاولة",
    continue: "متابعة",
    practiceAgain: "تدرّب مجددًا",
    finished: "أحسنت! لقد أتممت الدرس.",
    totalXp: "مجموع النقاط",
    heartsLeft: "القلوب المتبقية",
    error: "حدث خطأ، حاول مرة أخرى.",
  },
  source: {
    label: "المصدر",
    translation: "الترجمة",
    draft: "مسودة: لم يراجعها عالِم بعد",
    referencePending: "تخريج الحديث قيد المراجعة",
  },
  modals: {
    exitTitle: "انتظر، لا تغادر!",
    exitBody: "أنت على وشك مغادرة الدرس. هل أنت متأكد؟",
    keepLearning: "تابع التعلّم",
    endSession: "إنهاء الجلسة",
    heartsTitle: "نفدت قلوبك!",
    heartsBody: "راجع درسًا سابقًا أو استعد القلوب من المتجر.",
    heartsAction: "اذهب إلى المتجر",
    noThanks: "لا، شكرًا",
    practiceTitle: "درس مراجعة",
    practiceBody:
      "استخدم دروس المراجعة لاستعادة القلوب والنقاط. لن تخسر قلوبًا أو نقاطًا في دروس المراجعة.",
    understand: "فهمت",
  },
  error: "حدث خطأ.",
};

export const messages: Record<Locale, Messages> = { en, ar };
