import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';

export function Toast() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const toast = state.toast;
  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: mobile ? 'calc(86px + env(safe-area-inset-bottom))' : 32,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 80,
        pointerEvents: 'none',
        padding: '0 16px',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: p.toastBg,
          color: p.toastText,
          padding: '13px 18px',
          borderRadius: 13,
          fontWeight: 600,
          fontSize: 14.5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          animation: 'prUp .24s ease',
          pointerEvents: 'auto',
          maxWidth: '100%',
        }}
      >
        <span>{toast.msg}</span>
        {toast.undo && (
          <button
            onClick={actions.undo}
            style={{
              background: 'none',
              border: 'none',
              color: p.toastAction,
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 14.5,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              padding: 0,
              flex: 'none',
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
