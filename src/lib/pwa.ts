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
