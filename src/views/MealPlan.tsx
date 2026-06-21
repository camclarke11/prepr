import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { DAYS } from '../theme';
import type { DayKey } from '../types';

export function MealPlanView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const { plan, recipes } = state;

  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
        gap: 14,
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
              background: isToday ? p.surface : p.surfaceAlt,
              border: isToday ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
              borderRadius: 15,
              padding: '13px 13px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 11,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>
                {day}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isToday ? p.accent : p.textFaint,
                }}
              >
                {dt.getDate()}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                marginBottom: 10,
                minHeight: 8,
              }}
            >
              {meals.map((m) => (
                <div
                  key={`${m.id}-${m.idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: p.card,
                    border: `1px solid ${p.borderSoft}`,
                    borderRadius: 10,
                    padding: '7px 9px',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{m.emoji}</span>
                  <span
                    onClick={() => m.name !== '—' && actions.openRecipe(m.id)}
                    style={{
                      flex: 1,
                      fontWeight: 600,
                      fontSize: 13.5,
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
                      fontSize: 16,
                      lineHeight: 1,
                      padding: '0 2px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <select
              value=""
              onChange={(e) => {
                actions.assignMeal(day, e.target.value);
                e.target.value = '';
              }}
              aria-label={`Add a meal to ${day}`}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 9,
                border: `1px dashed ${p.border}`,
                background: p.surfaceSunk,
                color: p.textMuted,
                fontSize: 13,
                fontWeight: 600,
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
        );
      })}
    </div>
  );
}
