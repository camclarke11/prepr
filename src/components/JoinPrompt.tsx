import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';
import { fetchHouseholdPreview } from '../lib/sync';

interface Preview {
  inviter: string;
  items: number;
  people: number;
}

/**
 * The focused screen shown when someone opens an invite link (#join=…): validate
 * the link, name the inviter, take the person's name, and join. Nothing else.
 */
export function JoinPrompt() {
  const { state, actions } = useStore();
  const p = usePalette();
  const id = state.pendingJoin;
  const [name, setName] = useState(
    state.activeMember && state.activeMember !== 'You' ? state.activeMember : '',
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setStatus('loading');
    fetchHouseholdPreview(id).then((data) => {
      if (!alive) return;
      if (!data) {
        setStatus('invalid');
        return;
      }
      setPreview({
        inviter: data.members[0]?.name ?? 'Someone',
        items: data.items.length,
        people: data.members.length,
      });
      setStatus('ok');
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) return null;

  const join = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await actions.joinHousehold(id, name.trim());
    setBusy(false);
  };

  const muted = { color: p.textMuted, fontSize: 14, lineHeight: 1.5 } as const;

  return (
    <Modal onClose={actions.cancelJoin} width={400} labelledBy="join-title">
      <div style={{ padding: '28px 26px 26px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🛒</div>

        {status === 'loading' && <p style={muted}>Checking invite…</p>}

        {status === 'invalid' && (
          <>
            <h2 id="join-title" style={titleStyle}>
              Invite not found
            </h2>
            <p style={{ ...muted, margin: '8px 0 20px' }}>
              This link looks invalid or expired — ask for a fresh one.
            </p>
            <button onClick={actions.cancelJoin} style={ghostBtn(p)}>
              Close
            </button>
          </>
        )}

        {status === 'ok' && preview && (
          <>
            <h2 id="join-title" style={titleStyle}>
              Join {preview.inviter}’s list
            </h2>
            <p style={{ ...muted, margin: '8px 0 18px' }}>
              {preview.items} item{preview.items === 1 ? '' : 's'} · shared with{' '}
              {preview.people} {preview.people === 1 ? 'person' : 'people'}
            </p>

            {state.household && (
              <p
                style={{
                  ...muted,
                  fontSize: 12.5,
                  color: p.accentTintText,
                  background: p.accentTintBg,
                  border: `1px solid ${p.accentTintBorder}`,
                  borderRadius: 10,
                  padding: '8px 10px',
                  margin: '0 0 16px',
                }}
              >
                You’re already in a shared list — joining this one will switch you over.
              </p>
            )}

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              placeholder="Your name"
              aria-label="Your name"
              autoFocus
              style={{
                width: '100%',
                padding: '13px 15px',
                borderRadius: 12,
                border: `1px solid ${p.border}`,
                background: p.card,
                fontSize: 16,
                textAlign: 'center',
                outline: 'none',
                color: p.text,
                marginBottom: 12,
              }}
            />
            <button
              onClick={join}
              disabled={busy || !name.trim()}
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
                cursor: busy || !name.trim() ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Joining…' : 'Join list'}
            </button>
            <button
              onClick={actions.cancelJoin}
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
              Not now
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

const titleStyle = {
  margin: 0,
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: '-0.02em',
} as const;

function ghostBtn(p: ReturnType<typeof usePalette>) {
  return {
    padding: '11px 18px',
    borderRadius: 12,
    border: `1px solid ${p.border}`,
    background: p.card,
    color: p.text,
    fontWeight: 700,
    fontSize: 14.5,
    cursor: 'pointer',
  } as const;
}
