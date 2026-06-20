import type { CSSProperties } from 'react';
import type { Palette } from '../theme';
import type { CatalogItem, Category, ListItem } from '../types';
import { fmtQtyUnit } from '../lib/format';
import { CheckIcon } from './icons';

interface ActiveTileProps {
  item: ListItem;
  cat: Category;
  p: Palette;
  onGot: () => void;
  onDetail: () => void;
}

/** A tile on the shopping list. Tap body = got it; tap qty pill = details. */
export function ActiveTile({ item, cat, p, onGot, onDetail }: ActiveTileProps) {
  const fromSomeoneElse = item.by && item.by !== 'You';
  const tileStyle: CSSProperties = {
    position: 'relative',
    width: 96,
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '13px 6px 11px',
    borderRadius: 15,
    border: `1px solid ${cat.color}`,
    background: p.card,
    cursor: 'pointer',
    boxShadow: `0 1px 2px ${p.shadow}`,
  };
  return (
    <div
      className="pr-tile"
      style={tileStyle}
      onClick={onGot}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${fmtQtyUnit(item.qty, item.unit)}. Mark as got`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onGot();
        }
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onDetail();
        }}
        title="Edit details"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          minWidth: 20,
          height: 20,
          padding: '0 7px',
          borderRadius: 10,
          background: cat.tint,
          color: cat.color,
          fontSize: 11.5,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: `1px solid ${cat.color}`,
        }}
      >
        {fmtQtyUnit(item.qty, item.unit)}
      </div>
      <span style={{ fontSize: 27, lineHeight: 1 }}>{item.emoji}</span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: p.text,
          textAlign: 'center',
          lineHeight: 1.12,
        }}
      >
        {item.name}
      </span>
      {item.spec && (
        <span
          style={{
            fontSize: 10.5,
            color: p.textFaint,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.spec}
        </span>
      )}
      {fromSomeoneElse && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            width: 17,
            height: 17,
            borderRadius: '50%',
            background: '#b35e54',
            color: '#fff',
            fontSize: 9.5,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Added by ${item.by}`}
        >
          {item.by[0]}
        </div>
      )}
    </div>
  );
}

interface CatalogTileProps {
  item: CatalogItem;
  cat: Category;
  p: Palette;
  qty: number;
  flash: boolean;
  onAdd: () => void;
}

/** A tile in the "add items" / recents palette. */
export function CatalogTile({ item, cat, p, qty, flash, onAdd }: CatalogTileProps) {
  const on = qty > 0;
  return (
    <button
      className="pr-tile"
      onClick={onAdd}
      aria-label={`Add ${item.name}${on ? ` (${qty} on list)` : ''}`}
      style={{
        position: 'relative',
        width: 84,
        height: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 4px',
        borderRadius: 14,
        border: on ? `1.5px solid ${cat.color}` : `1px solid ${p.borderSoft}`,
        background: p.card,
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: `0 1px 2px ${p.shadow}`,
        animation: flash ? 'prPop .45s ease' : 'none',
      }}
    >
      {on && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            right: -7,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 11,
            background: cat.color,
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }}
        >
          {qty}
        </span>
      )}
      <span style={{ fontSize: 25, lineHeight: 1 }}>{item.emoji}</span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: p.textMuted,
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        {item.name}
      </span>
    </button>
  );
}

interface PantryTileProps {
  item: CatalogItem;
  p: Palette;
  have: boolean;
  onToggle: () => void;
}

export function PantryTile({ item, p, have, onToggle }: PantryTileProps) {
  return (
    <button
      className="pr-tile"
      onClick={onToggle}
      aria-pressed={have}
      aria-label={`${item.name}${have ? ' (on hand)' : ''}`}
      style={{
        position: 'relative',
        width: 84,
        height: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 4px',
        borderRadius: 14,
        border: have ? `1.5px solid ${p.accent}` : `1px solid ${p.borderSoft}`,
        background: have ? p.accentTintBg : p.card,
        cursor: 'pointer',
        boxShadow: `0 1px 2px ${p.shadow}`,
        opacity: have ? 1 : 0.96,
      }}
    >
      {have && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            right: -7,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: p.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }}
        >
          <CheckIcon size={11} strokeWidth={3.6} />
        </span>
      )}
      <span style={{ fontSize: 25, lineHeight: 1 }}>{item.emoji}</span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: p.textMuted,
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        {item.name}
      </span>
    </button>
  );
}

/** Section heading with a coloured category dot. */
export function CategoryHeading({ cat }: { cat: Category }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: cat.color,
          flex: 'none',
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#8a887f',
        }}
      >
        {cat.name}
      </span>
    </div>
  );
}
