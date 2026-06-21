import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import type { Tab } from '../types';

interface Step {
  target: string;
  tab?: Tab;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: 'add',
    tab: 'list',
    title: 'Add anything',
    body: 'Search or type a custom item, pick its emoji, then add it. Or tap any item in the grid below to add it fast.',
  },
  {
    target: 'list',
    tab: 'list',
    title: 'Your list',
    body: 'Items you add land here, grouped by aisle. Tap a tile when it’s in your cart to tick it off; tap its count to change the amount or add a note.',
  },
  {
    target: 'recipes',
    tab: 'recipes',
    title: 'Recipes',
    body: 'Save your go-to recipes. Tap “＋ New recipe” at the top to add one — then “Add to list” drops its ingredients straight onto your shopping list.',
  },
  {
    target: 'plan',
    tab: 'plan',
    title: 'Plan your week',
    body: 'Give each day a meal from your recipes. Then “＋ Add week” at the top sends every ingredient to your list — staples you already have are skipped.',
  },
  {
    target: 'pantry',
    tab: 'pantry',
    title: 'Your pantry',
    body: 'Tick the staples you keep at home. They’re skipped when you add a recipe to your list, so you only buy what you actually need.',
  },
  {
    target: 'share',
    tab: 'list',
    title: 'Shop together',
    body: 'Create a shared list and send the invite to your partner. Changes sync live, and you’ll get a nudge when they add something.',
  },
];

/** A guided spotlight tour that walks through every tab, one step at a time. */
export function Tour() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = STEPS[i];

  useEffect(() => {
    if (!state.tourOpen) return;
    // Switch to the tab this step lives on, then wait for its view to mount.
    if (step.tab) actions.setTab(step.tab);
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      if (!scrolled) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        scrolled = true;
      }
      setRect(el.getBoundingClientRect());
    };
    tick();
    const id = window.setInterval(tick, 150);
    window.addEventListener('resize', tick);
    window.addEventListener('scroll', tick, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', tick);
      window.removeEventListener('scroll', tick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, state.tourOpen]);

  if (!state.tourOpen) return null;

  const last = i === STEPS.length - 1;
  const next = () => (last ? actions.endTour() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ttW = Math.min(320, vw - 24);
  const ttH = 188;

  let ttTop: number;
  let ttLeft: number;
  let hole: CSSProperties | null = null;
  if (rect) {
    hole = {
      position: 'fixed',
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderRadius: 14,
      boxShadow: '0 0 0 9999px rgba(20,20,18,0.6)',
      pointerEvents: 'none',
      zIndex: 1001,
      transition: 'all .2s ease',
    };
    const belowRoom = vh - (rect.bottom + pad) > ttH + 16;
    ttTop = belowRoom
      ? rect.bottom + pad + 12
      : Math.max(12, rect.top - pad - ttH - 12);
    ttLeft = Math.min(
      Math.max(12, rect.left + rect.width / 2 - ttW / 2),
      vw - ttW - 12,
    );
  } else {
    ttTop = vh / 2 - ttH / 2;
    ttLeft = vw / 2 - ttW / 2;
  }

  const textBtn: CSSProperties = {
    border: 'none',
    background: 'none',
    color: p.textFaint,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  };
  const ghostBtn: CSSProperties = {
    border: `1px solid ${p.border}`,
    background: p.card,
    color: p.text,
    borderRadius: 9,
    padding: '8px 13px',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const primaryBtn: CSSProperties = {
    border: 'none',
    background: p.accent,
    color: '#fff',
    borderRadius: 9,
    padding: '8px 15px',
    fontSize: 13.5,
    fontWeight: 800,
    cursor: 'pointer',
  };

  return (
    <div role="dialog" aria-label="Tutorial">
      {/* Block interaction with the app while the tour runs. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
      {hole && <div style={hole} />}
      <div
        style={{
          position: 'fixed',
          top: ttTop,
          left: ttLeft,
          width: ttW,
          zIndex: 1002,
          background: p.card,
          borderRadius: 14,
          border: `1px solid ${p.border}`,
          boxShadow: `0 16px 44px ${p.shadow}`,
          padding: '16px 18px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: p.textFaint,
            marginBottom: 6,
          }}
        >
          Step {i + 1} of {STEPS.length}
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          {step.title}
        </div>
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13.5,
            lineHeight: 1.5,
            color: p.textMuted,
          }}
        >
          {step.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={actions.endTour} style={textBtn}>
            Skip
          </button>
          <div style={{ flex: 1 }} />
          {i > 0 && (
            <button onClick={back} style={ghostBtn}>
              Back
            </button>
          )}
          <button onClick={next} className="pr-press" style={primaryBtn}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
