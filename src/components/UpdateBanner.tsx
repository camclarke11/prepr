import { usePalette } from '../hooks';
import { useUpdatePrompt } from '../lib/pwa';

/** A small banner shown when a new app version is ready to activate. */
export function UpdateBanner() {
  const p = usePalette();
  const { needRefresh, update, dismiss } = useUpdatePrompt();
  if (!needRefresh) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 90,
        pointerEvents: 'none',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: p.toastBg,
          color: p.toastText,
          padding: '11px 12px 11px 18px',
          borderRadius: 13,
          fontWeight: 600,
          fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          animation: 'prUp .24s ease',
          pointerEvents: 'auto',
          maxWidth: '100%',
        }}
      >
        <span>A new version of prepr is ready</span>
        <button
          onClick={update}
          className="pr-press"
          style={{
            border: 'none',
            background: p.accent,
            color: '#fff',
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            borderRadius: 9,
            padding: '7px 13px',
            flex: 'none',
          }}
        >
          Reload
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            border: 'none',
            background: 'none',
            color: p.toastText,
            opacity: 0.7,
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: '0 4px',
            flex: 'none',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
