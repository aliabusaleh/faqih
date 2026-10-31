// Offline use, only on request (Settings), in two downloads the learner
// keeps or removes apart:
// - "lessons": the learn page, the next few lessons and, if asked for, the
//   recitation they play (most of the size).
// - "quran": the whole Quran in Read mode (every surah and juz'), as text.
// Each is saved in its own cache with the app files it needs, and
// public/sw.js serves them when there's no connection.
//
// Nothing here runs, and nothing is saved, until a button is pressed.

export type OfflinePack = "lessons" | "quran";

/** Kept in step with public/sw.js. */
const CACHES: Record<OfflinePack, string> = {
  lessons: "faqih-offline-v1",
  quran: "faqih-quran-v1",
};
const META_KEYS: Record<OfflinePack, string> = {
  lessons: "faqih-offline",
  quran: "faqih-offline-quran",
};
export const OFFLINE_CHOICES = [5, 10, 20] as const;

const SURAH_COUNT = 114;
const JUZ_COUNT = 30;

export type OfflineMeta = {
  /** The lessons saved (none for the Quran). */
  lessons: number[];
  audio: boolean;
  bytes: number;
  savedAt: number;
};

export type OfflineProgress = { done: number; total: number; bytes: number };

export const offlineSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "caches" in window;

export const getOfflineMeta = (
  pack: OfflinePack = "lessons"
): OfflineMeta | null => {
  try {
    const raw = localStorage.getItem(META_KEYS[pack]);
    return raw ? (JSON.parse(raw) as OfflineMeta) : null;
  } catch {
    return null;
  }
};

/**
 * One service worker serves reminders and offline use. Its URL says whether
 * it may answer requests from the cache, so it knows that as soon as it
 * starts, even with no connection.
 */
export const registerServiceWorker = (
  offline = !!getOfflineMeta("lessons") || !!getOfflineMeta("quran")
) => navigator.serviceWorker.register(offline ? "/sw.js?offline=1" : "/sw.js");

// The app's own files a page needs: scripts, styles, fonts, images.
const filesIn = (text: string) =>
  [
    ...text.matchAll(
      /\/_next\/(?:static\/[^"'\s\\?]+|image\?[^"'\s\\]+)|(?<![\w.])\/(?:[\w-]+\/)*[\w-]+\.(?:svg|png|wav)\b/g
    ),
  ].map((m) => m[0].replace(/&amp;/g, "&"));

// A few downloads at a time.
const eachLimited = async <T>(
  items: T[],
  run: (item: T) => Promise<void>,
  limit = 6
) => {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift())
        await run(item);
    })
  );
};

// Saves pages (cache key, URL to fetch), the app files they need, and audio
// in a pack's cache, replacing what it had. Returns the pages saved.
const savePack = async ({
  pack,
  pages,
  audio,
  onProgress,
}: {
  pack: OfflinePack;
  pages: [key: string, url: string][];
  audio: string[];
  onProgress: (progress: OfflineProgress) => void;
}) => {
  await caches.delete(CACHES[pack]);
  const cache = await caches.open(CACHES[pack]);

  const progress = {
    done: 0,
    total: pages.length + audio.length,
    bytes: 0,
  };
  const step = (bytes: number) => {
    progress.done++;
    progress.bytes += bytes;
    onProgress({ ...progress });
  };
  onProgress({ ...progress });

  const saved = new Set<string>();
  const save = async (key: string, url = key) => {
    if (saved.has(key)) return null;
    saved.add(key);
    const response = await fetch(url);
    // A page that isn't open (yet) sends the learner elsewhere.
    if (!response.ok || response.redirected) return null;
    const body = await response.blob();
    await cache.put(
      key,
      new Response(body, {
        status: response.status,
        headers: response.headers,
      })
    );
    return body;
  };

  const savedPages: string[] = [];
  const files = new Set<string>();
  await eachLimited(pages, async ([key, url]) => {
    const body = await save(key, url);
    if (body) {
      for (const file of filesIn(await body.text())) files.add(file);
      savedPages.push(key);
    }
    step(body?.size ?? 0);
  });

  // Files the open page has loaded so far (some are only named in scripts).
  for (const entry of performance.getEntriesByType("resource"))
    if (entry.name.startsWith(`${location.origin}/_next/static/`))
      files.add(new URL(entry.name).pathname);

  // Styles name the fonts they use.
  progress.total += files.size;
  const fonts = new Set<string>();
  await eachLimited([...files], async (file) => {
    const body = await save(file).catch(() => null);
    if (body && file.endsWith(".css"))
      for (const [, font] of (await body.text()).matchAll(
        /url\((\/_next\/static\/media\/[^)]+)\)/g
      ))
        fonts.add(font);
    step(body?.size ?? 0);
  });
  progress.total += fonts.size;
  await eachLimited([...fonts], async (font) => {
    const body = await save(font).catch(() => null);
    step(body?.size ?? 0);
  });

  // Recitation hosts allow it (CORS), so its size can be counted.
  await eachLimited(audio, async (url) => {
    const body = await save(url).catch(() => null);
    step(body?.size ?? 0);
  });

  return { savedPages, bytes: progress.bytes };
};

const finish = async (pack: OfflinePack, meta: OfflineMeta) => {
  localStorage.setItem(META_KEYS[pack], JSON.stringify(meta));
  await registerServiceWorker(true);
  return meta;
};

export const downloadOffline = async ({
  count,
  audio,
  onProgress,
}: {
  count: number;
  audio: boolean;
  onProgress: (progress: OfflineProgress) => void;
}): Promise<OfflineMeta> => {
  const plan = (await fetch(
    `/api/offline?count=${count}&audio=${audio ? 1 : 0}`
  ).then((r) => {
    if (!r.ok) throw new Error(`Offline plan: ${r.status}`);
    return r.json();
  })) as { lessons: number[]; audio: string[] };

  const pages: [key: string, url: string][] = [
    ["/learn", "/learn"],
    ...plan.lessons.map((id): [string, string] => [
      `/lesson/${id}`,
      `/lesson/${id}?offline=1`,
    ]),
  ];
  // "/lesson" opens the current lesson, the first one downloaded.
  if (plan.lessons[0]) pages.push(["/lesson", `/lesson/${plan.lessons[0]}`]);

  const { savedPages, bytes } = await savePack({
    pack: "lessons",
    pages,
    audio: plan.audio,
    onProgress,
  });
  const lessons = plan.lessons.filter((id) =>
    savedPages.includes(`/lesson/${id}`)
  );
  if (lessons.length === 0) throw new Error("No lessons to download.");

  return finish("lessons", { lessons, audio, bytes, savedAt: Date.now() });
};

/** The whole Quran in Read mode: every surah and juz', as text. */
export const downloadQuran = async (
  onProgress: (progress: OfflineProgress) => void
): Promise<OfflineMeta> => {
  const paths = [
    "/read",
    ...Array.from({ length: SURAH_COUNT }, (_, i) => `/read/surah/${i + 1}`),
    ...Array.from({ length: JUZ_COUNT }, (_, i) => `/read/juz/${i + 1}`),
  ];
  const { savedPages, bytes } = await savePack({
    pack: "quran",
    pages: paths.map((path): [string, string] => [path, path]),
    audio: [],
    onProgress,
  });
  // All of it, or the download didn't finish.
  if (savedPages.length < paths.length)
    throw new Error("Quran download incomplete.");

  return finish("quran", {
    lessons: [],
    audio: false,
    bytes,
    savedAt: Date.now(),
  });
};

export const removeOffline = async (pack: OfflinePack = "lessons") => {
  localStorage.removeItem(META_KEYS[pack]);
  await caches.delete(CACHES[pack]);
  // Keep the worker for reminders; it answers offline only while something
  // is still downloaded.
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) await registerServiceWorker();
};
