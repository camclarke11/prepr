import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { CATEGORIES } from '../theme';
import { supermarketById } from '../data/supermarkets';
import { buildSmartList, type SmartItem } from '../lib/sync';

/**
 * A tailored, store-ready shopping list: each item gets a smart search term +
 * a one-tap link to your supermarket and a matched product with macros.
 */
export function SmartListPanel({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const sm = supermarketById(state.supermarket);
  const [list] = useState(() => state.list); // snapshot at open
  const [results, setResults] = useState<SmartItem[] | null>(null);
  const [swap, setSwap] = useState<Record<number, number>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let alive = true;
    buildSmartList(list.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit }))).then(
      (r) => alive && setResults(r),
    );
    return () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [list, onClose]);

  const chosen = (idx: number): SmartItem['product'] | null => {
    const r = results?.[idx];
    if (!r) return null;
    return r.candidates[swap[idx] ?? 0] ?? r.product;
  };

  const groups = CATEGORIES.map((cat) => ({
    cat,
    rows: list
      .map((item, idx) => ({ item, idx }))
      .filter((x) => x.item.category === cat.name),
  })).filter((g) => g.rows.length);

  // Rough nutrition roll-up (per 100g of each matched product).
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  if (results) {
    list.forEach((_, idx) => {
      const c = chosen(idx);
      if (c) {
        total.kcal += c.kcal ?? 0;
        total.protein += c.protein ?? 0;
        total.carbs += c.carbs ?? 0;
        total.fat += c.fat ?? 0;
      }
    });
  }
  const r0 = (n: number) => Math.round(n);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const sectionLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: p.textFaint,
    margin: '18px 4px 8px',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: p.overlay,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 60,
        animation: 'prIn .18s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Smart list"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: mobile ? '100%' : 420,
          maxWidth: '100%',
          background: p.surface,
          borderLeft: `1px solid ${p.border}`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          overflowY: 'auto',
          animation: 'prSlide .24s cubic-bezier(.2,.8,.2,1)',
          padding: '0 18px calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: p.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 4px 12px',
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '-0.02em',
              }}
            >
              ✨ Smart list
            </div>
            <div style={{ fontSize: 12.5, color: p.textMuted, marginTop: 2 }}>
              {sm
                ? `Tailored for ${sm.name}`
                : 'Pick a supermarket in Settings for links'}
            </div>
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

        {!results && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: p.textMuted }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>✨</div>
            Building your smart list…
          </div>
        )}

        {results && list.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: p.textFaint }}>
            Your list is empty — add a few items first.
          </div>
        )}

        {results && list.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                background: p.accentTintBg,
                border: `1px solid ${p.accentTintBorder}`,
                borderRadius: 12,
                padding: '11px 14px',
                color: p.accentTintText,
                fontSize: 13,
              }}
            >
              <span>
                <b>{r0(total.kcal)}</b> kcal
              </span>
              <span>
                P <b>{r1(total.protein)}g</b>
              </span>
              <span>
                C <b>{r1(total.carbs)}g</b>
              </span>
              <span>
                F <b>{r1(total.fat)}g</b>
              </span>
              <span style={{ width: '100%', fontSize: 11, color: p.textFaint }}>
                rough roll-up · per 100g of each match
              </span>
            </div>

            {groups.map((g) => (
              <div key={g.cat.name}>
                <div style={{ ...sectionLabel, color: g.cat.color }}>{g.cat.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.rows.map(({ item, idx }) => {
                    const r = results[idx];
                    const c = chosen(idx);
                    const query = r?.query || item.name;
                    const n = r?.candidates.length ?? 0;
                    return (
                      <div
                        key={item.key}
                        style={{
                          border: `1px solid ${p.borderSoft}`,
                          borderRadius: 12,
                          background: p.card,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 20 }}>{item.emoji}</span>
                          <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>
                            {item.name}
                            {item.qty > 1 && (
                              <span style={{ color: p.textFaint }}> ×{item.qty}</span>
                            )}
                          </span>
                          {sm && (
                            <button
                              onClick={() =>
                                window.open(
                                  sm.searchUrl(c?.barcode || query),
                                  '_blank',
                                  'noopener,noreferrer',
                                )
                              }
                              title={
                                c?.barcode
                                  ? `Open the exact product at ${sm.name}`
                                  : `Search ${sm.name} for ${query}`
                              }
                              className="pr-press"
                              style={{
                                border: 'none',
                                background: p.accent,
                                color: '#fff',
                                borderRadius: 9,
                                padding: '7px 11px',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c?.barcode ? 'Open ↗' : 'Search ↗'}
                            </button>
                          )}
                        </div>
                        {c ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 8,
                              paddingTop: 8,
                              borderTop: `1px solid ${p.borderSoft}`,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12.5,
                                  color: p.textMuted,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {c.name}
                                {c.brand ? ` · ${c.brand}` : ''}
                              </div>
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: p.textFaint,
                                  marginTop: 2,
                                }}
                              >
                                {c.kcal != null ? `${c.kcal} kcal` : '—'}
                                {c.protein != null ? ` · P ${c.protein}` : ''}
                                {c.carbs != null ? ` · C ${c.carbs}` : ''}
                                {c.fat != null ? ` · F ${c.fat}` : ''}
                                {' / 100g'}
                              </div>
                            </div>
                            {n > 1 && (
                              <button
                                onClick={() =>
                                  setSwap((s) => ({
                                    ...s,
                                    [idx]: ((s[idx] ?? 0) + 1) % n,
                                  }))
                                }
                                style={{
                                  border: `1px solid ${p.border}`,
                                  background: p.card,
                                  color: p.textMuted,
                                  borderRadius: 8,
                                  padding: '5px 9px',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Swap {(swap[idx] ?? 0) + 1}/{n}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 12,
                              color: p.textFaint,
                              marginTop: 6,
                            }}
                          >
                            No product match — “{query}” will still search your store.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 18,
                fontSize: 11,
                color: p.textFaint,
                textAlign: 'center',
              }}
            >
              Products & nutrition via Open Food Facts
            </div>
          </>
        )}
      </div>
    </div>
  );
}
