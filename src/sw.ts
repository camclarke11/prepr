/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const YEAR = 60 * 60 * 24 * 365;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback to the precached index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Google Fonts — stylesheet + webfonts (mirrors the previous workbox config).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: YEAR }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: YEAR }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Keep the in-app "update available" prompt working: do NOT skipWaiting at the
// top level. virtual:pwa-register's updateSW(true) posts this message to apply.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// --- Web Push ----------------------------------------------------------------
interface PushPayload {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  try {
    if (event.data) payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data?.text() };
  }
  // iOS revokes a subscription after a few pushes that show no notification, so
  // always show exactly one. `renotify` isn't in the lib's NotificationOptions
  // type yet, so widen locally.
  const options: NotificationOptions & { renotify?: boolean } = {
    body: payload.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: payload.tag || 'prepr-grocery',
    renotify: true,
    data: { url: payload.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'prepr', options),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList as readonly WindowClient[]) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      })
      .then(() => undefined),
  );
});
