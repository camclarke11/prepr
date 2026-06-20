import { usePalette } from '../hooks';
import { Modal } from './Modal';

const SHORTCUTS: [string, string][] = [
  ['1 – 4', 'Jump to List, Recipes, Plan, Pantry'],
  ['/', 'Focus the search box'],
  ['?', 'Show this help'],
  ['Esc', 'Close a dialog'],
];

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const p = usePalette();
  return (
    <Modal onClose={onClose} width={420} labelledBy="help-title">
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
          id="help-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 21,
            letterSpacing: '-0.02em',
          }}
        >
          Keyboard shortcuts
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
      <div style={{ padding: '12px 24px 22px' }}>
        {SHORTCUTS.map(([keys, desc]) => (
          <div
            key={keys}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '11px 0',
              borderBottom: `1px solid ${p.borderSoft}`,
            }}
          >
            <span style={{ fontSize: 14.5, color: p.text }}>{desc}</span>
            <kbd
              style={{
                fontFamily: 'inherit',
                fontWeight: 800,
                fontSize: 13,
                color: p.textMuted,
                background: p.surfaceAlt,
                border: `1px solid ${p.border}`,
                borderRadius: 8,
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                flex: 'none',
              }}
            >
              {keys}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
