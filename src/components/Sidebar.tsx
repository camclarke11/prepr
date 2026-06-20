import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { navItemStyle } from './nav';
import {
  ListIcon,
  RecipesIcon,
  PlanIcon,
  PantryIcon,
  MoonIcon,
  SunIcon,
} from './icons';
import type { Tab } from '../types';

export function Sidebar() {
  const { state, actions } = useStore();
  const p = usePalette();
  const { tab } = state;

  const items: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'list', label: 'Shopping list', icon: <ListIcon /> },
    { key: 'recipes', label: 'Recipes', icon: <RecipesIcon /> },
    { key: 'plan', label: 'Meal plan', icon: <PlanIcon /> },
    { key: 'pantry', label: 'Pantry', icon: <PantryIcon /> },
  ];

  return (
    <aside
      style={{
        width: 248,
        flex: 'none',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: p.surface,
        borderRight: `1px solid ${p.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 8px 22px 8px',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: p.accent,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 19,
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          p
        </div>
        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '-0.02em',
          }}
        >
          prepr
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it) => {
          const active = tab === it.key;
          const badge = it.key === 'list' && state.list.length > 0;
          return (
            <button
              key={it.key}
              onClick={() => actions.setTab(it.key)}
              style={navItemStyle(active, false, p)}
              aria-current={active ? 'page' : undefined}
            >
              {it.icon}
              <span>{it.label}</span>
              {badge && (
                <span
                  style={{
                    marginLeft: 'auto',
                    minWidth: 22,
                    height: 22,
                    padding: '0 7px',
                    borderRadius: 11,
                    background: active ? p.accent : p.border,
                    color: active ? '#fff' : p.textMuted,
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {state.list.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          borderTop: `1px solid ${p.border}`,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 10px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: p.textFaint,
            }}
          >
            Shared with
          </span>
          <button
            onClick={actions.openMembers}
            style={{
              border: 'none',
              background: 'none',
              color: p.accent,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Manage
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {state.members.map((m) => (
            <button
              key={m.name}
              onClick={actions.openMembers}
              className="pr-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: m.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 12.5,
                  flex: 'none',
                }}
              >
                {m.initial}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: p.text }}>
                {m.name}
                {m.name === state.activeMember && (
                  <span style={{ color: p.textFaint, fontWeight: 600 }}> · you</span>
                )}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={actions.toggleTheme}
          className="pr-press"
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            padding: '9px 10px',
            borderRadius: 10,
            border: `1px solid ${p.border}`,
            background: 'transparent',
            color: p.textMuted,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          {state.theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
          <span>{state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  );
}
