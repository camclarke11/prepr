import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';

const STEPS = [
  {
    icon: '🛒',
    title: 'Welcome to prepr',
    body: 'Your shared grocery list, recipe box, meal planner and pantry — all in one, and it works offline.',
  },
  {
    icon: '➕',
    title: 'Build your list',
    body: 'Tap an item to add it. Search to add anything — with its own emoji and colour. Tap a tile when it’s in your cart to tick it off.',
  },
  {
    icon: '👋',
    title: 'Shop together',
    body: 'Create a shared list and send the invite link to whoever you shop with. Changes sync live, and you’ll get a nudge when they add something.',
  },
];

/** First-run tutorial — a short, dismissible carousel. */
export function Welcome() {
  const { actions } = useStore();
  const p = usePalette();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  const primaryBtn = {
    padding: '13px 18px',
    borderRadius: 13,
    border: 'none',
    background: p.accent,
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
  } as const;

  return (
    <Modal onClose={actions.dismissWelcome} width={400} labelledBy="welcome-title">
      <div style={{ padding: '30px 28px 26px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 16 }}>{s.icon}</div>
        <h2
          id="welcome-title"
          style={{
            margin: '0 0 10px',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '-0.02em',
          }}
        >
          {s.title}
        </h2>
        <p
          style={{
            margin: '0 auto 22px',
            maxWidth: 300,
            fontSize: 14.5,
            lineHeight: 1.5,
            color: p.textMuted,
          }}
        >
          {s.body}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 7,
            marginBottom: 22,
          }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === step ? p.accent : p.border,
                transition: 'width .2s ease, background .2s ease',
              }}
            />
          ))}
        </div>

        {last ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => {
                actions.dismissWelcome();
                actions.openMembers();
              }}
              className="pr-press"
              style={primaryBtn}
            >
              Create a shared list
            </button>
            <button
              onClick={actions.dismissWelcome}
              style={{
                border: 'none',
                background: 'none',
                color: p.textMuted,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              I’ll explore on my own
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={actions.dismissWelcome}
              style={{
                border: 'none',
                background: 'none',
                color: p.textFaint,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={() => setStep((n) => n + 1)}
              className="pr-press"
              style={{ ...primaryBtn, flex: 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
