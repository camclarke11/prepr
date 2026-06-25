import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { categoryByName, DAYS } from '../theme';
import { fmtQtyUnit, ingredientLines } from '../lib/format';
import { Modal } from './Modal';
import { EditIcon, TrashIcon } from './icons';

export function RecipeDetail() {
  const { state, actions } = useStore();
  const p = usePalette();
  const recipe = state.recipes.find((r) => r.id === state.openRecipe);
  if (!recipe) return null;

  const sv = state.servings;
  const factor = recipe.servings > 0 ? sv / recipe.servings : 1;

  const copyIngredients = () => {
    const text = `${recipe.name} — ${sv} servings\n${ingredientLines(
      recipe.ingredients,
      factor,
    )}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => actions.showToast('Ingredients copied'),
        () => actions.showToast('Could not copy'),
      );
    } else {
      actions.showToast('Clipboard unavailable');
    }
  };
  const tint = categoryByName(
    recipe.ingredients[0] ? recipe.ingredients[0].category : 'Pantry',
  ).tint;

  const roundBtn = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.8)',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
    color: '#3a382f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  return (
    <Modal onClose={actions.closeRecipe} width={560} labelledBy="recipe-title">
      <div
        style={{
          position: 'relative',
          height: recipe.image ? 200 : 140,
          background: tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {recipe.image && (
          <img
            src={recipe.image}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            display: 'flex',
            gap: 8,
            zIndex: 1,
          }}
        >
          <button
            onClick={() => actions.openEdit(recipe.id)}
            aria-label="Edit recipe"
            style={roundBtn}
          >
            <EditIcon size={16} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete “${recipe.name}”?`)) {
                actions.deleteRecipe(recipe.id);
              }
            }}
            aria-label="Delete recipe"
            style={roundBtn}
          >
            <TrashIcon size={16} />
          </button>
          <button onClick={actions.closeRecipe} aria-label="Close" style={roundBtn}>
            ×
          </button>
        </div>
        {!recipe.image && <span style={{ fontSize: 62 }}>{recipe.emoji}</span>}
      </div>

      <div style={{ padding: '22px 24px 24px', overflowY: 'auto' }}>
        <div
          id="recipe-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {recipe.name}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 8,
            color: p.textMuted,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>⏱ {recipe.time}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '22px 0 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Ingredients</h3>
            <button
              onClick={copyIngredients}
              aria-label="Copy ingredients"
              title="Copy ingredients"
              className="pr-press"
              style={{
                border: `1px solid ${p.border}`,
                background: p.card,
                color: p.textMuted,
                borderRadius: 8,
                padding: '3px 9px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Copy
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: p.surfaceAlt,
              borderRadius: 10,
              padding: '4px 5px',
            }}
          >
            <button
              onClick={actions.decServings}
              aria-label="Fewer servings"
              style={stepBtn(p)}
            >
              −
            </button>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                minWidth: 74,
                textAlign: 'center',
              }}
            >
              {sv} servings
            </span>
            <button
              onClick={actions.incServings}
              aria-label="More servings"
              style={stepBtn(p)}
            >
              +
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${p.borderSoft}`,
          }}
        >
          {recipe.ingredients.map((ing, i) => {
            const have = state.pantry.includes(ing.name);
            return (
              <div
                key={`${ing.name}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 13px',
                  background: i % 2 ? p.surfaceSunk : p.card,
                  opacity: have ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 19, width: 26, textAlign: 'center' }}>
                  {ing.emoji}
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>
                  {ing.name}
                </span>
                {have && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#5d8a4a',
                      background: '#eef2e8',
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    in pantry
                  </span>
                )}
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: p.text,
                    minWidth: 62,
                    textAlign: 'right',
                  }}
                >
                  {fmtQtyUnit(ing.qty * factor, ing.unit)}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '24px 0 12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Method</h3>
          {recipe.steps.length > 0 && (
            <button
              onClick={() => actions.openCook(recipe.id)}
              className="pr-press"
              aria-label="Start cook mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: `1.5px solid ${p.accent}`,
                background: p.accentTintBg,
                color: p.accentTintText,
                borderRadius: 9,
                padding: '5px 12px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ▶ Cook
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {recipe.steps.map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 13 }}>
              <div
                style={{
                  flex: 'none',
                  width: 25,
                  height: 25,
                  borderRadius: '50%',
                  background: p.accent,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: p.text,
                  paddingTop: 1,
                }}
              >
                {text}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
          <button
            onClick={() => actions.addRecipeToList(recipe, sv)}
            className="pr-press"
            style={{
              flex: 1,
              minWidth: 170,
              padding: 14,
              borderRadius: 13,
              border: 'none',
              background: p.accent,
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(63,122,79,0.28)',
            }}
          >
            ＋ Add ingredients to list
          </button>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                actions.assignMeal(e.target.value, recipe.id);
                actions.closeRecipe();
              }
            }}
            aria-label="Plan a day"
            style={{
              flex: 'none',
              padding: '0 14px',
              borderRadius: 13,
              border: `1px solid ${p.border}`,
              background: p.surfaceSunk,
              fontWeight: 700,
              fontSize: 14,
              color: p.textMuted,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Plan a day…</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function stepBtn(p: ReturnType<typeof usePalette>) {
  return {
    width: 28,
    height: 28,
    border: 'none',
    background: p.card,
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
    color: p.text,
  } as const;
}
