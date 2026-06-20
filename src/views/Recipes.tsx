import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { categoryByName } from '../theme';
import { SearchIcon, StarIcon } from '../components/icons';

export function RecipesView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const { recipes, recipeQuery } = state;

  const q = recipeQuery.trim().toLowerCase();
  const filtered = recipes
    .filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
    )
    .slice()
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 22, maxWidth: 420 }}>
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
          value={recipeQuery}
          onChange={(e) => actions.setRecipeQuery(e.target.value)}
          placeholder="Search recipes…"
          aria-label="Search recipes"
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

      {filtered.length === 0 && (
        <div
          style={{
            border: `1.5px dashed ${p.border}`,
            borderRadius: 16,
            padding: '46px 22px',
            textAlign: 'center',
            color: p.textFaint,
            maxWidth: 460,
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 8 }}>🍳</div>
          <div style={{ fontWeight: 700, color: p.textMuted, marginBottom: 3 }}>
            {q ? 'No recipes match' : 'No recipes yet'}
          </div>
          <div style={{ fontSize: 14 }}>
            {q ? 'Try another search.' : 'Tap “New recipe” to add one.'}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
          gap: 20,
        }}
      >
        {filtered.map((r) => {
          const tint = categoryByName(
            r.ingredients[0] ? r.ingredients[0].category : 'Pantry',
          ).tint;
          return (
            <div
              key={r.id}
              onClick={() => actions.openRecipe(r.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') actions.openRecipe(r.id);
              }}
              style={{
                background: p.card,
                border: `1px solid ${p.borderSoft}`,
                borderRadius: 18,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: `0 1px 3px ${p.shadow}`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 96,
                  background: tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 50 }}>{r.emoji}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.toggleFavorite(r.id);
                  }}
                  aria-label={r.favorite ? 'Unfavourite' : 'Favourite'}
                  aria-pressed={!!r.favorite}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.82)',
                    color: r.favorite ? '#e0a32e' : '#8a887f',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StarIcon size={17} filled={!!r.favorite} />
                </button>
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 13,
                    marginTop: 7,
                    color: p.textMuted,
                    fontSize: 13,
                    fontWeight: 600,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>⏱ {r.time}</span>
                  <span>· {r.servings} servings</span>
                  <span>· {r.ingredients.length} items</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.addRecipeToList(r, r.servings);
                  }}
                  className="pr-press"
                  style={{
                    marginTop: 13,
                    width: '100%',
                    padding: 9,
                    borderRadius: 10,
                    border: `1px solid ${p.accentTintBorder}`,
                    background: p.accentTintBg,
                    color: p.accentTintText,
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                  }}
                >
                  ＋ Add to list
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
