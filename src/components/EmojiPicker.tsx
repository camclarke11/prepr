import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Palette } from '../theme';
import type { CategoryName } from '../types';
import { FOOD_EMOJI_BY_CATEGORY, suggestEmoji } from '../data/emoji';

interface EmojiPickerProps {
  /** The typed item name — drives the smart suggestions. */
  query: string;
  /** The currently selected emoji, highlighted in the grid. */
  value: string;
  /** Picked an emoji; the category is the emoji's own (or a name-based guess). */
  onPick: (emoji: string, category: CategoryName) => void;
  onClose: () => void;
  p: Palette;
}

/** A popover for choosing a grocery emoji: suggestions, a grid, or type-your-own. */
export function EmojiPicker({ query, value, onPick, onClose, p }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState('');
  const suggestions = suggestEmoji(query);
  // Custom-typed emojis inherit the best name-based category guess, else Pantry.
  const fallbackCategory: CategoryName = suggestions[0]?.category ?? 'Pantry';

  // Close on outside click or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cellStyle = (selected: boolean): CSSProperties => ({
    width: 36,
    height: 36,
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    lineHeight: 1,
    border: selected ? `1.5px solid ${p.accent}` : '1px solid transparent',
    borderRadius: 9,
    background: selected ? p.accentTintBg : 'transparent',
    cursor: 'pointer',
  });

  const labelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: p.textFaint,
    margin: '10px 0 6px',
  };

  const grid: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4 };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose an emoji"
      style={{
        position: 'absolute',
        zIndex: 40,
        top: 'calc(100% + 6px)',
        left: 0,
        width: 328,
        maxHeight: 360,
        overflowY: 'auto',
        background: p.card,
        border: `1px solid ${p.border}`,
        borderRadius: 14,
        boxShadow: `0 14px 36px ${p.shadow}`,
        padding: '6px 12px 12px',
      }}
    >
      {suggestions.length > 0 && (
        <>
          <div style={labelStyle}>Suggestions</div>
          <div style={grid}>
            {suggestions.map((f) => (
              <button
                key={`s-${f.emoji}`}
                type="button"
                onClick={() => onPick(f.emoji, f.category)}
                aria-label={`Use ${f.emoji} (${f.keywords[0]})`}
                style={cellStyle(f.emoji === value)}
              >
                {f.emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {FOOD_EMOJI_BY_CATEGORY.map((group) => (
        <div key={group.category}>
          <div style={labelStyle}>{group.category}</div>
          <div style={grid}>
            {group.items.map((f) => (
              <button
                key={f.emoji}
                type="button"
                onClick={() => onPick(f.emoji, f.category)}
                aria-label={`Use ${f.emoji} (${f.keywords[0]})`}
                style={cellStyle(f.emoji === value)}
              >
                {f.emoji}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={labelStyle}>Type your own</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              e.preventDefault();
              onPick(custom.trim(), fallbackCategory);
            }
          }}
          placeholder="Any emoji…"
          aria-label="Type any emoji"
          maxLength={4}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 9,
            border: `1px solid ${p.border}`,
            background: p.surfaceSunk,
            fontSize: 18,
            outline: 'none',
            color: p.text,
          }}
        />
        <button
          type="button"
          onClick={() => custom.trim() && onPick(custom.trim(), fallbackCategory)}
          disabled={!custom.trim()}
          style={{
            flex: 'none',
            padding: '0 14px',
            borderRadius: 9,
            border: 'none',
            background: custom.trim() ? p.accent : p.surfaceAlt,
            color: custom.trim() ? '#fff' : p.textFaint,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: custom.trim() ? 'pointer' : 'default',
          }}
        >
          Use
        </button>
      </div>
    </div>
  );
}
