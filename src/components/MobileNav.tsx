import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { navItemStyle } from './nav';
import { ListIcon, RecipesIcon, PlanIcon, PantryIcon } from './icons';
import type { Tab } from '../types';

export function MobileNav() {
  const { state, actions } = useStore();
  const p = usePalette();

  const items: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'list', label: 'List', icon: <ListIcon size={22} /> },
    { key: 'recipes', label: 'Recipes', icon: <RecipesIcon size={22} /> },
    { key: 'plan', label: 'Plan', icon: <PlanIcon size={22} /> },
    { key: 'pantry', label: 'Pantry', icon: <PantryIcon size={22} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(66px + env(safe-area-inset-bottom))',
        background: p.navBg,
        borderTop: `1px solid ${p.border}`,
        display: 'flex',
        padding: '6px 6px calc(6px + env(safe-area-inset-bottom))',
        zIndex: 40,
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => actions.setTab(it.key)}
          style={navItemStyle(state.tab === it.key, true, p)}
          aria-current={state.tab === it.key ? 'page' : undefined}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
