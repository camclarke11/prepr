import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile, useWakeLock } from '../hooks';
import { fmtQtyUnit } from '../lib/format';
import { parseStepDuration, formatClock } from '../lib/cookTimer';
import { recipePantryStaples } from '../state/operations';
import { ChevronIcon, CheckIcon } from './icons';
import type { Ingredient } from '../types';

/**
 * Full-screen, one-step-at-a-time cooking companion. Keeps the screen awake
 * (Wake Lock), supports swipe / arrow-key / tap navigation, peeks at the scaled
 * ingredients, and offers a one-tap timer for any step that names a duration.
 */
export function CookMode() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const recipe = state.recipes.find((r) => r.id === state.cookRecipeId);

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  // The pantry staples this recipe used, snapshotted when Cook mode opens so the
  // finish screen's list stays stable as items are restocked, and the names the
  // cook has chosen to restock.
  const [usedStaples, setUsedStaples] = useState<Ingredient[]>([]);
  const [restocked, setRestocked] = useState<string[]>([]);

  // A single timer that persists across steps. We track an absolute deadline
  // plus a ticking `now`, so the remaining time is always derived and drift-free.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const touch = useRef<{ x: number; y: number } | null>(null);

  const total = recipe?.steps.length ?? 0;

  useWakeLock(true);

  // Reset everything when the cooked recipe changes, snapshotting the pantry
  // staples it uses (pantry can't change mid-cook, so open-time == finish-time).
  useEffect(() => {
    setStep(0);
    setDone(false);
    setShowIngredients(false);
    setDeadline(null);
    setRestocked([]);
    setUsedStaples(recipe ? recipePantryStaples(recipe, state.pantry) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cookRecipeId]);

  // Lock the page behind the overlay.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tick only while a timer is live.
  useEffect(() => {
    if (deadline == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  const remaining =
    deadline == null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const timerRunning = remaining != null && remaining > 0;
  const timerDone = deadline != null && remaining === 0;

  // A gentle buzz when the timer reaches zero (mobile).
  useEffect(() => {
    if (timerDone) navigator.vibrate?.([180, 90, 180]);
  }, [timerDone]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showIngredients) setShowIngredients(false);
        else actions.closeCook();
        return;
      }
      if (done) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setStep((s) => {
          if (s + 1 >= total) {
            setDone(true);
            return s;
          }
          return s + 1;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, done, showIngredients, total]);

  if (!recipe) return null;

  const factor = recipe.servings > 0 ? state.servings / recipe.servings : 1;
  const stepText = recipe.steps[step] ?? '';
  const stepSeconds = parseStepDuration(stepText);
  const isLast = step + 1 >= total;

  const goNext = () => (isLast ? setDone(true) : setStep(step + 1));
  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const startTimer = (seconds: number) => setDeadline(Date.now() + seconds * 1000);
  const stopTimer = () => setDeadline(null);

  const roundBtn = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `1px solid ${p.border}`,
    background: p.card,
    color: p.text,
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
  } as const;

  const pillBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    height: 36,
    padding: '0 12px',
    borderRadius: 18,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    border: 'none',
  } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${recipe.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: p.bg,
        color: p.text,
        display: 'flex',
        flexDirection: 'column',
        animation: 'prIn .2s ease',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t || done) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) goNext();
          else goPrev();
        }
      }}
    >
      {/* ---- Header ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: mobile ? '12px 14px' : '16px 22px',
        }}
      >
        <button
          onClick={actions.closeCook}
          aria-label="Close cook mode"
          style={roundBtn}
        >
          ✕
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ marginRight: 7 }}>{recipe.emoji}</span>
            {recipe.name}
          </div>
        </div>

        {(timerRunning || timerDone) && (
          <button
            onClick={stopTimer}
            aria-label={timerDone ? 'Dismiss timer' : 'Cancel timer'}
            title={timerDone ? "Time's up — dismiss" : 'Cancel timer'}
            style={{
              ...pillBase,
              background: timerDone ? '#d9683f' : p.accentTintBg,
              color: timerDone ? '#fff' : p.accentTintText,
              animation: timerDone ? 'prPulse 1s ease-in-out infinite' : 'none',
            }}
          >
            {timerDone ? '⏰ Time’s up' : `⏲ ${formatClock(remaining ?? 0)}`}
            <span style={{ opacity: 0.7, fontSize: 13 }}>✕</span>
          </button>
        )}

        <button
          onClick={() => setShowIngredients(true)}
          className="pr-press"
          style={{
            ...pillBase,
            background: p.card,
            color: p.textMuted,
            border: `1px solid ${p.border}`,
          }}
        >
          Ingredients
        </button>
      </div>

      {done ? (
        <DoneScreen
          recipe={recipe}
          p={p}
          staples={usedStaples}
          restocked={restocked}
          onRestock={(ing) => {
            actions.restockStaple(ing);
            setRestocked((r) => [...r, ing.name]);
          }}
          onAgain={() => {
            setStep(0);
            setDone(false);
            setDeadline(null);
          }}
          onClose={actions.closeCook}
        />
      ) : (
        <>
          {/* ---- Progress ---- */}
          <div style={{ padding: mobile ? '0 14px' : '0 22px' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {recipe.steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: i <= step ? p.accent : p.border,
                    transition: 'background .25s ease',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 9,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: p.textFaint,
              }}
            >
              Step {step + 1} of {total}
            </div>
          </div>

          {/* ---- Step ---- */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: mobile ? '8px 22px' : '8px 32px',
              overflowY: 'auto',
            }}
          >
            <div
              key={step}
              style={{ maxWidth: 640, animation: 'prCookStep .28s ease' }}
            >
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 600,
                  fontSize: 'clamp(23px, 2.2vw + 15px, 36px)',
                  lineHeight: 1.4,
                  letterSpacing: '-0.01em',
                }}
              >
                {stepText}
              </div>

              {stepSeconds != null && !timerRunning && !timerDone && (
                <button
                  onClick={() => startTimer(stepSeconds)}
                  className="pr-press"
                  style={{
                    marginTop: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: `1.5px solid ${p.accent}`,
                    background: p.accentTintBg,
                    color: p.accentTintText,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ⏲ Start {formatClock(stepSeconds)} timer
                </button>
              )}
            </div>
          </div>

          {/* ---- Nav ---- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: mobile ? '12px 14px 18px' : '14px 22px 22px',
            }}
          >
            <button
              onClick={goPrev}
              disabled={step === 0}
              aria-label="Previous step"
              style={{
                width: 60,
                height: 56,
                borderRadius: 15,
                border: `1px solid ${p.border}`,
                background: p.card,
                color: p.text,
                cursor: step === 0 ? 'default' : 'pointer',
                opacity: step === 0 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <ChevronIcon dir="left" size={22} />
            </button>
            <button
              onClick={goNext}
              className="pr-press"
              style={{
                flex: 1,
                height: 56,
                borderRadius: 15,
                border: 'none',
                background: p.accent,
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                boxShadow: '0 3px 12px rgba(63,122,79,0.3)',
              }}
            >
              {isLast ? (
                <>
                  <CheckIcon size={19} strokeWidth={3} /> Finish
                </>
              ) : (
                <>
                  Next step <ChevronIcon dir="right" size={20} />
                </>
              )}
            </button>
          </div>
        </>
      )}

      {showIngredients && (
        <IngredientSheet
          recipe={recipe}
          factor={factor}
          p={p}
          mobile={mobile}
          onClose={() => setShowIngredients(false)}
        />
      )}
    </div>
  );
}

function DoneScreen({
  recipe,
  p,
  staples,
  restocked,
  onRestock,
  onAgain,
  onClose,
}: {
  recipe: { name: string; emoji: string };
  p: ReturnType<typeof usePalette>;
  staples: Ingredient[];
  restocked: string[];
  onRestock: (ing: Ingredient) => void;
  onAgain: () => void;
  onClose: () => void;
}) {
  const remaining = staples.filter((s) => !restocked.includes(s.name));
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px 28px 40px',
        gap: 6,
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: 76, animation: 'prPop .5s ease' }}>{recipe.emoji}</div>
      <div
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '-0.02em',
        }}
      >
        All done — enjoy!
      </div>
      <div style={{ color: p.textMuted, fontWeight: 600, marginBottom: 22 }}>
        You cooked {recipe.name}.
      </div>

      {staples.length > 0 && (
        <div style={{ width: '100%', maxWidth: 420, marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: p.textFaint,
              marginBottom: 4,
            }}
          >
            Running low?
          </div>
          <div style={{ fontSize: 13.5, color: p.textMuted, marginBottom: 12 }}>
            {remaining.length
              ? 'Tap a staple you used up to add it to your list.'
              : 'All set — added to your list.'}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            {staples.map((s) => {
              const used = restocked.includes(s.name);
              return (
                <button
                  key={s.name}
                  onClick={() => !used && onRestock(s)}
                  disabled={used}
                  aria-label={
                    used ? `${s.name} added to list` : `Add ${s.name} to your list`
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 13px',
                    borderRadius: 11,
                    border: `1px solid ${used ? p.accent : p.border}`,
                    background: used ? p.accentTintBg : p.card,
                    color: used ? p.accentTintText : p.text,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: used ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{s.emoji}</span>
                  {s.name}
                  {used && (
                    <CheckIcon size={14} strokeWidth={3} color={p.accentTintText} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 420 }}>
        <button
          onClick={onAgain}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            border: `1px solid ${p.border}`,
            background: p.card,
            color: p.text,
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Cook again
        </button>
        <button
          onClick={onClose}
          className="pr-press"
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            border: 'none',
            background: p.accent,
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function IngredientSheet({
  recipe,
  factor,
  p,
  mobile,
  onClose,
}: {
  recipe: {
    name: string;
    ingredients: { name: string; emoji: string; qty: number; unit: string }[];
  };
  factor: number;
  p: ReturnType<typeof usePalette>;
  mobile: boolean;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: p.overlay,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        animation: 'prIn .18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: p.card,
          width: mobile ? '100%' : 460,
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: mobile ? '22px 22px 0 0' : 20,
          padding: '20px 22px 26px',
          animation: 'prUp .26s cubic-bezier(.2,.8,.2,1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Ingredients</h3>
          <button
            onClick={onClose}
            aria-label="Close ingredients"
            style={{
              border: 'none',
              background: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: p.textMuted,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recipe.ingredients.map((ing, i) => (
            <div
              key={`${ing.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 4px',
                borderBottom:
                  i < recipe.ingredients.length - 1
                    ? `1px solid ${p.borderSoft}`
                    : 'none',
              }}
            >
              <span style={{ fontSize: 19, width: 26, textAlign: 'center' }}>
                {ing.emoji}
              </span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>
                {ing.name}
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: p.text }}>
                {fmtQtyUnit(ing.qty * factor, ing.unit)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
