import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { CATEGORIES } from '../theme';
import { CATALOG } from '../data/seed';
import { PantryTile, CategoryHeading } from '../components/tiles';
import { SearchIcon } from '../components/icons';

export function PantryView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const { pantry, search } = state;

  const q = search.trim().toLowerCase();
  const groups = CATEGORIES.map((cat) => {
    let items = CATALOG.filter((c) => c.category === cat.name);
    if (q) items = items.filter((c) => c.name.toLowerCase().includes(q));
    return { cat, items };
  }).filter((g) => g.items.length > 0);

  return (
    <div style={{ maxWidth: 880 }}>
      <div
        style={{
          background: p.accentTintBg,
          border: `1px solid ${p.accentTintBorder}`,
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>🥫</span>
        <div style={{ fontSize: 14, color: p.accentTintText, lineHeight: 1.4 }}>
          <b>{pantry.length} staples on hand.</b> Items here are skipped when you add
          a recipe to your list.
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 420 }}>
        <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)' }}>
          <SearchIcon color={p.textFaint} />
        </span>
        <input
          data-search-input
          value={search}
          onChange={(e) => actions.setSearch(e.target.value)}
          placeholder="Search your kitchen…"
          aria-label="Search your kitchen"
          style={{
            width: '100%',
            padding: '13px 15px 13px 42px',
            borderRadius: 13,
            border: `1px solid ${p.border}`,
            background: p.card,
            fontSize: 15,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map((g) => (
          <div key={g.cat.name}>
            <CategoryHeading cat={g.cat} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {g.items.map((c) => (
                <PantryTile
                  key={c.id}
                  item={c}
                  p={p}
                  have={pantry.includes(c.name)}
                  onToggle={() => actions.togglePantry(c.name)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
