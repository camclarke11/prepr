import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import {
  enablePush,
  isPushSupported,
  isStandalone,
  notificationPermission,
  type EnableResult,
} from '../lib/push';

const MESSAGES: Record<EnableResult, string> = {
  subscribed: 'Notifications on',
  denied: 'Blocked — enable in iOS Settings → Notifications',
  unsupported: 'Not supported on this browser',
  'not-installed': 'Add prepr to your Home Screen first',
  'no-key': 'Notifications aren’t set up on the server yet',
  error: 'Couldn’t enable notifications',
};

/** Opt-in card for push notifications, shown inside the shared-list view. */
export function NotificationsCard() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [perm, setPerm] = useState(notificationPermission());
  const [busy, setBusy] = useState(false);

  if (!state.household || !isPushSupported()) return null;
  const standalone = isStandalone();

  const turnOn = async () => {
    if (!state.household) return;
    setBusy(true);
    const res = await enablePush(state.household.id, state.household.memberId);
    setBusy(false);
    setPerm(notificationPermission());
    actions.showToast(MESSAGES[res], { dur: 3 });
  };

  const card = (children: React.ReactNode) => (
    <div
      style={{
        border: `1px solid ${p.borderSoft}`,
        borderRadius: 12,
        background: p.surfaceSunk,
        padding: '12px 14px',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
        🔔 Notifications
      </div>
      {children}
    </div>
  );

  const note = (text: string) => (
    <p style={{ margin: 0, fontSize: 12.5, color: p.textMuted, lineHeight: 1.45 }}>
      {text}
    </p>
  );

  if (!standalone) {
    return card(
      note(
        'To get a heads-up when someone adds an item, add prepr to your Home Screen: tap the Share icon, then “Add to Home Screen”, and open it from there.',
      ),
    );
  }
  if (perm === 'granted') {
    return card(note('You’ll be notified when someone adds an item. ✓'));
  }
  if (perm === 'denied') {
    return card(
      note(
        'Notifications are blocked. Turn them on in iOS Settings → Notifications → prepr.',
      ),
    );
  }
  return card(
    <>
      {note('Get a heads-up when your housemate adds something to the list.')}
      <button
        onClick={turnOn}
        disabled={busy}
        className="pr-press"
        style={{
          marginTop: 10,
          padding: '9px 14px',
          borderRadius: 10,
          border: 'none',
          background: p.accent,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13.5,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Turning on…' : 'Turn on notifications'}
      </button>
    </>,
  );
}
