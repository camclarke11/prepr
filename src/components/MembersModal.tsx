import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';
import { CheckIcon, TrashIcon } from './icons';

export function MembersModal() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [name, setName] = useState('');

  const submit = () => {
    const nm = name.trim();
    if (!nm) return;
    actions.addMember(nm);
    setName('');
  };

  return (
    <Modal onClose={actions.closeMembers} width={440} labelledBy="members-title">
      <div
        style={{
          padding: '22px 24px',
          borderBottom: `1px solid ${p.borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          id="members-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 21,
            letterSpacing: '-0.02em',
          }}
        >
          Shared with
        </div>
        <button
          onClick={actions.closeMembers}
          aria-label="Close"
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

      <div style={{ padding: '18px 22px 24px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: p.textMuted, lineHeight: 1.45 }}>
          Pick who you are on this device — new items you add are tagged with your
          avatar so everyone sees who added what.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.members.map((m) => {
            const active = m.name === state.activeMember;
            return (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 11px',
                  borderRadius: 12,
                  border: `1px solid ${active ? p.accent : p.borderSoft}`,
                  background: active ? p.accentTintBg : p.card,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: m.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13.5,
                    flex: 'none',
                  }}
                >
                  {m.initial}
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
                  {m.name}
                  {active && (
                    <span style={{ color: p.accent, fontWeight: 700 }}> · you</span>
                  )}
                </span>
                {!active && (
                  <button
                    onClick={() => actions.setActiveMember(m.name)}
                    className="pr-press"
                    style={{
                      border: `1px solid ${p.border}`,
                      background: p.card,
                      color: p.textMuted,
                      borderRadius: 9,
                      padding: '6px 10px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    This is me
                  </button>
                )}
                {active && (
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: p.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    <CheckIcon size={13} strokeWidth={3.4} />
                  </span>
                )}
                {state.members.length > 1 && (
                  <button
                    onClick={() => actions.removeMember(m.name)}
                    aria-label={`Remove ${m.name}`}
                    style={{
                      width: 30,
                      height: 30,
                      flex: 'none',
                      border: 'none',
                      background: 'transparent',
                      color: p.textFaint,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add a person…"
            aria-label="New member name"
            style={{
              flex: 1,
              padding: '11px 13px',
              borderRadius: 11,
              border: `1px solid ${p.border}`,
              background: p.card,
              fontSize: 14.5,
              outline: 'none',
              color: p.text,
            }}
          />
          <button
            onClick={submit}
            className="pr-press"
            style={{
              flex: 'none',
              padding: '0 18px',
              borderRadius: 11,
              border: 'none',
              background: p.accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </Modal>
  );
}
