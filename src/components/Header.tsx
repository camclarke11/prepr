import { useStore } from '../state/store';
import { usePalette, useIsMobile } from '../hooks';
import { GearIcon } from './icons';

export function Header() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const { tab, list, recipes, pantry } = state;

  const titles: Record<string, [string, string]> = {
    list: ['Shopping list', list.length ? `${list.length} to get` : 'All done — nice'],
    recipes: ['Recipes', `${recipes.length} saved`],
    plan: ['Meal plan', 'This week · Mon–Sun'],
    pantry: ['Pantry', `${pantry.length} staples on hand`],
  };
  const [title, sub] = titles[tab];

  let action: { label: string; fn: () => void } | null = null;
  if (tab === 'recipes')
    action = { label: mobile ? '＋ New' : '＋ New recipe', fn: actions.openCreate };
  else if (tab === 'plan')
    action = {
      label: mobile ? '＋ Week' : '＋ Add week to list',
      fn: actions.addWeek,
    };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        padding: mobile ? '20px 18px 14px' : '30px 38px 18px',
        position: mobile ? 'static' : 'sticky',
        top: 0,
        background: p.headerBg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 20,
        borderBottom: `1px solid ${p.shadow}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: mobile ? 24 : 30,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
        <div style={{ color: p.textMuted, fontSize: 14, marginTop: 3 }}>{sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        {action && (
          <button
            onClick={action.fn}
            className="pr-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '11px 16px',
              borderRadius: 11,
              border: 'none',
              background: p.accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: `0 1px 2px ${p.shadow}`,
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </button>
        )}
        {mobile && (
          <button
            onClick={actions.openSettings}
            aria-label="Settings"
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
            <GearIcon />
          </button>
        )}
      </div>
    </header>
  );
}
