// App-icon badging for the outstanding "to get" count. Supported on installed
// PWAs via the Badging API (iOS 16.4+, desktop Chrome/Edge); a no-op everywhere
// else. setAppBadge *rejects* (rather than throwing) when the app isn't
// installed, so the returned promise is swallowed.

/** Show `count` on the home-screen icon, or clear the badge when it's zero. */
export function updateAppBadge(count: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.setAppBadge !== 'function') {
    return;
  }
  const result = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge?.();
  void result?.catch(() => {
    /* not installed / unsupported — ignore */
  });
}
