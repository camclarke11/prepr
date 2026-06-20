import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { DotsIcon, MoonIcon, SunIcon } from './icons';
import type { PersistedState } from '../types';

export function SettingsMenu() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

  const item = (label: string, onClick: () => void, icon?: React.ReactNode) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="pr-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 13px',
        border: 'none',
        background: 'transparent',
        color: p.text,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          border: `1px solid ${p.border}`,
          background: p.card,
          color: p.textMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 210,
            background: p.card,
            border: `1px solid ${p.border}`,
            borderRadius: 14,
            boxShadow: `0 12px 32px ${p.shadow}`,
            padding: 6,
            zIndex: 70,
            animation: 'prIn .12s ease',
          }}
        >
          {item(
            state.theme === 'dark' ? 'Light mode' : 'Dark mode',
            actions.toggleTheme,
            state.theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />,
          )}
          <div style={{ height: 1, background: p.borderSoft, margin: '5px 0' }} />
          {item('Export data', actions.exportData)}
          {item('Import data', () => fileRef.current?.click())}
          <div style={{ height: 1, background: p.borderSoft, margin: '5px 0' }} />
          {item('Reset to sample', () => {
            if (
              window.confirm(
                'Reset prepr to the sample data? This clears your list, recipes, plan and pantry.',
              )
            ) {
              actions.resetData();
            }
          })}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onPickFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}
