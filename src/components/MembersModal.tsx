import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';
import { CheckIcon, TrashIcon } from './icons';
import { buildJoinUrl, parseJoinInput } from '../lib/sync';
import { NotificationsCard } from './NotificationsCard';

export function MembersModal() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [name, setName] = useState('');
  const [yourName, setYourName] = useState(state.activeMember || '');
  const [joinInput, setJoinInput] = useState('');

  const inHousehold = !!state.household;

  const submit = () => {
    const nm = name.trim();
    if (!nm) return;
    actions.addMember(nm);
    setName('');
  };

  const copyInvite = () => {
    if (!state.household) return;
    const url = buildJoinUrl(state.household.id);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => actions.showToast('Invite link copied', { dur: 3 }));
    } else {
      actions.showToast('Clipboard unavailable');
    }
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: p.textMuted,
    display: 'block',
    marginBottom: 5,
  } as const;
  const inputStyle = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 11,
    border: `1px solid ${p.border}`,
    background: p.card,
    fontSize: 14.5,
    outline: 'none',
    color: p.text,
  } as const;
  const primaryBtn = {
    padding: '11px 16px',
    borderRadius: 11,
    border: 'none',
    background: p.accent,
    color: '#fff',
    fontWeight: 800,
    fontSize: 14.5,
    cursor: 'pointer',
  } as const;

  return (
    <Modal onClose={actions.closeMembers} width={460} labelledBy="members-title">
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
          {inHousehold ? 'Shared list' : 'Share this list'}
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
        {inHousehold ? (
          <HouseholdView
            p={p}
            members={state.members}
            you={state.activeMember}
            inviteUrl={buildJoinUrl(state.household!.id)}
            onCopy={copyInvite}
            onLeave={actions.leaveHousehold}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            primaryBtn={primaryBtn}
          />
        ) : (
          <>
            <p
              style={{
                margin: '0 0 16px',
                fontSize: 13.5,
                color: p.textMuted,
                lineHeight: 1.45,
              }}
            >
              Create a shared list and send the invite link to whoever you shop with —
              you'll both see changes live, and get notified when the other adds
              something.
            </p>

            <label style={labelStyle}>Your name</label>
            <input
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              placeholder="e.g. Alex"
              aria-label="Your name"
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <button
              onClick={() => actions.createHousehold(yourName.trim() || 'Me')}
              className="pr-press"
              style={{ ...primaryBtn, width: '100%' }}
            >
              Create a shared list
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '20px 0 16px',
                color: p.textFaint,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span style={{ flex: 1, height: 1, background: p.borderSoft }} />
              OR
              <span style={{ flex: 1, height: 1, background: p.borderSoft }} />
            </div>

            <label style={labelStyle}>Join with an invite link</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Paste the link or code…"
                aria-label="Invite link or code"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  const id = parseJoinInput(joinInput);
                  if (id) actions.joinHousehold(id, yourName.trim() || 'Me');
                }}
                disabled={!joinInput.trim()}
                className="pr-press"
                style={{
                  ...primaryBtn,
                  flex: 'none',
                  background: joinInput.trim() ? p.accent : p.surfaceAlt,
                  color: joinInput.trim() ? '#fff' : p.textFaint,
                  cursor: joinInput.trim() ? 'pointer' : 'default',
                }}
              >
                Join
              </button>
            </div>

            <div
              style={{
                borderTop: `1px solid ${p.borderSoft}`,
                paddingTop: 16,
              }}
            >
              <p style={{ ...labelStyle, marginBottom: 10 }}>On this device</p>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 12.5,
                  color: p.textFaint,
                  lineHeight: 1.45,
                }}
              >
                Until you share, you can still tag items by who added them.
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
                      <Avatar color={m.color} initial={m.initial} />
                      <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
                        {m.name}
                        {active && (
                          <span style={{ color: p.accent, fontWeight: 700 }}>
                            {' '}
                            · you
                          </span>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Add a person…"
                  aria-label="New member name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={submit}
                  className="pr-press"
                  style={{ ...primaryBtn, flex: 'none' }}
                >
                  Add
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Avatar({ color, initial }: { color: string; initial: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 13.5,
        flex: 'none',
      }}
    >
      {initial}
    </div>
  );
}

interface HouseholdViewProps {
  p: ReturnType<typeof usePalette>;
  members: { name: string; color: string; initial: string }[];
  you: string;
  inviteUrl: string;
  onCopy: () => void;
  onLeave: () => void;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  primaryBtn: React.CSSProperties;
}

function HouseholdView({
  p,
  members,
  you,
  inviteUrl,
  onCopy,
  onLeave,
  labelStyle,
  inputStyle,
  primaryBtn,
}: HouseholdViewProps) {
  return (
    <>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 13.5,
          color: p.textMuted,
          lineHeight: 1.45,
        }}
      >
        Anyone with this link can join your list. Changes sync live across every device.
      </p>

      <label style={labelStyle}>Invite link</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          readOnly
          value={inviteUrl}
          aria-label="Invite link"
          onFocus={(e) => e.currentTarget.select()}
          style={{ ...inputStyle, flex: 1, color: p.textMuted }}
        />
        <button
          onClick={onCopy}
          className="pr-press"
          style={{ ...primaryBtn, flex: 'none' }}
        >
          Copy
        </button>
      </div>

      <label style={labelStyle}>People in this list</label>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}
      >
        {members.map((m) => (
          <div
            key={m.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '9px 11px',
              borderRadius: 12,
              border: `1px solid ${p.borderSoft}`,
              background: p.card,
            }}
          >
            <Avatar color={m.color} initial={m.initial} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
              {m.name}
              {m.name === you && (
                <span style={{ color: p.accent, fontWeight: 700 }}> · you</span>
              )}
            </span>
            {m.name === you && (
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
          </div>
        ))}
      </div>

      <NotificationsCard />

      <button
        onClick={onLeave}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 11,
          border: `1px solid ${p.border}`,
          background: p.card,
          color: p.textMuted,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Leave shared list
      </button>
    </>
  );
}
