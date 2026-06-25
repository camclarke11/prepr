import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { useInstallPrompt } from '../lib/pwa';
import { SUPERMARKETS } from '../data/supermarkets';
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from './icons';
import type { PersistedState, ThemeMode } from '../types';

/** The dedicated settings drawer — slides in over a blurred backdrop. */
export function SettingsPanel() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { canInstall, promptInstall } = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);
  const close = actions.closeSettings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<PersistedState>;
        if (typeof data !== 'object' || data === null) throw new Error('bad');
        actions.importData(data);
      } catch {
        actions.showToast('That file could not be read');
      }
    };
    reader.readAsText(file);
  };

  const sectionLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: p.textFaint,
    margin: '22px 4px 8px',
  };

  const row = (label: string, onClick: () => void, right?: ReactNode) => (
    <button
      onClick={onClick}
      className="pr-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        padding: '12px 13px',
        border: `1px solid ${p.borderSoft}`,
        borderRadius: 12,
        background: p.card,
        color: p.text,
        fontWeight: 600,
        fontSize: 14.5,
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {right}
    </button>
  );

  const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
  const chevron = <span style={{ color: p.textFaint, fontSize: 16 }}>›</span>;

  const toggleRow = (label: string, on: boolean, onToggle: () => void) => (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        padding: '12px 13px',
        border: `1px solid ${p.borderSoft}`,
        borderRadius: 12,
        background: p.card,
        color: p.text,
        fontWeight: 600,
        fontSize: 14.5,
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <span
        aria-hidden="true"
        style={{
          flex: 'none',
          width: 42,
          height: 25,
          borderRadius: 13,
          background: on ? p.accent : p.borderSoft,
          border: `1px solid ${on ? p.accent : p.border}`,
          position: 'relative',
          transition: 'background .18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 19 : 2,
            width: 19,
            height: 19,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transition: 'left .18s ease',
          }}
        />
      </span>
    </button>
  );

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: p.overlay,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 60,
        animation: 'prIn .18s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: mobile ? '100%' : 380,
          maxWidth: '100%',
          background: p.surface,
          borderLeft: `1px solid ${p.border}`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          overflowY: 'auto',
          animation: 'prSlide .24s cubic-bezier(.2,.8,.2,1)',
          padding: '0 18px calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: p.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 4px 12px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.02em',
            }}
          >
            Settings
          </div>
          <button
            onClick={close}
            aria-label="Close settings"
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

        <div style={sectionLabel}>Appearance</div>
        <div
          role="radiogroup"
          aria-label="Theme"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {(
            [
              { id: 'system', label: 'System', icon: <MonitorIcon size={18} /> },
              { id: 'light', label: 'Light', icon: <SunIcon size={18} /> },
              { id: 'dark', label: 'Dark', icon: <MoonIcon size={18} /> },
            ] as const
          ).map((theme) => {
            const active = state.theme === theme.id;
            return (
              <button
                key={theme.id}
                role="radio"
                aria-checked={active}
                onClick={() => actions.setTheme(theme.id as ThemeMode)}
                className="pr-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  minHeight: 42,
                  padding: '10px 8px',
                  border: `1px solid ${active ? p.accent : p.borderSoft}`,
                  borderRadius: 12,
                  background: active ? p.accentTintBg : p.card,
                  color: active ? p.accent : p.text,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                {theme.icon}
                <span>{theme.label}</span>
              </button>
            );
          })}
        </div>

        <div style={sectionLabel}>Sharing</div>
        <div style={stack}>
          {row(
            state.household ? 'Manage shared list' : 'Share this list',
            () => {
              close();
              actions.openMembers();
            },
            chevron,
          )}
          {state.household && row('Copy invite link', actions.shareLink)}
        </div>

        {state.household && (
          <>
            <div style={sectionLabel}>Notifications</div>
            <p
              style={{
                margin: '0 4px 8px',
                fontSize: 12.5,
                color: p.textMuted,
                lineHeight: 1.45,
              }}
            >
              Choose what pings you when someone in the household makes a change.
            </p>
            <div style={stack}>
              {toggleRow('An item is added', state.notifyPrefs.adds, () =>
                actions.setNotifyPref('adds', !state.notifyPrefs.adds),
              )}
              {toggleRow('An item is ticked off', state.notifyPrefs.checked, () =>
                actions.setNotifyPref('checked', !state.notifyPrefs.checked),
              )}
              {toggleRow('The list is cleared', state.notifyPrefs.cleared, () =>
                actions.setNotifyPref('cleared', !state.notifyPrefs.cleared),
              )}
            </div>
          </>
        )}

        <div style={sectionLabel}>Supermarket</div>
        <p
          style={{
            margin: '0 4px 8px',
            fontSize: 12.5,
            color: p.textMuted,
            lineHeight: 1.45,
          }}
        >
          Adds a “Find at …” shortcut to each item.
        </p>
        <div style={stack}>
          {[
            ...SUPERMARKETS.map((s) => ({ id: s.id, name: s.name })),
            { id: null, name: 'None' },
          ].map((s) => {
            const active = (state.supermarket ?? null) === s.id;
            return (
              <button
                key={s.name}
                onClick={() => actions.setSupermarket(s.id)}
                className="pr-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 13px',
                  border: `1px solid ${active ? p.accent : p.borderSoft}`,
                  borderRadius: 12,
                  background: active ? p.accentTintBg : p.card,
                  color: p.text,
                  fontWeight: 600,
                  fontSize: 14.5,
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1 }}>{s.name}</span>
                {active && (
                  <span
                    style={{
                      width: 24,
                      height: 24,
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
              </button>
            );
          })}
        </div>

        <div style={sectionLabel}>Data</div>
        <div style={stack}>
          {row('Export data', actions.exportData)}
          {row('Import data', () => fileRef.current?.click())}
          {row('Reset to sample', () => {
            if (
              window.confirm(
                'Reset prepr to the sample data? This clears your list, recipes, plan and pantry.',
              )
            ) {
              actions.resetData();
              close();
            }
          })}
        </div>

        <div style={sectionLabel}>Help</div>
        <div style={stack}>
          {row('Tutorial', () => {
            close();
            actions.openWelcome();
          })}
          {canInstall && row('Install app', () => void promptInstall())}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
