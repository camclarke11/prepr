import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { timeAgo } from '../lib/format';
import { Modal } from './Modal';
import type { ActivityEvent } from '../lib/sync';

const VERB: Record<ActivityEvent['type'], string> = {
  add: 'added',
  check: 'ticked off',
  remove: 'removed',
  clear: 'cleared the list',
};
const ICON: Record<ActivityEvent['type'], string> = {
  add: '➕',
  check: '✓',
  remove: '✕',
  clear: '🧹',
};

/** The household activity feed — who did what, when. */
export function ActivityPanel() {
  const { state, actions } = useStore();
  const p = usePalette();

  // Whoever this device is shows as "You".
  const me = state.household?.memberName ?? state.activeMember;
  const memberColor = (name: string) =>
    state.members.find((m) => m.name === name)?.color ?? '#b35e54';
  // Render newest first; the store keeps the feed oldest-last.
  const events = [...state.activity].reverse();
  // A single timestamp for the whole render keeps every "x ago" consistent.
  const now = Date.now();

  return (
    <Modal onClose={actions.closeActivity} width={460} labelledBy="activity-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 22px 14px',
          borderBottom: `1px solid ${p.borderSoft}`,
        }}
      >
        <h2
          id="activity-title"
          style={{
            margin: 0,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: '-0.02em',
          }}
        >
          Activity
        </h2>
        <button
          onClick={actions.closeActivity}
          aria-label="Close activity"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: p.surfaceAlt,
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            color: p.text,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '8px 12px 18px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div
            style={{
              padding: '40px 22px',
              textAlign: 'center',
              color: p.textFaint,
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 8 }}>🕊️</div>
            <div style={{ fontWeight: 700, color: p.textMuted }}>Nothing yet</div>
            <div style={{ fontSize: 13.5, marginTop: 2 }}>
              Changes to the shared list will show up here.
            </div>
          </div>
        ) : (
          events.map((e) => {
            const who = e.actor === me ? 'You' : e.actor;
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 10px',
                  borderRadius: 11,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: memberColor(e.actor),
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(e.actor[0] || '?').toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.35, color: p.text }}>
                    <span style={{ fontWeight: 800 }}>{who}</span> {VERB[e.type]}
                    {e.item ? (
                      <>
                        {' '}
                        <span style={{ fontWeight: 700 }}>{e.item}</span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: p.textFaint, fontWeight: 600 }}>
                    {timeAgo(e.at, now)}
                  </div>
                </div>
                <span aria-hidden="true" style={{ fontSize: 13, opacity: 0.6 }}>
                  {ICON[e.type]}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
