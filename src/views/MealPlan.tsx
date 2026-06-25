import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
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

interface DragState {
  fromDay: string;
  fromIndex: number;
  name: string;
  x: number;
  y: number;
  active: boolean;
  hoverDay: string | null;
  hoverSlot: MealSlot | null;
}

interface DragOrigin {
  fromDay: string;
  fromIndex: number;
  name: string;
  startX: number;
  startY: number;
}

export function MealPlanView() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { plan, recipes } = state;
  const dragOrigin = useRef<DragOrigin | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

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

  const hoverMatches = (day: string, slot: MealSlot) =>
    drag?.active && drag.hoverDay === day && drag.hoverSlot === slot;

  const updateDragTarget = (x: number, y: number) => {
    const target = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-plan-drop-day]');
    const hoverDay = target?.dataset.planDropDay ?? null;
    const hoverSlot = (target?.dataset.planDropSlot as MealSlot | undefined) ?? null;
    setDrag((cur) => (cur ? { ...cur, x, y, hoverDay, hoverSlot } : cur));
  };

  const beginDrag = (ev: PointerEvent<HTMLButtonElement>, day: string, e: Entry) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragOrigin.current = {
      fromDay: day,
      fromIndex: e.idx,
      name: e.name,
      startX: ev.clientX,
      startY: ev.clientY,
    };
    setDrag({
      fromDay: day,
      fromIndex: e.idx,
      name: e.name,
      x: ev.clientX,
      y: ev.clientY,
      active: false,
      hoverDay: null,
      hoverSlot: null,
    });
  };

  const moveDrag = (ev: PointerEvent<HTMLButtonElement>) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    ev.preventDefault();
    const dx = ev.clientX - origin.startX;
    const dy = ev.clientY - origin.startY;
    const active = drag?.active || Math.hypot(dx, dy) > 6;
    setDrag((cur) =>
      cur
        ? {
            ...cur,
            x: ev.clientX,
            y: ev.clientY,
            active,
          }
        : cur,
    );
    if (active) updateDragTarget(ev.clientX, ev.clientY);
  };

  const endDrag = (ev: PointerEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      /* pointer capture may already be gone */
    }
    const cur = drag;
    dragOrigin.current = null;
    setDrag(null);
    if (cur?.active && cur.hoverDay) {
      actions.moveMeal(
        cur.fromDay,
        cur.fromIndex,
        cur.hoverDay,
        cur.hoverSlot ?? undefined,
      );
    }
  };

  const cancelDrag = () => {
    dragOrigin.current = null;
    setDrag(null);
  };

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
        opacity:
          drag?.fromDay === day && drag.fromIndex === e.idx && drag.active ? 0.45 : 1,
      }}
    >
      <button
        type="button"
        aria-label={`Move ${e.name}`}
        title="Move meal"
        onPointerDown={(ev) => beginDrag(ev, day, e)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        style={{
          width: 18,
          height: 24,
          border: 'none',
          background: 'none',
          color: p.textFaint,
          cursor: 'grab',
          padding: 0,
          flex: 'none',
          fontSize: 15,
          lineHeight: 1,
          touchAction: 'none',
        }}
      >
        ⋮⋮
      </button>
      <span style={{ fontSize: 17, flex: 'none' }}>{e.emoji}</span>
      <button
        type="button"
        onClick={() => e.known && actions.openRecipe(e.id)}
        disabled={!e.known}
        aria-label={e.known ? `Open ${e.name}` : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 600,
          fontSize: 13.5,
          lineHeight: 1.3,
          overflowWrap: 'anywhere',
          cursor: e.known ? 'pointer' : 'default',
          border: 'none',
          background: 'none',
          color: p.text,
          padding: 0,
          textAlign: 'left',
          font: 'inherit',
        }}
      >
        {e.name}
      </button>
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
                  <div
                    key={slot}
                    data-plan-drop-day={day}
                    data-plan-drop-slot={slot}
                    style={{
                      borderRadius: 12,
                      outline: hoverMatches(day, slot)
                        ? `2px solid ${p.accent}`
                        : '2px solid transparent',
                      outlineOffset: 3,
                    }}
                  >
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
                data-plan-drop-day={day}
                data-plan-drop-slot="dinner"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  borderRadius: 12,
                  outline: hoverMatches(day, 'dinner')
                    ? `2px solid ${p.accent}`
                    : '2px solid transparent',
                  outlineOffset: 3,
                }}
              >
                {entries.map((e) => chip(day, e))}
                {addSelect(day, 'dinner', 'Add meal', isToday)}
              </div>
            )}
          </div>
        );
      })}
      {drag?.active && (
        <div
          style={{
            position: 'fixed',
            left: drag.x + 12,
            top: drag.y + 12,
            zIndex: 80,
            pointerEvents: 'none',
            padding: '8px 11px',
            borderRadius: 10,
            background: p.card,
            border: `1px solid ${p.accent}`,
            boxShadow: `0 8px 24px ${p.shadow}`,
            color: p.text,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {drag.name}
        </div>
      )}
    </div>
  );
}
