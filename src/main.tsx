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
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
