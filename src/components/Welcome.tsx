import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';

/** First-run intro: a warm hello + name capture, then launches the in-app tour. */
export function Welcome() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [name, setName] = useState(
    state.activeMember && state.activeMember !== 'You' ? state.activeMember : '',
  );

  const start = () => {
    actions.setMyName(name);
    actions.dismissWelcome();
    actions.startTour();
  };
  const skip = () => {
    actions.setMyName(name);
    actions.dismissWelcome();
  };

  return (
    <Modal onClose={actions.dismissWelcome} width={400} labelledBy="welcome-title">
      <div style={{ padding: '32px 28px 26px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 16 }}>🛒</div>
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
          Welcome to prepr
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
          A shared grocery list, recipe box, meal planner and pantry — that works
          offline. First, what should we call you?
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && start()}
          placeholder="Your name"
          aria-label="Your name"
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '13px 15px',
            borderRadius: 12,
            border: `1px solid ${p.border}`,
            background: p.card,
            fontSize: 16,
            textAlign: 'center',
            outline: 'none',
            color: p.text,
            marginBottom: 16,
          }}
        />

        <button
          onClick={start}
          disabled={!name.trim()}
          className="pr-press"
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 13,
            border: 'none',
            background: name.trim() ? p.accent : p.surfaceAlt,
            color: name.trim() ? '#fff' : p.textFaint,
            fontWeight: 800,
            fontSize: 15,
            cursor: name.trim() ? 'pointer' : 'default',
          }}
        >
          Show me around
        </button>
        <button
          onClick={skip}
          style={{
            marginTop: 10,
            border: 'none',
            background: 'none',
            color: p.textMuted,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </Modal>
  );
}
