import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';
import { SUPERMARKETS } from '../data/supermarkets';
import { CheckIcon } from './icons';

/** Pick the supermarket you shop with — adds a "Find at …" link to each item. */
export function SupermarketModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useStore();
  const p = usePalette();

  const choose = (id: string | null) => {
    actions.setSupermarket(id);
    onClose();
  };

  const row = (id: string | null, label: string) => {
    const active = (state.supermarket ?? null) === id;
    return (
      <button
        key={label}
        onClick={() => choose(id)}
        className="pr-press"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          textAlign: 'left',
          padding: '11px 13px',
          borderRadius: 12,
          border: `1px solid ${active ? p.accent : p.borderSoft}`,
          background: active ? p.accentTintBg : p.card,
          color: p.text,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span style={{ flex: 1 }}>{label}</span>
        {active && (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: p.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <CheckIcon size={13} strokeWidth={3.4} />
          </span>
        )}
      </button>
    );
  };

  return (
    <Modal onClose={onClose} width={400} labelledBy="sm-title">
      <div
        style={{
          padding: '22px 24px',
          borderBottom: `1px solid ${p.borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          id="sm-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 21,
            letterSpacing: '-0.02em',
          }}
        >
          Your supermarket
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: p.surfaceAlt,
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            color: p.text,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '18px 22px 24px' }}>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 13.5,
            color: p.textMuted,
            lineHeight: 1.45,
          }}
        >
          Adds a “Find at …” shortcut to each item so you can jump straight to it in
          your store. Nutrition comes from Open Food Facts regardless of choice.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SUPERMARKETS.map((s) => row(s.id, s.name))}
          {row(null, 'None')}
        </div>
      </div>
    </Modal>
  );
}
