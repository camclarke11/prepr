import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { CATEGORIES, categoryByName } from '../theme';
import { CATALOG } from '../data/seed';
import { ActiveTile, CatalogTile, CategoryHeading } from '../components/tiles';
import { SearchIcon } from '../components/icons';

export function ShoppingListView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { list, search, recents, flash } = state;

  const q = search.trim().toLowerCase();
  const listQty = (name: string) => list.find((x) => x.name === name)?.qty ?? 0;

  const listGroups = CATEGORIES.map((cat) => ({
    cat,
    items: list.filter((x) => x.category === cat.name),
  })).filter((g) => g.items.length > 0);

  const catalogGroups = CATEGORIES.map((cat) => {
    let items = CATALOG.filter((c) => c.category === cat.name);
    if (q) items = items.filter((c) => c.name.toLowerCase().includes(q));
    return { cat, items };
  }).filter((g) => g.items.length > 0);

  const showCustom = q.length > 0 && !CATALOG.some((c) => c.name.toLowerCase() === q);

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
      <section>
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
            {list.length}
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
                    onGot={() => actions.gotIt(it.key)}
                    onDetail={() => actions.openDetail(it.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
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

        <div style={{ position: 'relative', marginBottom: 18 }}>
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
              if (e.key === 'Enter' && showCustom) actions.addCustom();
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
          <button
            onClick={actions.addCustom}
            className="pr-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '13px 15px',
              marginBottom: 16,
              borderRadius: 13,
              border: `1.5px solid ${p.accent}`,
              background: p.accentTintBg,
              color: p.accentTintText,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span> Add “{search.trim()}
            ” to list
          </button>
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
              style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: 2 }}
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
    </div>
  );
}
