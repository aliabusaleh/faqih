// Offline use, only on request ("Download for offline" in Settings): the
// learn page, the next few lessons and the files they need are saved in the
// browser's cache, and public/sw.js serves them when there's no connection.
// Recitation is saved too only if the learner asks: it is most of the size.
//
// Nothing here runs, and nothing is saved, until the button is pressed.

export const OFFLINE_CACHE = "faqih-offline-v1";
const META_KEY = "faqih-offline";
export const OFFLINE_CHOICES = [5, 10, 20] as const;

export type OfflineMeta = {
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

export const getOfflineMeta = (): OfflineMeta | null => {
  try {
    const raw = localStorage.getItem(META_KEY);
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
export const registerServiceWorker = (offline = !!getOfflineMeta()) =>
  navigator.serviceWorker.register(offline ? "/sw.js?offline=1" : "/sw.js");

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

  // Start again: a new download replaces the old one.
  await caches.delete(OFFLINE_CACHE);
  const cache = await caches.open(OFFLINE_CACHE);

  const pages: [key: string, url: string][] = [
    ["/learn", "/learn"],
    ...plan.lessons.map((id): [string, string] => [
      `/lesson/${id}`,
      `/lesson/${id}?offline=1`,
    ]),
  ];
  // "/lesson" opens the current lesson, the first one downloaded.
  if (plan.lessons[0]) pages.push(["/lesson", `/lesson/${plan.lessons[0]}`]);

  const progress = {
    done: 0,
    total: pages.length + plan.audio.length,
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
    // A lesson that isn't open (yet) sends the learner back to /learn.
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

  const lessons: number[] = [];
  const files = new Set<string>();
  await eachLimited(pages, async ([key, url]) => {
    const body = await save(key, url);
    if (body) {
      for (const file of filesIn(await body.text())) files.add(file);
      const id = Number(/^\/lesson\/(\d+)$/.exec(key)?.[1]);
      if (id) lessons.push(id);
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
  await eachLimited(plan.audio, async (url) => {
    const body = await save(url).catch(() => null);
    step(body?.size ?? 0);
  });

  if (lessons.length === 0) throw new Error("No lessons to download.");

  const meta: OfflineMeta = {
    lessons: plan.lessons.filter((id) => lessons.includes(id)),
    audio,
    bytes: progress.bytes,
    savedAt: Date.now(),
  };
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  await registerServiceWorker(true);
  return meta;
};

export const removeOffline = async () => {
  localStorage.removeItem(META_KEY);
  await caches.delete(OFFLINE_CACHE);
  // Keep the worker for reminders, but without offline answers.
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) await registerServiceWorker(false);
};
