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
    soon: "Soon",
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
    read: "Read",
    leaderboard: "Leaderboard",
    modes: "Modes",
    shop: "Shop",
    settings: "Settings",
  },
  courses: { title: "Courses" },
  learn: {
    continue: "Continue",
    start: "Start",
    exam: "Exam",
    unitDone: "Completed",
    passedExam: "Exam passed: cleared. The lessons are still here to practise",
    jumpTo: "Jump to",
    practiseAgain: "practise again",
    todaysWird: "Today's wird",
    searchUnits: "Search by name or number",
    noResults: "Nothing found",
    juz: (n: string) => `Juz' ${n}`,
    allAjza: "All ajza'",
    previousJuz: "Previous juz'",
    nextJuz: "Next juz'",
  },
  settings: {
    title: "Settings",
    language: "Language",
    mode: "Mode",
    kids: "Kids",
    kidsDescription:
      "Short surahs, big buttons, simple screens and no hearts to lose.",
    full: "Full",
    fullDescription: "Every course, the whole Quran, exams and hearts.",
    tour: "Show the tour again",
    readAloud: "Read aloud",
    readAloudOn: "On",
    readAloudOff: "Off",
    reminder: "Daily reminder",
    reminderDescription:
      "A notification on this device at the time you choose, to do your daily wird.",
    reminderOn: "Reminder on",
    reminderOff: "Turn on the reminder",
    reminderTime: "Time",
    reminderSaved: "Daily reminder saved.",
    reminderUnsupported:
      "This browser can't show reminders. Try Chrome, Edge, Firefox or Safari.",
    reminderNotConfigured:
      "Reminders aren't set up on the server yet. They'll be here soon.",
    reminderIos:
      "On iPhone, first add Faqih to your Home Screen (Share → Add to Home Screen), then open it from there to turn on reminders.",
    reminderDenied:
      "Notifications are blocked for this site. Allow them in your browser settings, then come back here.",
    readAloudDescription:
      "Reads each question and the option you tap. Ayat and their words are always recited by a qari, never by a computer voice.",
  },
  review: {
    done: "Your hearts are back. Carry on with your lesson!",
  },
  study: {
    title: "Read first",
    intro:
      "Read and listen to what this lesson is about, then answer the questions.",
    playAll: "Listen to all",
    start: "Start the questions",
    // The Start button while the reading time runs: "Start the questions (7s)".
    startIn: (label: string, seconds: string) => `${label} (${seconds}s)`,
    part: (n: string, total: string) => `Part ${n} of ${total}`,
    listenFirst:
      "Listen to each ayah, or take a moment to read it, before the questions.",
    backToQuestions: "Back to the questions",
    repeat: (n: number, count: string) =>
      n === 1 ? "Said once" : `Said ${count} times`,
  },
  reminder: {
    title: "Your daily wird",
    body: "A few minutes with the Quran: today's lesson is ready.",
  },
  tour: {
    skip: "Skip",
    next: "Next",
    back: "Back",
    done: "Let's start",
    chooseMode: "Who is learning?",
    steps: [
      {
        title: "Welcome to Faqih",
        body: "Learn and memorise the Quran a few minutes a day. It's free, and every ayah comes from a cited source.",
      },
      {
        title: "Surahs, lessons and exams",
        body: "Each surah is a unit. Start with any surah you like: its lessons open one after another, and an exam closes it.",
      },
      {
        title: "Already know a surah?",
        body: "Take its exam straight away. Passing it clears the surah. A surah you move past without its exam stays unfinished.",
      },
      {
        title: "Kids or full",
        body: "Kids mode keeps things simple: short surahs, big buttons, no hearts. You can change this any time in Settings.",
      },
    ],
  },
  invite: {
    title: "Invite friends",
    body: "Share Faqih with family and friends, so they can learn with you.",
    text: "Learn the Quran with me on Faqih: a few minutes a day, free.",
    share: "Share",
    whatsapp: "WhatsApp",
    copy: "Copy link",
    copied: "Link copied.",
  },
  modes: {
    title: "Learning modes",
    description: "Choose how you want to learn today.",
    memorise: {
      title: "Memorise",
      body: "Lessons of a few ayat: read and listen, then answer.",
    },
    read: {
      title: "Read",
      body: "Read and listen to any surah or juz', like a mushaf.",
    },
    review: {
      title: "Review",
      body: "Go over your recent mistakes and earn hearts back.",
    },
    reviewEmpty: "Finish a lesson first, then review it here.",
    exams: { title: "Exams", body: "Test yourself on a whole juz'." },
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
    examPassed: "Exam passed! This unit is cleared.",
    listenAgain: "Listen again",
    backToAyat: "Read the ayat again",
    cantListen: "Can't listen now",
    prompts: {
      LISTEN: "Listen and choose the ayah",
      TRUE_FALSE: "True or false?",
      COMPLETE_WORD: "Complete the missing word",
      COMPLETE_AYAH: "Complete the ayah",
      ORDER: "Put the words in order",
      MATCH: "Match the pairs",
    },
    play: "Play",
    playSlow: "Play slowly",
    typeAnswer: "Type your answer",
    correctAnswer: "Correct answer:",
    tapToRemove: "Tap a word to remove it",
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
    heartsBody:
      "Review the questions you just missed: every right answer gives a heart back, then you're back in your lesson.",
    heartsAction: "Review and earn hearts",
    noThanks: "No thanks",
    practiceTitle: "Practice lesson",
    practiceBody:
      "Use practice lessons to regain hearts and points. You cannot lose hearts or points in practice lessons.",
    understand: "I understand",
  },
  read: {
    title: "Read",
    intro: "Read the Quran and listen to it, ayah by ayah.",
    surahs: "Surahs",
    ajza: "Juz'",
    juz: (n: string) => `Juz' ${n}`,
    continue: "Continue reading",
    search: "Search for a surah",
    ayahCount: (n: string) => `${n} ayat`,
    fromAyah: (n: string) => `from ayah ${n}`,
    playAll: "Listen to all",
    stop: "Stop",
    tapHint: "Tap an ayah to hear it.",
    previous: "Previous",
    next: "Next",
    back: "All surahs",
    notImported: "The Quran text hasn't been imported yet.",
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
    soon: "قريبًا",
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
    read: "القراءة",
    leaderboard: "المتصدّرون",
    modes: "الأنماط",
    shop: "المتجر",
    settings: "الإعدادات",
  },
  courses: { title: "الدورات" },
  learn: {
    continue: "تابع",
    start: "ابدأ",
    exam: "اختبار",
    unitDone: "مكتملة",
    passedExam: "اجتزت الاختبار: أتممتها، والدروس باقية للتدرّب",
    jumpTo: "انتقل إلى",
    practiseAgain: "تدرّب مرة أخرى",
    todaysWird: "وِرد اليوم",
    searchUnits: "ابحث بالاسم أو الرقم",
    noResults: "لا نتائج",
    juz: (n: string) => `الجزء ${n}`,
    allAjza: "كل الأجزاء",
    previousJuz: "الجزء السابق",
    nextJuz: "الجزء التالي",
  },
  settings: {
    title: "الإعدادات",
    language: "اللغة",
    mode: "الوضع",
    kids: "الأطفال",
    kidsDescription: "قصار السور، أزرار كبيرة، شاشات بسيطة، ولا قلوب تُفقد.",
    full: "الكامل",
    fullDescription: "كل الدورات، القرآن كاملًا، الاختبارات والقلوب.",
    tour: "اعرض الجولة مرة أخرى",
    readAloud: "القراءة بصوت",
    readAloudOn: "مُفعّلة",
    readAloudOff: "متوقفة",
    reminder: "التذكير اليومي",
    reminderDescription:
      "إشعار على هذا الجهاز في الوقت الذي تختاره، لتقرأ وِردك اليومي.",
    reminderOn: "التذكير مُفعّل",
    reminderOff: "فعّل التذكير",
    reminderTime: "الوقت",
    reminderSaved: "تم حفظ التذكير اليومي.",
    reminderUnsupported:
      "هذا المتصفح لا يدعم التذكيرات. جرّب Chrome أو Edge أو Firefox أو Safari.",
    reminderNotConfigured:
      "التذكيرات غير مُعدّة على الخادم بعد. ستتوفر قريبًا.",
    reminderIos:
      "على الآيفون، أضف فقيه أولًا إلى الشاشة الرئيسية (مشاركة ← إضافة إلى الشاشة الرئيسية)، ثم افتحه من هناك لتفعيل التذكير.",
    reminderDenied:
      "الإشعارات محظورة لهذا الموقع. اسمح بها من إعدادات المتصفح ثم ارجع إلى هنا.",
    readAloudDescription:
      "يقرأ كل سؤال والخيار الذي تضغطه. الآيات وكلماتها يتلوها قارئ دائمًا، ولا يقرؤها صوت حاسوبي.",
  },
  review: {
    done: "عادت إليك قلوبك. تابع درسك!",
  },
  study: {
    title: "اقرأ أولًا",
    intro: "اقرأ واستمع إلى ما يتناوله هذا الدرس، ثم أجب عن الأسئلة.",
    playAll: "استمع للكل",
    start: "ابدأ الأسئلة",
    startIn: (label: string, seconds: string) => `${label} (${seconds} ث)`,
    part: (n: string, total: string) => `المقطع ${n} من ${total}`,
    listenFirst: "استمع إلى كل آية، أو خذ وقتك في قراءتها، قبل الأسئلة.",
    backToQuestions: "عُد إلى الأسئلة",
    // Arabic counted nouns: 3-10 take the plural (مرات), 11+ the singular.
    repeat: (n: number, count: string) =>
      n === 1
        ? "يُقال مرة واحدة"
        : n === 2
          ? "يُقال مرتين"
          : n <= 10
            ? `يُقال ${count} مرات`
            : `يُقال ${count} مرة`,
  },
  reminder: {
    title: "وِردك اليومي",
    body: "دقائق مع القرآن: درس اليوم بانتظارك.",
  },
  tour: {
    skip: "تخطَّ",
    next: "التالي",
    back: "السابق",
    done: "لنبدأ",
    chooseMode: "من سيتعلّم؟",
    steps: [
      {
        title: "أهلًا بك في فقيه",
        body: "تعلّم القرآن واحفظه في دقائق كل يوم. التطبيق مجاني، وكل آية موثّقة بمصدرها.",
      },
      {
        title: "سور ودروس واختبارات",
        body: "كل سورة وحدة، وابدأ بأي سورة تشاء: تُفتح دروسها واحدًا تلو الآخر، وتُختم باختبار.",
      },
      {
        title: "تحفظ السورة من قبل؟",
        body: "خُض اختبارها مباشرة، فإن نجحت أتممت السورة. والسورة التي تتجاوزها دون اختبارها تبقى غير مكتملة.",
      },
      {
        title: "للأطفال أم كامل؟",
        body: "وضع الأطفال بسيط: قصار السور، أزرار كبيرة، ولا قلوب. يمكنك تغييره متى شئت من الإعدادات.",
      },
    ],
  },
  invite: {
    title: "ادعُ أصدقاءك",
    body: "شارك فقيه مع أهلك وأصدقائك ليتعلّموا معك.",
    text: "تعلّم القرآن معي على فقيه: دقائق قليلة كل يوم، ومجانًا.",
    share: "مشاركة",
    whatsapp: "واتساب",
    copy: "نسخ الرابط",
    copied: "تم نسخ الرابط.",
  },
  modes: {
    title: "أنماط التعلّم",
    description: "اختر كيف تريد أن تتعلّم اليوم.",
    memorise: {
      title: "الحفظ",
      body: "دروس من آيات قليلة: اقرأ واستمع، ثم أجب.",
    },
    read: {
      title: "القراءة",
      body: "اقرأ واستمع لأي سورة أو جزء، كما في المصحف.",
    },
    review: {
      title: "المراجعة",
      body: "راجع أخطاءك الأخيرة واستعد قلوبك.",
    },
    reviewEmpty: "أنهِ درسًا أولًا، ثم راجعه هنا.",
    exams: { title: "الاختبارات", body: "اختبر نفسك في جزء كامل." },
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
    examPassed: "نجحت في الاختبار! أتممت هذه الوحدة.",
    listenAgain: "استمع مرة أخرى",
    backToAyat: "اقرأ الآيات مرة أخرى",
    cantListen: "لا أستطيع الاستماع الآن",
    prompts: {
      LISTEN: "استمع واختر الآية",
      TRUE_FALSE: "صح أم خطأ؟",
      COMPLETE_WORD: "أكمل الكلمة الناقصة",
      COMPLETE_AYAH: "أكمل الآية",
      ORDER: "رتّب كلمات الآية",
      MATCH: "صِل كل عنصر بما يناسبه",
    },
    play: "استمع",
    playSlow: "استمع ببطء",
    typeAnswer: "اكتب إجابتك",
    correctAnswer: "الإجابة الصحيحة:",
    tapToRemove: "اضغط على كلمة لإزالتها",
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
    heartsBody:
      "راجع الأسئلة التي أخطأت فيها للتو: كل إجابة صحيحة تعيد لك قلبًا، ثم تعود إلى درسك.",
    heartsAction: "راجع واستعد قلوبك",
    noThanks: "لا، شكرًا",
    practiceTitle: "درس مراجعة",
    practiceBody:
      "استخدم دروس المراجعة لاستعادة القلوب والنقاط. لن تخسر قلوبًا أو نقاطًا في دروس المراجعة.",
    understand: "فهمت",
  },
  read: {
    title: "القراءة",
    intro: "اقرأ القرآن واستمع إليه آيةً آية.",
    surahs: "السور",
    ajza: "الأجزاء",
    juz: (n: string) => `الجزء ${n}`,
    continue: "تابع القراءة",
    search: "ابحث عن سورة",
    ayahCount: (n: string) => `آياتها ${n}`,
    fromAyah: (n: string) => `من الآية ${n}`,
    playAll: "استمع للكل",
    stop: "إيقاف",
    tapHint: "اضغط على آية لتسمعها.",
    previous: "السابق",
    next: "التالي",
    back: "كل السور",
    notImported: "لم يُستورد نص القرآن بعد.",
  },
  error: "حدث خطأ.",
};

export const messages: Record<Locale, Messages> = { en, ar };
