import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { categoryByName } from '../theme';
import { fmtQty } from '../lib/format';
import { Modal } from './Modal';
import { CheckIcon } from './icons';

export function ItemDetail() {
  const { state, actions } = useStore();
  const p = usePalette();
  const item = state.list.find((x) => x.key === state.detailKey);
  if (!item) return null;

  const cat = categoryByName(item.category);

  const stepBtn = {
    width: 30,
    height: 30,
    border: 'none',
    background: p.card,
    borderRadius: 9,
    cursor: 'pointer',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
    color: p.text,
  } as const;

  const fieldStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 11,
    border: `1px solid ${p.border}`,
    background: p.card,
    fontSize: 14.5,
    outline: 'none',
    color: p.text,
  } as const;

  return (
    <Modal onClose={actions.closeDetail} width={440} labelledBy="item-title">
      <div
        style={{
          position: 'relative',
          height: 120,
          background: cat.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 48 }}>{item.emoji}</span>
        <button
          onClick={actions.closeDetail}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.8)',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            color: '#3a382f',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '20px 22px 24px' }}>
        <div
          id="item-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.01em',
          }}
        >
          {item.name}
        </div>
        <div
          style={{ fontSize: 13, color: p.textFaint, fontWeight: 600, marginTop: 3 }}
        >
          Added by {item.by || 'You'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '20px 0 11px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: p.textMuted }}>
            Quantity
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: p.surfaceAlt,
              borderRadius: 11,
              padding: '4px 5px',
            }}
          >
            <button
              onClick={() => item.qty > 1 && actions.changeQty(item.key, -1)}
              aria-label="Decrease quantity"
              style={{ ...stepBtn, fontSize: 19 }}
            >
              −
            </button>
            <span
              style={{
                fontWeight: 800,
                fontSize: 15,
                minWidth: 34,
                textAlign: 'center',
              }}
            >
              {fmtQty(item.qty)}
            </span>
            <button
              onClick={() => actions.changeQty(item.key, 1)}
              aria-label="Increase quantity"
              style={{ ...stepBtn, fontSize: 18 }}
            >
              +
            </button>
          </div>
        </div>

        <input
          value={item.unit || ''}
          onChange={(e) => actions.setItemField(item.key, 'unit', e.target.value)}
          placeholder="Unit — e.g. kg, pack, bunch"
          aria-label="Unit"
          style={{ ...fieldStyle, marginBottom: 11 }}
        />
        <input
          value={item.spec || ''}
          onChange={(e) => actions.setItemField(item.key, 'spec', e.target.value)}
          placeholder="Note — e.g. organic, ripe, for tacos"
          aria-label="Note"
          style={fieldStyle}
        />

        <button
          onClick={() => actions.gotIt(item.key)}
          className="pr-press"
          style={{
            marginTop: 22,
            width: '100%',
            padding: 14,
            borderRadius: 13,
            border: 'none',
            background: p.accent,
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <CheckIcon size={17} strokeWidth={3} />
          Got it — remove from list
        </button>
      </div>
    </Modal>
  );
}
