import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { DAYS } from '../theme';
import { MEAL_SLOTS, parsePlanEntry, type MealSlot } from '../state/operations';
import type { DayKey } from '../types';

const VIEW_KEY = 'prepr.mealView';
const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

type ViewMode = 'simple' | 'slots';

interface Entry {
  idx: number;
  id: string;
  slot: MealSlot;
  name: string;
  emoji: string;
  known: boolean;
}

export function MealPlanView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { plan, recipes } = state;

  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'slots' ? 'slots' : 'simple';
    } catch {
      return 'simple';
    }
  });
  const setMode = (m: ViewMode) => {
    try {
      localStorage.setItem(VIEW_KEY, m);
    } catch {
      /* ignore */
    }
    setView(m);
  };

  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  const entriesFor = (day: string): Entry[] =>
    (plan[day as DayKey] || []).map((ref, idx) => {
      const { id, slot } = parsePlanEntry(ref);
      const r = recipes.find((x) => x.id === id);
      return {
        idx,
        id,
        slot,
        name: r?.name ?? '—',
        emoji: r?.emoji ?? '🍽️',
        known: !!r,
      };
    });

  const chip = (day: string, e: Entry) => (
    <div
      key={e.idx}
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
      <span style={{ fontSize: 17, flex: 'none' }}>{e.emoji}</span>
      <span
        onClick={() => e.known && actions.openRecipe(e.id)}
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 600,
          fontSize: 13.5,
          lineHeight: 1.3,
          overflowWrap: 'anywhere',
          cursor: e.known ? 'pointer' : 'default',
        }}
      >
        {e.name}
      </span>
      <button
        onClick={() => actions.removeMeal(day, e.idx)}
        aria-label={`Remove ${e.name} from ${day}`}
        style={{
          border: 'none',
          background: 'none',
          color: p.textFaint,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 2px',
          flex: 'none',
        }}
      >
        ×
      </button>
    </div>
  );

  const addSelect = (day: string, slot: MealSlot, label: string, accent: boolean) => (
    <select
      value=""
      onChange={(e) => {
        actions.assignMeal(day, e.target.value, slot);
        e.target.value = '';
      }}
      aria-label={`Add a ${SLOT_LABEL[slot].toLowerCase()} to ${day}`}
      style={{
        width: '100%',
        padding: '7px 10px',
        borderRadius: 9,
        border: `1px dashed ${accent ? p.accentTintBorder : p.border}`,
        background: accent ? 'transparent' : p.surfaceSunk,
        color: p.textMuted,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <option value="">＋ {label}</option>
      {recipes.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );

  const slotLabelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: p.textFaint,
    marginBottom: 7,
  };

  const segBtn = (m: ViewMode): CSSProperties => ({
    border: 'none',
    background: view === m ? p.accent : 'transparent',
    color: view === m ? '#fff' : p.textMuted,
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Granularity toggle */}
      <div
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          gap: 3,
          padding: 3,
          background: p.surfaceSunk,
          border: `1px solid ${p.borderSoft}`,
          borderRadius: 11,
        }}
      >
        <button onClick={() => setMode('simple')} style={segBtn('simple')}>
          Simple
        </button>
        <button onClick={() => setMode('slots')} style={segBtn('slots')}>
          {mobile ? 'B · L · D' : 'Breakfast · Lunch · Dinner'}
        </button>
      </div>

      {DAYS.map((day, i) => {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + i);
        const isToday = dt.toDateString() === today.toDateString();
        const entries = entriesFor(day);

        return (
          <div
            key={day}
            data-tour={i === 0 ? 'plan' : undefined}
            style={{
              background: isToday ? p.accentTintBg : p.surfaceAlt,
              border: isToday ? `1.5px solid ${p.accent}` : `1px solid ${p.border}`,
              borderRadius: 14,
              padding: mobile ? '12px 13px' : '13px 16px',
              display: 'flex',
              flexDirection: mobile ? 'column' : 'row',
              gap: mobile ? 11 : 18,
            }}
          >
            {/* Day label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                flex: 'none',
                width: mobile ? 'auto' : 86,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '0.02em',
                  color: isToday ? p.accentTintText : p.text,
                }}
              >
                {day}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: isToday ? p.accent : p.textFaint,
                }}
              >
                {dt.getDate()}
              </span>
            </div>

            {/* Meals */}
            {view === 'slots' ? (
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: mobile ? 12 : 14,
                }}
              >
                {MEAL_SLOTS.map((slot) => (
                  <div key={slot}>
                    <div style={slotLabelStyle}>{SLOT_LABEL[slot]}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {entries.filter((e) => e.slot === slot).map((e) => chip(day, e))}
                      {addSelect(day, slot, 'Add', isToday)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                }}
              >
                {entries.map((e) => chip(day, e))}
                {addSelect(day, 'dinner', 'Add meal', isToday)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
