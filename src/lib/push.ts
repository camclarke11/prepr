// Client-side Web Push: capability checks, permission opt-in, and subscription
// management. On iOS this only works inside the Home-Screen-installed PWA.
import { fetchVapidPublicKey, sendSubscription } from './sync';

export type EnableResult =
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'not-installed'
  | 'no-key'
  | 'error';

/** Web Push + service-worker support (also false in a non-secure context). */
export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Running as an installed PWA (required for push on iOS). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Opt this device into push for a household. MUST be called from a user-gesture
 * handler (iOS drops the permission request otherwise). Subscribes and registers
 * the subscription with the household.
 */
export async function enablePush(
  householdId: string,
  memberId: string,
): Promise<EnableResult> {
  if (!isPushSupported()) return 'unsupported';
  if (!isStandalone()) return 'not-installed';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const key = await fetchVapidPublicKey();
    if (!key) return 'no-key';

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    await sendSubscription(householdId, memberId, sub.toJSON());
    return 'subscribed';
  } catch {
    return 'error';
  }
}

/**
 * Re-validate an existing subscription on launch and re-register it — iOS churns
 * subscriptions and pushsubscriptionchange is unreliable, so we refresh quietly.
 */
export async function refreshSubscription(
  householdId: string,
  memberId: string,
): Promise<void> {
  if (!isPushSupported() || notificationPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sendSubscription(householdId, memberId, sub.toJSON());
  } catch {
    /* best-effort */
  }
}
