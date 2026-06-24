import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { DAYS } from '../theme';
import type { DayKey } from '../types';

export function MealPlanView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { plan, recipes } = state;

  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  return (
    <div
      style={{
        display: 'grid',
        // One clean Mon–Sun strip on desktop; a compact 2-up on phones. A fixed
        // 7 (not auto-fill) keeps the week on a single row instead of orphaning
        // Sunday onto its own line.
        gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(7, minmax(0, 1fr))',
        gap: mobile ? 10 : 12,
        alignItems: 'stretch',
      }}
    >
      {DAYS.map((day, i) => {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + i);
        const isToday = dt.toDateString() === today.toDateString();
        const meals = (plan[day as DayKey] || []).map((id, idx) => {
          const r = recipes.find((x) => x.id === id) ?? {
            id,
            name: '—',
            emoji: '🍽️',
          };
          return { id, idx, name: r.name, emoji: r.emoji };
        });

        return (
          <div
            key={day}
            data-tour={i === 0 ? 'plan' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: isToday ? p.accentTintBg : p.surfaceAlt,
              border: isToday ? `1.5px solid ${p.accent}` : `1px solid ${p.border}`,
              borderRadius: 14,
              minHeight: 156,
              overflow: 'hidden',
            }}
          >
            {/* Day header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 11px',
                borderBottom: `1px solid ${isToday ? p.accentTintBorder : p.borderSoft}`,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 12.5,
                  letterSpacing: '0.03em',
                  color: isToday ? p.accentTintText : p.text,
                }}
              >
                {day}
              </span>
              <span
                style={{
                  minWidth: 21,
                  height: 21,
                  padding: '0 5px',
                  borderRadius: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11.5,
                  fontWeight: 800,
                  background: isToday ? p.accent : 'transparent',
                  color: isToday ? '#fff' : p.textFaint,
                }}
              >
                {dt.getDate()}
              </span>
            </div>

            {/* Meals (grows so the Add control sits flush at the bottom) */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '9px 9px 0',
              }}
            >
              {meals.length === 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: p.textFaint,
                    padding: '2px 2px 0',
                  }}
                >
                  No meals yet
                </span>
              )}
              {meals.map((m) => (
                <div
                  key={`${m.id}-${m.idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    background: p.card,
                    border: `1px solid ${p.borderSoft}`,
                    borderRadius: 9,
                    padding: '6px 8px',
                  }}
                >
                  <span style={{ fontSize: 16, flex: 'none' }}>{m.emoji}</span>
                  <span
                    onClick={() => m.name !== '—' && actions.openRecipe(m.id)}
                    style={{
                      flex: 1,
                      fontWeight: 600,
                      fontSize: 13,
                      lineHeight: 1.25,
                      cursor: m.name === '—' ? 'default' : 'pointer',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.name}
                  </span>
                  <button
                    onClick={() => actions.removeMeal(day, m.idx)}
                    aria-label={`Remove ${m.name} from ${day}`}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: p.textFaint,
                      cursor: 'pointer',
                      fontSize: 15,
                      lineHeight: 1,
                      padding: '0 1px',
                      flex: 'none',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add meal */}
            <div style={{ padding: 9 }}>
              <select
                value=""
                onChange={(e) => {
                  actions.assignMeal(day, e.target.value);
                  e.target.value = '';
                }}
                aria-label={`Add a meal to ${day}`}
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  borderRadius: 9,
                  border: `1px dashed ${isToday ? p.accentTintBorder : p.border}`,
                  background: isToday ? 'transparent' : p.surfaceSunk,
                  color: p.textMuted,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">＋ Add meal</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
