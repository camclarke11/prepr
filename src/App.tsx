import { useEffect, useState } from 'react';
import { useStore } from './state/store';
import { usePalette, useIsMobile, useResolvedTheme } from './hooks';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { ShoppingListView } from './views/ShoppingList';
import { RecipesView } from './views/Recipes';
import { MealPlanView } from './views/MealPlan';
import { PantryView } from './views/Pantry';
import { RecipeDetail } from './components/RecipeDetail';
import { CreateRecipe } from './components/CreateRecipe';
import { ItemDetail } from './components/ItemDetail';
import { MembersModal } from './components/MembersModal';
import { JoinPrompt } from './components/JoinPrompt';
import { Welcome } from './components/Welcome';
import { Tour } from './components/Tour';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpOverlay } from './components/HelpOverlay';
import { UpdateBanner } from './components/UpdateBanner';
import { Toast } from './components/Toast';
import {
  decodeShare,
  shareTargetText,
  SHARE_PREFIX,
  SHARE_TARGET_PATH,
} from './lib/share';
import { refreshSubscription } from './lib/push';
import type { Tab } from './types';

const TAB_HASH: Record<Tab, string> = {
  list: '',
  recipes: '#recipes',
  plan: '#plan',
  pantry: '#pantry',
};
const HASH_TAB: Record<string, Tab> = {
  '#recipes': 'recipes',
  '#plan': 'plan',
  '#pantry': 'pantry',
  '': 'list',
  '#list': 'list',
};

export function App() {
  const { state, actions } = useStore();
  const p = usePalette();
  const mobile = useIsMobile();
  const resolvedTheme = useResolvedTheme(state.theme);
  const [helpOpen, setHelpOpen] = useState(false);

  // Apply the palette as CSS custom properties + the browser theme colour.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--pr-bg', p.bg);
    root.style.setProperty('--pr-text', p.text);
    root.style.setProperty('--pr-accent', p.accent);
    root.style.setProperty('--pr-faint', p.textFaint);
    root.style.setProperty('--pr-scroll', p.border);
    root.style.setProperty('--pr-shadow-strong', p.shadow);
    root.style.colorScheme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'dark' ? p.bg : p.accent);
  }, [p, resolvedTheme]);

  // Re-validate the push subscription each launch while in a household (iOS
  // churns subscriptions and pushsubscriptionchange is unreliable).
  useEffect(() => {
    if (state.household) {
      void refreshSubscription(state.household.id, state.household.memberId);
    }
  }, [state.household]);

  // Invite + share links handled on first load.
  useEffect(() => {
    if (window.location.pathname === SHARE_TARGET_PATH) {
      const shared = shareTargetText(new URLSearchParams(window.location.search));
      history.replaceState(null, '', window.location.origin + '/');
      if (shared) actions.addSharedText(shared);
      return;
    }
    // A "#join=" invite link opens the pairing modal, prefilled and ready.
    if (window.location.hash.startsWith('#join=')) {
      const id = window.location.hash.slice('#join='.length);
      history.replaceState(null, '', window.location.pathname);
      // Skip if this device is already in that very household.
      if (id && state.household?.id !== id) actions.requestJoin(id);
      return;
    }
    // A legacy "#data=" link offers to import someone else's snapshot.
    if (window.location.hash.startsWith(SHARE_PREFIX)) {
      const payload = window.location.hash.slice(SHARE_PREFIX.length);
      const data = decodeShare(payload);
      history.replaceState(null, '', window.location.pathname);
      if (
        data &&
        window.confirm(
          'Open this shared prepr? It replaces your current list, recipes, plan and pantry on this device.',
        )
      ) {
        actions.importData(data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active tab in sync with the URL hash (deep links + back button).
  useEffect(() => {
    const fromHash = HASH_TAB[window.location.hash];
    if (fromHash && fromHash !== state.tab) actions.setTab(fromHash);
    const onHash = () => {
      const t = HASH_TAB[window.location.hash];
      if (t) actions.setTab(t);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const want = TAB_HASH[state.tab];
    if (window.location.hash !== want) {
      // pushState (not replace) so the Back button steps through visited tabs.
      history.pushState(null, '', want || window.location.pathname);
    }
  }, [state.tab]);

  // Keyboard shortcuts: 1–4 switch tabs, "/" focuses search, "?" shows help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable);
      const modalOpen =
        state.openRecipe ||
        state.createOpen ||
        state.detailKey ||
        state.membersOpen ||
        helpOpen;
      if (e.key === '/' && !typing && !modalOpen) {
        const input = document.querySelector<HTMLInputElement>('[data-search-input]');
        if (input) {
          e.preventDefault();
          input.focus();
        }
        return;
      }
      if (e.key === '?' && !typing && !modalOpen) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (typing || modalOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, Tab> = {
        '1': 'list',
        '2': 'recipes',
        '3': 'plan',
        '4': 'pantry',
      };
      if (map[e.key]) actions.setTab(map[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    actions,
    state.openRecipe,
    state.createOpen,
    state.detailKey,
    state.membersOpen,
    helpOpen,
  ]);

  return (
    <div
      style={
        mobile
          ? { display: 'flex', flexDirection: 'column', minHeight: '100vh' }
          : { display: 'flex', minHeight: '100vh' }
      }
    >
      {!mobile && <Sidebar />}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: mobile ? 'calc(82px + env(safe-area-inset-bottom))' : 0,
        }}
      >
        <Header />
        <div
          style={{
            padding: mobile ? '14px 16px 30px' : '24px 38px 48px',
            flex: 1,
          }}
        >
          {state.tab === 'list' && <ShoppingListView />}
          {state.tab === 'recipes' && <RecipesView />}
          {state.tab === 'plan' && <MealPlanView />}
          {state.tab === 'pantry' && <PantryView />}
        </div>
      </main>

      {mobile && <MobileNav />}

      {state.openRecipe && <RecipeDetail />}
      {state.createOpen && <CreateRecipe />}
      {state.detailKey && <ItemDetail />}
      {state.membersOpen && <MembersModal />}
      {state.pendingJoin && <JoinPrompt />}
      {state.welcomeOpen && <Welcome />}
      {state.tourOpen && <Tour />}
      {state.settingsOpen && <SettingsPanel />}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      <UpdateBanner />
      <Toast />
    </div>
  );
}
