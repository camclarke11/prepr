import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { CATEGORIES } from '../theme';
import { supermarketById } from '../data/supermarkets';
import { buildSmartList, type SmartItem } from '../lib/sync';
import { aggregateShop, type ShopSource } from '../lib/shop';

/**
 * The "Smart shop": pools and sums ingredients across your planned recipes and
 * current list, drops what's already in the pantry (recognising name
 * equivalences), flags what's new, matches each to a named product with an
 * estimated price, and totals it up — grouped by aisle, assumptions stated.
 */
export function SmartListPanel({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const sm = supermarketById(state.supermarket);

  // Snapshot the inputs at open so the shop is stable while you read it.
  const [snap] = useState(() => ({
    list: state.list,
    plan: state.plan,
    recipes: state.recipes,
    pantry: state.pantry,
  }));
  const planHasMeals = Object.values(snap.plan).some((ids) => ids.length > 0);
  const [source, setSource] = useState<ShopSource>(planHasMeals ? 'both' : 'list');

  const shop = useMemo(() => aggregateShop({ ...snap, source }), [snap, source]);
  const toBuy = shop.toBuy;

  const [results, setResults] = useState<SmartItem[] | null>(null);
  const [swap, setSwap] = useState<Record<number, number>>({});

  // (Re)build the AI product/price match whenever the to-buy set changes.
  const buyKey = toBuy.map((l) => l.key).join('|');
  useEffect(() => {
    let alive = true;
    setResults(null);
    setSwap({});
    if (!toBuy.length) {
      setResults([]);
      return;
    }
    buildSmartList(
      toBuy.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit })),
      state.supermarket,
    ).then((r) => alive && setResults(r));
    return () => {
      alive = false;
    };
    // buyKey captures the meaningful change; toBuy is rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyKey, state.supermarket]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const chosen = (idx: number): SmartItem['product'] | null => {
    const r = results?.[idx];
    if (!r) return null;
    return r.candidates[swap[idx] ?? 0] ?? r.product;
  };

  // Store sites search by product NAME, not barcode (a barcode just dead-ends on
  // "no matches"), and an OFF brand is often a rival's own-label that the chosen
  // store won't stock. So we link to the AI's clean UK search term, which
  // reliably lands in the right place at any supermarket.

  const indexOf = new Map(toBuy.map((l, i) => [l.key, i]));
  const groups = CATEGORIES.map((cat) => ({
    cat,
    lines: toBuy.filter((l) => l.category === cat.name),
  })).filter((g) => g.lines.length);

  // Totals: estimated spend (per the recommended pick), macros roll-up, counts.
  const totals = { price: 0, missing: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let newCount = 0;
  if (results) {
    toBuy.forEach((line, idx) => {
      if (line.isNew) newCount++;
      const price = results[idx]?.price ?? null;
      if (price == null) totals.missing++;
      else totals.price += price;
      const c = chosen(idx);
      if (c) {
        totals.kcal += c.kcal ?? 0;
        totals.protein += c.protein ?? 0;
        totals.carbs += c.carbs ?? 0;
        totals.fat += c.fat ?? 0;
      }
    });
  }
  const money = (n: number) => `£${n.toFixed(2)}`;
  const r0 = (n: number) => Math.round(n);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const assumptions = [
    ...shop.assumptions,
    'Prices are rough estimates (≈), not live retailer prices.',
    'Items in your pantry are treated as in stock and skipped.',
  ];

  const sectionLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: p.textFaint,
    margin: '18px 4px 8px',
  };

  const sourceBtn = (id: ShopSource): CSSProperties => ({
    flex: 1,
    padding: '6px 0',
    border: 'none',
    background: source === id ? p.accent : 'transparent',
    color: source === id ? '#fff' : p.textMuted,
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  });

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
        aria-label="Smart shop"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: mobile ? '100%' : 440,
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '-0.02em',
              }}
            >
              ✨ Smart shop
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
              flex: 'none',
            }}
          >
            ×
          </button>
        </div>

        {/* Source toggle — only offer plan-based shops when there are meals. */}
        {planHasMeals && (
          <div
            style={{
              display: 'flex',
              gap: 3,
              padding: 3,
              background: p.surfaceSunk,
              border: `1px solid ${p.borderSoft}`,
              borderRadius: 11,
              marginBottom: 8,
            }}
          >
            <button onClick={() => setSource('both')} style={sourceBtn('both')}>
              Plan + list
            </button>
            <button onClick={() => setSource('plan')} style={sourceBtn('plan')}>
              Meal plan
            </button>
            <button onClick={() => setSource('list')} style={sourceBtn('list')}>
              My list
            </button>
          </div>
        )}

        {source !== 'list' && shop.recipeNames.length > 0 && (
          <div style={{ fontSize: 12, color: p.textFaint, margin: '0 4px 10px' }}>
            From {shop.recipeNames.join(' · ')}
          </div>
        )}

        {!results && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: p.textMuted }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>✨</div>
            Building your smart shop…
          </div>
        )}

        {results && toBuy.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: p.textFaint }}>
            {shop.owned.length
              ? 'Everything you need is already in your pantry 🎉'
              : 'Nothing to shop for yet — plan some meals or add to your list.'}
          </div>
        )}

        {results && toBuy.length > 0 && (
          <>
            {/* Estimated total + counts */}
            <div
              style={{
                background: p.accentTintBg,
                border: `1px solid ${p.accentTintBorder}`,
                borderRadius: 12,
                padding: '12px 14px',
                color: p.accentTintText,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  ≈ {money(totals.price)}
                </span>
                <span style={{ fontSize: 12.5 }}>estimated total</span>
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                {toBuy.length} to buy
                {newCount > 0 ? ` · ${newCount} new` : ''}
                {shop.owned.length > 0 ? ` · ${shop.owned.length} in pantry` : ''}
                {totals.missing > 0 ? ` · ${totals.missing} unpriced` : ''}
              </div>
              <div style={{ fontSize: 11, color: p.textFaint, marginTop: 6 }}>
                rough macros: {r0(totals.kcal)} kcal · P {r1(totals.protein)} · C{' '}
                {r1(totals.carbs)} · F {r1(totals.fat)} (per 100g of each match)
              </div>
            </div>

            {groups.map((g) => (
              <div key={g.cat.name}>
                <div style={{ ...sectionLabel, color: g.cat.color }}>{g.cat.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.lines.map((line) => {
                    const idx = indexOf.get(line.key) ?? -1;
                    const r = results[idx];
                    const c = chosen(idx);
                    const query = r?.query || line.name;
                    const price = r?.price ?? null;
                    const pack = r?.pack || '';
                    const n = r?.candidates.length ?? 0;
                    // A real product page beats a name search when we resolved one.
                    const exact = r?.productUrl || null;
                    return (
                      <div
                        key={line.key}
                        style={{
                          border: `1px solid ${p.borderSoft}`,
                          borderRadius: 12,
                          background: p.card,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 20 }}>{line.emoji}</span>
                          <span
                            style={{
                              flex: 1,
                              fontWeight: 700,
                              fontSize: 14.5,
                              minWidth: 0,
                            }}
                          >
                            {line.name}
                            {(line.qty > 1 || line.unit) && (
                              <span style={{ color: p.textFaint, fontWeight: 600 }}>
                                {' '}
                                {line.qty}
                                {line.unit ? ` ${line.unit}` : '×'}
                              </span>
                            )}
                            {line.isNew && (
                              <span
                                style={{
                                  marginLeft: 7,
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  letterSpacing: '0.05em',
                                  color: '#fff',
                                  background: g.cat.color,
                                  borderRadius: 5,
                                  padding: '1.5px 5px',
                                  verticalAlign: 'middle',
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </span>
                          {sm && (
                            <button
                              onClick={() =>
                                window.open(
                                  exact || sm.searchUrl(query),
                                  '_blank',
                                  'noopener,noreferrer',
                                )
                              }
                              title={
                                exact
                                  ? `Open this product at ${sm.name}`
                                  : `Find “${query}” at ${sm.name}`
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
                                flex: 'none',
                              }}
                            >
                              {exact ? 'Open ↗' : 'Find ↗'}
                            </button>
                          )}
                        </div>
                        {c || exact ? (
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
                                  color: exact ? p.text : p.textMuted,
                                  fontWeight: exact ? 600 : 400,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  overflowWrap: 'normal',
                                  lineHeight: 1.35,
                                }}
                              >
                                {exact && r?.productTitle
                                  ? r.productTitle
                                  : `${c?.name ?? ''}${c?.brand ? ` · ${c.brand}` : ''}`}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: 6,
                                  fontSize: 11.5,
                                  color: p.textFaint,
                                  marginTop: 4,
                                }}
                              >
                                {exact && (
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      letterSpacing: '0.04em',
                                      textTransform: 'uppercase',
                                      color: p.accent,
                                      background: p.accentTintBg,
                                      border: `1px solid ${p.accentTintBorder}`,
                                      borderRadius: 5,
                                      padding: '1px 5px',
                                    }}
                                  >
                                    Exact match
                                  </span>
                                )}
                                {price != null && (
                                  <b style={{ color: p.text }}>≈ £{price.toFixed(2)}</b>
                                )}
                                {pack && <span>{pack}</span>}
                                {c?.kcal != null && <span>{c.kcal} kcal/100g</span>}
                              </div>
                            </div>
                            {n > 1 && !exact && (
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
                                  flex: 'none',
                                }}
                              >
                                Swap {(swap[idx] ?? 0) + 1}/{n}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{ fontSize: 12, color: p.textFaint, marginTop: 6 }}
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

            {/* Already in the pantry — shown, excluded from the total. */}
            {shop.owned.length > 0 && (
              <div>
                <div style={sectionLabel}>Already have ({shop.owned.length})</div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {shop.owned.map((line) => (
                    <span
                      key={line.key}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12.5,
                        color: p.textFaint,
                        background: p.surfaceSunk,
                        border: `1px solid ${p.borderSoft}`,
                        borderRadius: 8,
                        padding: '4px 8px',
                        textDecoration: 'line-through',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{line.emoji}</span>
                      {line.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assumptions — the judgement calls, where you can correct them. */}
            <div style={sectionLabel}>Assumptions</div>
            <ul
              style={{
                margin: '0 0 4px',
                padding: '0 0 0 18px',
                fontSize: 12,
                color: p.textMuted,
                lineHeight: 1.5,
              }}
            >
              {assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>

            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: p.textFaint,
                textAlign: 'center',
              }}
            >
              Products & nutrition via Open Food Facts · prices estimated
            </div>
          </>
        )}
      </div>
    </div>
  );
}
