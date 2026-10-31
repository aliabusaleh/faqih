// Service worker: shows the daily wird reminder (web push) and opens the app
// when it is tapped. Registered from Settings when reminders are turned on.
//
// Offline use, only once the learner asks for it in Settings: the page then
// registers "/sw.js?offline=1" and fills the offline cache (lib/offline).
// Without that flag this worker never touches a request.

const OFFLINE = new URL(self.location.href).searchParams.has("offline");
const CACHE = "faqih-offline-v1";

// A new version (or offline turned on or off) takes over at once.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Faqih", {
      body: data.body || "",
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      // One reminder at a time: a newer one replaces the old.
      tag: "daily-wird",
      data: { url: data.url || "/learn" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/learn",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        // Reuse an open Faqih tab if there is one.
        const open = windows.find((w) =>
          w.url.startsWith(self.location.origin)
        );
        if (open) return open.navigate(url).then((w) => (w || open).focus());
        return self.clients.openWindow(url);
      })
  );
});

// Shown for a page that wasn't downloaded, in both languages.
const notDownloaded = () =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Faqih</title>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px;color:#404040">
<p dir="rtl" lang="ar" style="font-size:18px">أنت غير متصل، وهذه الصفحة لم تُنزَّل.</p>
<p style="font-size:18px">You're offline, and this page wasn't downloaded.</p>
<p><a href="/learn" style="color:#1b3a6b;font-weight:bold">تعلّم · Learn</a></p>
</body>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

// Audio elements ask for byte ranges, and Safari only plays a 206 answer.
const withRange = async (request, response) => {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") || "");
  if (!range) return response;
  const body = await response.blob();
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Number(range[2]) : body.size - 1;
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${body.size}`,
      "Content-Length": String(end - start + 1),
    },
  });
};

// Pages: the network first, so they are up to date; the downloaded copy
// when there's no connection. A downloaded page is refreshed as it is seen.
const page = async (request) => {
  const cache = await caches.open(CACHE);
  const key = new URL(request.url);
  key.search = "";
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && (await cache.match(key)))
      await cache.put(key, response.clone());
    return response;
  } catch {
    return (await cache.match(key)) || notDownloaded();
  }
};

// Scripts, styles, fonts, images and downloaded recitation: the saved copy
// first. The app's own files are saved as they load, so the pages keep
// working after an update; recitation only if it was downloaded.
const saved = async (request, keep) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request.url);
  if (hit) return withRange(request, hit);
  const response = await fetch(request);
  if (keep && response.status === 200)
    await cache.put(request.url, response.clone());
  return response;
};

const AUDIO_HOSTS = [
  "verses.quran.com",
  "mirrors.quranicaudio.com",
  "www.everyayah.com",
  "audio.qurancdn.com",
];

if (OFFLINE)
  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
      if (request.mode === "navigate") return event.respondWith(page(request));
      // Page data for in-app links goes to the network; when it fails, the
      // app opens the page in full, which then comes from the cache.
      if (request.headers.get("RSC") || url.pathname.startsWith("/api/"))
        return;
      if (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/_next/image") ||
        /\.(png|svg|jpe?g|webp|ico|wav|mp3|woff2?)$/.test(url.pathname)
      )
        event.respondWith(saved(request, true));
      return;
    }

    if (AUDIO_HOSTS.includes(url.hostname))
      event.respondWith(saved(request, false));
  });
