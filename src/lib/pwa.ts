import { useEffect, useReducer } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((f) => f());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Exposes the browser's deferred install prompt, if one is available. */
export function useInstallPrompt() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const f = () => force();
    subscribers.add(f);
    return () => {
      subscribers.delete(f);
    };
  }, []);

  return {
    canInstall: !!deferred,
    promptInstall: async (): Promise<boolean> => {
      if (!deferred) return false;
      await deferred.prompt();
      const choice = await deferred.userChoice;
      deferred = null;
      notify();
      return choice.outcome === 'accepted';
    },
  };
}

// --- Service-worker update prompt ---------------------------------------
// main.tsx (which is never imported by tests) registers the SW and calls
// notifyNeedRefresh when a new version is waiting. The UI subscribes via
// useUpdatePrompt — no virtual:pwa-register import reaches the test build.

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let needRefresh = false;
const updateSubscribers = new Set<() => void>();

function notifyUpdate() {
  updateSubscribers.forEach((f) => f());
}

export function notifyNeedRefresh(apply: (reload?: boolean) => Promise<void>) {
  applyUpdate = apply;
  needRefresh = true;
  notifyUpdate();
}

export function useUpdatePrompt() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const f = () => force();
    updateSubscribers.add(f);
    return () => {
      updateSubscribers.delete(f);
    };
  }, []);

  return {
    needRefresh,
    update: () => {
      void applyUpdate?.(true);
    },
    dismiss: () => {
      needRefresh = false;
      notifyUpdate();
    },
  };
}
