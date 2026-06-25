import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { CATEGORIES, categoryByName } from '../theme';
import { CATALOG } from '../data/seed';
import { suggestEmoji } from '../data/emoji';
import { ActiveTile, CatalogTile, CategoryHeading } from '../components/tiles';
import { EmojiPicker } from '../components/EmojiPicker';
import { SmartListPanel } from '../components/SmartListPanel';
import { SearchIcon } from '../components/icons';
import type { CategoryName } from '../types';

export function ShoppingListView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { list, search, recents, flash } = state;
  const planHasMeals = Object.values(state.plan).some((ids) => ids.length > 0);

  const q = search.trim().toLowerCase();
  const listQty = (name: string) => list.find((x) => x.name === name)?.qty ?? 0;

  // Split the list: still-to-get items group by category as before; checked
  // items collect in a flat "In the trolley" section at the bottom.
  const toGet = list.filter((x) => !x.checked);
  const inTrolley = list.filter((x) => x.checked);

  const listGroups = CATEGORIES.map((cat) => ({
    cat,
    items: toGet.filter((x) => x.category === cat.name),
  })).filter((g) => g.items.length > 0);

  const catalogGroups = CATEGORIES.map((cat) => {
    let items = CATALOG.filter((c) => c.category === cat.name);
    if (q) items = items.filter((c) => c.name.toLowerCase().includes(q));
    return { cat, items };
  }).filter((g) => g.items.length > 0);

  const showCustom = q.length > 0 && !CATALOG.some((c) => c.name.toLowerCase() === q);

  // Emoji selection for a custom item: a smart suggestion from the typed name,
  // overridable via the picker. The emoji also decides the item's category.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [emojiOverride, setEmojiOverride] = useState<{
    emoji: string;
    category: CategoryName;
  } | null>(null);
  // Re-suggest when the name changes; a manual pick holds until the next edit.
  useEffect(() => setEmojiOverride(null), [search]);

  const topSuggestion = suggestEmoji(search.trim())[0];
  const customEmoji = emojiOverride?.emoji ?? topSuggestion?.emoji ?? '🛒';
  const customCategory: CategoryName =
    emojiOverride?.category ?? topSuggestion?.category ?? 'Pantry';
  const addCustomItem = () => {
    actions.addCustom({ emoji: customEmoji, category: customCategory });
    setEmojiOverride(null);
    setPickerOpen(false);
  };

  const recentItems = !q
    ? recents
        .map((id) => CATALOG.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : [];

  return (
    <div
      style={
        mobile
          ? { display: 'flex', flexDirection: 'column', gap: 28 }
          : {
              display: 'grid',
              gridTemplateColumns: 'minmax(330px,1fr) 1.15fr',
              gap: 40,
              alignItems: 'start',
            }
      }
    >
      {/* ---- Your list ---- */}
      <section data-tour="list">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            Your list
          </h2>
          <span
            style={{
              minWidth: 22,
              height: 22,
              padding: '0 8px',
              borderRadius: 11,
              background: p.accent,
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {toGet.length}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: p.textFaint,
              fontWeight: 600,
            }}
          >
            Tap a tile when it’s in your cart
          </span>
          {(list.length > 0 || planHasMeals) && (
            <button
              onClick={() => setSmartOpen(true)}
              className="pr-press"
              style={{
                border: `1px solid ${p.accentTintBorder}`,
                background: p.accentTintBg,
                color: p.accentTintText,
                borderRadius: 9,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✨ Smart shop
            </button>
          )}
          {list.length > 0 && (
            <button
              onClick={actions.clearAll}
              style={{
                border: `1px solid ${p.border}`,
                background: p.card,
                color: p.textMuted,
                borderRadius: 9,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {list.length === 0 && (
          <div
            style={{
              border: `1.5px dashed ${p.border}`,
              borderRadius: 16,
              padding: '40px 22px',
              textAlign: 'center',
              color: p.textFaint,
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 8 }}>🧺</div>
            <div style={{ fontWeight: 700, color: p.textMuted, marginBottom: 3 }}>
              Your list is empty
            </div>
            <div style={{ fontSize: 14 }}>Tap items below to add them.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {listGroups.map((g) => (
            <div key={g.cat.name}>
              <CategoryHeading cat={g.cat} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {g.items.map((it) => (
                  <ActiveTile
                    key={it.key}
                    item={it}
                    cat={g.cat}
                    p={p}
                    me={state.activeMember}
                    onGot={() => actions.toggleGot(it.key)}
                    onDetail={() => actions.openDetail(it.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Everything ticked off — the list isn't empty, it's all in the cart. */}
        {list.length > 0 && toGet.length === 0 && (
          <div
            style={{
              padding: '18px 0 4px',
              textAlign: 'center',
              color: p.textMuted,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            🎉 Everything’s in the trolley
          </div>
        )}

        {/* ---- In the trolley ---- */}
        {inTrolley.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: p.textMuted,
                }}
              >
                In the trolley
              </h3>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: p.textFaint,
                }}
              >
                {inTrolley.length}
              </span>
              <button
                onClick={actions.clearTrolley}
                className="pr-press"
                style={{
                  marginLeft: 'auto',
                  border: `1px solid ${p.border}`,
                  background: p.card,
                  color: p.textMuted,
                  borderRadius: 9,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear trolley
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {inTrolley.map((it) => (
                <ActiveTile
                  key={it.key}
                  item={it}
                  cat={categoryByName(it.category)}
                  p={p}
                  me={state.activeMember}
                  onGot={() => actions.toggleGot(it.key)}
                  onDetail={() => actions.openDetail(it.key)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---- Add items ---- */}
      <section>
        <h2
          style={{
            margin: '0 0 14px',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          Add items
        </h2>

        <div data-tour="add" style={{ position: 'relative', marginBottom: 18 }}>
          <span
            style={{
              position: 'absolute',
              left: 15,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <SearchIcon color={p.textFaint} />
          </span>
          <input
            data-search-input
            value={search}
            onChange={(e) => actions.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showCustom) addCustomItem();
            }}
            placeholder="Search or add an item…"
            aria-label="Search or add an item"
            style={{
              width: '100%',
              padding: '13px 15px 13px 42px',
              borderRadius: 13,
              border: `1px solid ${p.border}`,
              background: p.card,
              fontSize: 15,
              outline: 'none',
              boxShadow: `0 1px 2px ${p.shadow}`,
            }}
          />
        </div>

        {showCustom && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                aria-label="Choose emoji"
                aria-expanded={pickerOpen}
                title="Choose emoji"
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 12px',
                  borderRadius: 13,
                  border: `1.5px solid ${p.accent}`,
                  background: p.accentTintBg,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{customEmoji}</span>
                <span style={{ fontSize: 10, color: p.accentTintText }}>▾</span>
              </button>
              <button
                onClick={addCustomItem}
                className="pr-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  padding: '13px 15px',
                  borderRadius: 13,
                  border: `1.5px solid ${p.accent}`,
                  background: p.accentTintBg,
                  color: p.accentTintText,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span> Add “
                {search.trim()}” to list
              </button>
            </div>
            {pickerOpen && (
              <EmojiPicker
                query={search.trim()}
                value={customEmoji}
                onPick={(emoji, category) => {
                  setEmojiOverride({ emoji, category });
                  setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
                p={p}
              />
            )}
          </div>
        )}

        {recentItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#8a887f',
                marginBottom: 10,
              }}
            >
              Recently used
            </div>
            <div
              className="pr-hide-scroll"
              style={{
                display: 'flex',
                gap: 9,
                overflowX: 'auto',
                // A scroll container clips on all four sides, which would cut off
                // each tile's qty badge (top: -7), hover lift and pop/shadow
                // animations — including the pop on the first tile against the
                // left edge. Pad on every side to give them room, then pull the
                // margin back by the same amounts so the layout is unchanged.
                padding: '12px 16px 18px',
                margin: '-12px -16px -18px',
              }}
            >
              {recentItems.map((c) => (
                <CatalogTile
                  key={c.id}
                  item={c}
                  cat={categoryByName(c.category)}
                  p={p}
                  qty={listQty(c.name)}
                  flash={flash === c.id}
                  onAdd={() => actions.addCatalog(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {catalogGroups.length === 0 && (
          <div
            style={{
              padding: '24px 0',
              color: p.textFaint,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            No matches{showCustom ? ' — add it as a custom item above.' : '.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {catalogGroups.map((g) => (
            <div key={g.cat.name}>
              <CategoryHeading cat={g.cat} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {g.items.map((c) => (
                  <CatalogTile
                    key={c.id}
                    item={c}
                    cat={g.cat}
                    p={p}
                    qty={listQty(c.name)}
                    flash={flash === c.id}
                    onAdd={() => actions.addCatalog(c.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {smartOpen && <SmartListPanel onClose={() => setSmartOpen(false)} />}
    </div>
  );
}
