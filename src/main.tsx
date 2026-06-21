import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { StoreProvider } from './state/store';
import { notifyNeedRefresh } from './lib/pwa';

// Register the service worker. When a new version is waiting, surface an
// in-app "update" prompt instead of silently swapping it in.
const updateSW = registerSW({
  onNeedRefresh() {
    notifyNeedRefresh(async (reload) => {
      await updateSW(reload);
    });
  },
  // A long-lived installed tab never re-checks for a new deployment on its own,
  // so it could sit on a stale cache forever. Poll hourly so onNeedRefresh fires.
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(
      () => {
        void registration.update();
      },
      60 * 60 * 1000,
    );
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
