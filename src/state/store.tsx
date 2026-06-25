import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  CategoryName,
  ListItem,
  Member,
  PersistedState,
  Recipe,
  Tab,
  ThemeMode,
} from '../types';
import { DEFAULT_MEMBERS, MEMBER_COLORS, SAMPLE_MEMBERS } from '../theme';
import {
  CATALOG,
  SEED_PANTRY,
  SEED_RECENTS,
  SEED_RECIPES,
  seedList,
  seedPlan,
} from '../data/seed';
import * as ops from './operations';
import type { RecipeDraft } from './operations';
import { buildShareUrl } from '../lib/share';
import { parseIngredients } from '../lib/parseIngredients';
import { suggestEmoji } from '../data/emoji';
import * as sync from '../lib/sync';
import type { HouseholdRef, Op, ServerMsg, SyncItem, SyncMember } from '../lib/sync';

// Bumped v2 -> v3 with the move to a clean (empty) first-run state, so existing
// installs reset to the fresh experience too. Exported for the test fixture.
export const STORAGE_KEY = 'prepr.v3';
// The household ref holds the secret household id, so it lives in its own key —
// never folded into the exported/shared PersistedState.
const HOUSEHOLD_KEY = 'prepr.household';
// Set once the first-run welcome has been dismissed.
export const WELCOME_KEY = 'prepr.welcomed';
// The chosen supermarket id (for "find at …" links).
const SUPERMARKET_KEY = 'prepr.supermarket';

function loadSupermarket(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(SUPERMARKET_KEY);
  } catch {
    return null;
  }
}

function loadHousehold(): HouseholdRef | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOUSEHOLD_KEY);
    const h = raw ? (JSON.parse(raw) as HouseholdRef) : null;
    return h && h.id && h.memberId ? h : null;
  } catch {
    return null;
  }
}

function toListItem(i: SyncItem): ListItem {
  return {
    key: i.key,
    name: i.name,
    emoji: i.emoji,
    category: i.category as CategoryName,
    qty: i.qty,
    unit: i.unit,
    checked: i.checked,
    by: i.by,
    spec: i.spec,
  };
}

function toMember(m: SyncMember): Member {
  return { name: m.name, color: m.color, initial: m.initial };
}

export interface ToastState {
  id: number;
  msg: string;
  undo: boolean;
  dur: number;
}

export interface AppState extends PersistedState {
  tab: Tab;
  search: string;
  openRecipe: string | null;
  servings: number;
  createOpen: boolean;
  draft: RecipeDraft | null;
  editingRecipeId: string | null;
  detailKey: string | null;
  toast: ToastState | null;
  flash: string | null;
  recipeQuery: string;
  membersOpen: boolean;
  /** Set when this device has joined a shared household (real-time sync on). */
  household: HouseholdRef | null;
  /** A household id pulled from a #join= link, awaiting confirmation. */
  pendingJoin: string | null;
  /** First-run welcome/name overlay. */
  welcomeOpen: boolean;
  /** In-app guided coachmark tour running. */
  tourOpen: boolean;
  /** Chosen supermarket id, or null. */
  supermarket: string | null;
  /** The settings drawer is open. */
  settingsOpen: boolean;
}

function loadPersisted(): Partial<PersistedState> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
  } catch {
    return {};
  }
}

function normalizeTheme(theme: unknown, fallback: ThemeMode = 'system'): ThemeMode {
  return theme === 'system' || theme === 'dark' || theme === 'light' ? theme : fallback;
}

function makeInitialState(): AppState {
  const saved = loadPersisted();
  const freshInstall = Object.keys(saved).length === 0;
  // On a brand-new (or version-bumped) install, drop any stale household pairing
  // too, so existing testers start fully clean.
  if (freshInstall && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(HOUSEHOLD_KEY);
    } catch {
      /* ignore */
    }
  }
  const household = freshInstall ? null : loadHousehold();
  const members =
    saved.members && saved.members.length ? saved.members : DEFAULT_MEMBERS;
  const welcomeOpen =
    typeof localStorage !== 'undefined' && !localStorage.getItem(WELCOME_KEY);
  // In a household, this device IS the joined member; otherwise use the saved
  // local active member. Server state reconciles both on (re)connect.
  const activeMember = household
    ? household.memberName
    : saved.activeMember && members.some((m) => m.name === saved.activeMember)
      ? saved.activeMember
      : members[0].name;
  return {
    tab: 'list',
    search: '',
    openRecipe: null,
    servings: 4,
    createOpen: false,
    draft: null,
    editingRecipeId: null,
    detailKey: null,
    toast: null,
    flash: null,
    recipeQuery: '',
    membersOpen: false,
    household,
    pendingJoin: null,
    welcomeOpen,
    tourOpen: false,
    supermarket: loadSupermarket(),
    settingsOpen: false,
    // A fresh install starts empty — a clean slate to build a real list on.
    // Persisted data is normalised on load; Array.isArray (not ??) so an
    // intentionally-empty list/plan is preserved.
    list: Array.isArray(saved.list) ? ops.normalizeList(saved.list) : [],
    recipes: Array.isArray(saved.recipes) ? saved.recipes.map(ops.normalizeRecipe) : [],
    plan:
      saved.plan && typeof saved.plan === 'object' && !Array.isArray(saved.plan)
        ? ops.normalizePlan(saved.plan)
        : ops.normalizePlan({}),
    pantry: Array.isArray(saved.pantry) ? ops.normalizeStringArray(saved.pantry) : [],
    recents: Array.isArray(saved.recents)
      ? ops.normalizeStringArray(saved.recents)
      : [],
    members,
    activeMember,
    theme: normalizeTheme(saved.theme),
  };
}

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function reducer(state: AppState, patch: Patch): AppState {
  const next = typeof patch === 'function' ? patch(state) : patch;
  return { ...state, ...next };
}

export interface Actions {
  setTab: (tab: Tab) => void;
  setSearch: (q: string) => void;
  setRecipeQuery: (q: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  addCatalog: (id: string) => void;
  addCustom: (opts?: { emoji?: string; category?: CategoryName }) => void;
  addSharedText: (text: string) => void;
  changeQty: (key: string, delta: number) => void;
  setItemField: (key: string, field: 'unit' | 'spec', value: string) => void;
  openDetail: (key: string) => void;
  closeDetail: () => void;
  toggleGot: (key: string) => void;
  undo: () => void;
  clearAll: () => void;
  clearTrolley: () => void;
  openRecipe: (id: string) => void;
  closeRecipe: () => void;
  incServings: () => void;
  decServings: () => void;
  addRecipeToList: (recipe: Recipe, servings: number) => void;
  toggleFavorite: (id: string) => void;
  deleteRecipe: (id: string) => void;
  assignMeal: (day: string, id: string, slot?: ops.MealSlot) => void;
  removeMeal: (day: string, index: number) => void;
  moveMeal: (
    fromDay: string,
    fromIndex: number,
    toDay: string,
    toSlot?: ops.MealSlot,
  ) => void;
  addWeek: () => void;
  togglePantry: (name: string) => void;
  setActiveMember: (name: string) => void;
  addMember: (name: string) => void;
  removeMember: (name: string) => void;
  openMembers: () => void;
  closeMembers: () => void;
  openCreate: () => void;
  openEdit: (id: string) => void;
  closeCreate: () => void;
  draftSet: (field: keyof RecipeDraft, value: string) => void;
  draftIng: (i: number, field: 'name' | 'qty' | 'unit', value: string) => void;
  draftAddIng: () => void;
  draftRemoveIng: (i: number) => void;
  draftPasteIngredients: (text: string) => void;
  loadRecipeDraft: (draft: RecipeDraft) => void;
  saveRecipe: () => void;
  showToast: (msg: string, opts?: { undo?: boolean; dur?: number }) => void;
  exportData: () => void;
  importData: (data: Partial<PersistedState>) => void;
  shareLink: () => void;
  resetData: () => void;
  // --- Shared households (real-time sync) ---
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (id: string, name: string) => Promise<void>;
  leaveHousehold: () => void;
  requestJoin: (id: string) => void;
  cancelJoin: () => void;
  dismissWelcome: () => void;
  openWelcome: () => void;
  setMyName: (name: string) => void;
  startTour: () => void;
  endTour: () => void;
  setSupermarket: (id: string | null) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

interface StoreValue {
  state: AppState;
  actions: Actions;
}

const StoreContext = createContext<StoreValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  // Refs so action callbacks can read the latest state / manage timers without
  // re-creating the action object on every render.
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const undoRef = useRef<ListItem[] | null>(null);
  const toastSeq = useRef(0);
  const syncRef = useRef<sync.SyncClient | null>(null);
  // Ops to flush onto a freshly-created household (seeding it with local items).
  const seedRef = useRef<Op[]>([]);

  // Persist the relevant slice whenever it changes.
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const persisted: PersistedState = {
      list: state.list,
      recipes: state.recipes,
      plan: state.plan,
      pantry: state.pantry,
      recents: state.recents,
      members: state.members,
      activeMember: state.activeMember,
      theme: state.theme,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [
    state.list,
    state.recipes,
    state.plan,
    state.pantry,
    state.members,
    state.activeMember,
    state.recents,
    state.theme,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Persist the household ref on its own (it holds the secret household id, so it
  // must never end up in the exported/shared PersistedState).
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      if (state.household)
        localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(state.household));
      else localStorage.removeItem(HOUSEHOLD_KEY);
    } catch {
      /* ignore */
    }
  }, [state.household]);

  // While in a household, hold a live channel and fold server changes into state.
  const householdId = state.household?.id;
  const memberId = state.household?.memberId;
  useEffect(() => {
    if (!householdId || !memberId) return;
    const apply = (msg: ServerMsg) => {
      switch (msg.t) {
        case 'state':
          dispatch({
            list: msg.items.map(toListItem),
            members: msg.members.map(toMember),
            recipes: msg.recipes.map(ops.normalizeRecipe),
            plan: ops.normalizePlan(msg.plan),
            pantry: ops.normalizeStringArray(msg.pantry),
          });
          break;
        case 'item': {
          const item = toListItem(msg.item);
          dispatch((s) => {
            const i = s.list.findIndex((x) => x.key === item.key);
            const list = s.list.slice();
            if (i >= 0) list[i] = item;
            else list.push(item);
            return { list };
          });
          break;
        }
        case 'remove':
          dispatch((s) => ({ list: s.list.filter((x) => x.key !== msg.key) }));
          break;
        case 'clear':
          dispatch({ list: [] });
          break;
        case 'members':
          dispatch({ members: msg.members.map(toMember) });
          break;
        case 'recipe': {
          const recipe = ops.normalizeRecipe(msg.recipe);
          dispatch((s) => {
            const i = s.recipes.findIndex((r) => r.id === recipe.id);
            const recipes = s.recipes.slice();
            if (i >= 0) recipes[i] = recipe;
            else recipes.push(recipe);
            return { recipes };
          });
          break;
        }
        case 'recipeRemove':
          dispatch((s) => ({
            recipes: s.recipes.filter((r) => r.id !== msg.id),
            plan: Object.fromEntries(
              Object.entries(s.plan).map(([d, ids]) => [
                d,
                ids.filter((x) => ops.planRecipeId(x) !== msg.id),
              ]),
            ) as AppState['plan'],
          }));
          break;
        case 'plan':
          dispatch((s) => ({ plan: { ...s.plan, [msg.day]: msg.ids } }));
          break;
        case 'pantry':
          dispatch((s) => ({
            pantry: msg.on
              ? s.pantry.includes(msg.name)
                ? s.pantry
                : [...s.pantry, msg.name]
              : s.pantry.filter((x) => x !== msg.name),
          }));
          break;
        case 'pong':
          break;
      }
    };
    const client = new sync.SyncClient(householdId, memberId, apply);
    syncRef.current = client;
    client.connect();
    // Flush any seed ops queued by createHousehold (they send once connected).
    for (const op of seedRef.current.splice(0)) client.send(op);
    return () => {
      client.close();
      if (syncRef.current === client) syncRef.current = null;
    };
  }, [householdId, memberId]);

  const actions = useMemo<Actions>(() => {
    const showToast = (msg: string, opts: { undo?: boolean; dur?: number } = {}) => {
      const dur = opts.dur ?? 2;
      toastSeq.current += 1;
      dispatch({
        toast: { id: toastSeq.current, msg, undo: !!opts.undo, dur },
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => dispatch({ toast: null }), dur * 1000);
    };

    const flash = (id: string) => {
      dispatch({ flash: id });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => dispatch({ flash: null }), 550);
    };

    // When in a household, mirror local list mutations to the server. The echo
    // (server broadcast) reconciles every device, including this one, so local
    // updates stay optimistic and snappy.
    const sendOp = (op: Op) => {
      if (stateRef.current.household) syncRef.current?.send(op);
    };

    return {
      setTab: (tab) => dispatch({ tab, search: '' }),
      setSearch: (search) => dispatch({ search }),
      setRecipeQuery: (recipeQuery) => dispatch({ recipeQuery }),
      setTheme: (theme) => dispatch({ theme }),
      toggleTheme: () =>
        dispatch((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      addCatalog: (id) => {
        const c = CATALOG.find((x) => x.id === id);
        if (!c) return;
        dispatch((s) => ({
          list: ops.mergeIntoList(s.list, {
            name: c.name,
            emoji: c.emoji,
            category: c.category,
            by: s.activeMember,
          }),
          recents: ops.pushRecent(s.recents, c.id),
        }));
        flash(c.id);
        sendOp({ kind: 'upsert', name: c.name, emoji: c.emoji, category: c.category });
      },

      addCustom: (opts) => {
        const q = stateRef.current.search.trim();
        if (!q) return;
        const c = CATALOG.find((x) => x.name.toLowerCase() === q.toLowerCase());
        if (c) {
          dispatch((s) => ({
            list: ops.mergeIntoList(s.list, {
              name: c.name,
              emoji: c.emoji,
              category: c.category,
              by: s.activeMember,
            }),
            recents: ops.pushRecent(s.recents, c.id),
            search: '',
          }));
          flash(c.id);
          sendOp({
            kind: 'upsert',
            name: c.name,
            emoji: c.emoji,
            category: c.category,
          });
        } else {
          dispatch((s) => ({
            list: ops.mergeIntoList(s.list, {
              name: q,
              emoji: opts?.emoji || '🛒',
              category: opts?.category || 'Pantry',
              by: s.activeMember,
            }),
            search: '',
          }));
          sendOp({
            kind: 'upsert',
            name: q,
            emoji: opts?.emoji || '🛒',
            category: opts?.category || 'Pantry',
          });
        }
        showToast(`Added “${q}”`);
      },

      addSharedText: (text) => {
        const q = text.trim().replace(/\s+/g, ' ');
        if (!q) return;
        const c = CATALOG.find((x) => x.name.toLowerCase() === q.toLowerCase());
        if (c) {
          dispatch((s) => ({
            list: ops.mergeIntoList(s.list, {
              name: c.name,
              emoji: c.emoji,
              category: c.category,
              by: s.activeMember,
            }),
            recents: ops.pushRecent(s.recents, c.id),
            search: '',
            tab: 'list',
          }));
          flash(c.id);
          sendOp({
            kind: 'upsert',
            name: c.name,
            emoji: c.emoji,
            category: c.category,
          });
          showToast(`Added “${c.name}” from share sheet`);
          return;
        }

        const suggestion = suggestEmoji(q)[0];
        const emoji = suggestion?.emoji ?? '🛒';
        const category = suggestion?.category ?? 'Pantry';
        dispatch((s) => ({
          list: ops.mergeIntoList(s.list, {
            name: q,
            emoji,
            category,
            by: s.activeMember,
          }),
          search: '',
          tab: 'list',
        }));
        sendOp({ kind: 'upsert', name: q, emoji, category });
        showToast(`Added “${q}” from share sheet`);
      },

      changeQty: (key, delta) => {
        const cur = stateRef.current.list.find((x) => x.key === key);
        dispatch((s) => ({ list: ops.changeQty(s.list, key, delta) }));
        if (cur)
          sendOp({
            kind: 'setQty',
            key,
            qty: Math.round((cur.qty + delta) * 100) / 100,
          });
      },

      setItemField: (key, field, value) => {
        dispatch((s) => ({ list: ops.setItemField(s.list, key, field, value) }));
        sendOp({ kind: 'field', key, field, value });
      },

      openDetail: (key) => dispatch({ detailKey: key }),
      closeDetail: () => dispatch({ detailKey: null }),

      // Tap to "check off" — the item moves into the In the trolley section
      // rather than vanishing, so the list reads like a real shop. Tapping a
      // checked item moves it back. Reversible by design, so no undo toast.
      toggleGot: (key) => {
        const it = stateRef.current.list.find((x) => x.key === key);
        if (!it) return;
        const checked = !it.checked;
        dispatch((s) => ({ list: ops.toggleChecked(s.list, key), detailKey: null }));
        sendOp({ kind: 'checked', key, checked });
      },

      undo: () => {
        const items = undoRef.current;
        if (!items || !items.length) return;
        undoRef.current = null;
        dispatch((s) => {
          const present = new Set(s.list.map((x) => x.key));
          const restored = items.filter((it) => !present.has(it.key));
          return { list: [...s.list, ...restored], toast: null };
        });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        // Re-create the restored items on the server.
        for (const it of items) {
          sendOp({
            kind: 'upsert',
            name: it.name,
            emoji: it.emoji,
            category: it.category,
            unit: it.unit,
            qty: it.qty,
            spec: it.spec,
          });
        }
      },

      clearAll: () => {
        const items = stateRef.current.list;
        if (!items.length) return;
        undoRef.current = items;
        dispatch({ list: [] });
        showToast(`Cleared ${items.length} item${items.length === 1 ? '' : 's'}`, {
          undo: true,
          dur: 6,
        });
        sendOp({ kind: 'clear' });
      },

      // Empty the In the trolley section once the shop is done, leaving any
      // still-to-get items behind. Undoable like clearAll.
      clearTrolley: () => {
        const items = stateRef.current.list.filter((x) => x.checked);
        if (!items.length) return;
        undoRef.current = items;
        dispatch((s) => ({ list: s.list.filter((x) => !x.checked) }));
        showToast(`Cleared ${items.length} item${items.length === 1 ? '' : 's'}`, {
          undo: true,
          dur: 6,
        });
        for (const it of items) sendOp({ kind: 'remove', key: it.key });
      },

      openRecipe: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        dispatch({ openRecipe: id, servings: r ? r.servings : 4 });
      },
      closeRecipe: () => dispatch({ openRecipe: null }),
      incServings: () => dispatch((s) => ({ servings: Math.min(40, s.servings + 1) })),
      decServings: () => dispatch((s) => ({ servings: Math.max(1, s.servings - 1) })),

      addRecipeToList: (recipe, servings) => {
        const pantry = stateRef.current.pantry;
        const { list, added, skipped } = ops.addRecipeToList(
          stateRef.current.list,
          recipe,
          servings,
          pantry,
          stateRef.current.activeMember,
        );
        dispatch({ list, openRecipe: null });
        showToast(
          `Added ${added} item${added === 1 ? '' : 's'}` +
            (skipped ? ` · ${skipped} in pantry` : ''),
        );
        // Mirror each scaled, non-pantry ingredient to the server.
        const factor = servings / recipe.servings;
        for (const ing of recipe.ingredients) {
          if (pantry.includes(ing.name)) continue;
          const qty = Math.round(ing.qty * factor * 100) / 100;
          if (qty <= 0) continue;
          sendOp({
            kind: 'upsert',
            name: ing.name,
            emoji: ing.emoji,
            category: ing.category,
            unit: ing.unit,
            qty,
          });
        }
      },

      toggleFavorite: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        dispatch((s) => ({
          recipes: s.recipes.map((x) =>
            x.id === id ? { ...x, favorite: !x.favorite } : x,
          ),
        }));
        if (r)
          sendOp({ kind: 'recipeUpsert', recipe: { ...r, favorite: !r.favorite } });
      },

      deleteRecipe: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        dispatch((s) => ({
          recipes: s.recipes.filter((x) => x.id !== id),
          plan: Object.fromEntries(
            Object.entries(s.plan).map(([d, ids]) => [
              d,
              ids.filter((x) => ops.planRecipeId(x) !== id),
            ]),
          ) as AppState['plan'],
          openRecipe: s.openRecipe === id ? null : s.openRecipe,
        }));
        showToast(`Deleted “${r ? r.name : 'recipe'}”`);
        sendOp({ kind: 'recipeDelete', id });
      },

      assignMeal: (day, id, slot = 'dinner') => {
        if (!id) return;
        const key = day as keyof AppState['plan'];
        const newPlan = ops.assignMeal(stateRef.current.plan, key, id, slot);
        dispatch({ plan: newPlan });
        const r = stateRef.current.recipes.find((x) => x.id === id);
        showToast(`${r ? r.name : 'Meal'} → ${day}`);
        sendOp({ kind: 'planSet', day, ids: newPlan[key] });
      },
      removeMeal: (day, index) => {
        const key = day as keyof AppState['plan'];
        const newPlan = ops.removeMeal(stateRef.current.plan, key, index);
        dispatch({ plan: newPlan });
        sendOp({ kind: 'planSet', day, ids: newPlan[key] });
      },
      moveMeal: (fromDay, fromIndex, toDay, toSlot) => {
        const fromKey = fromDay as keyof AppState['plan'];
        const toKey = toDay as keyof AppState['plan'];
        const newPlan = ops.moveMeal(
          stateRef.current.plan,
          fromKey,
          fromIndex,
          toKey,
          toSlot,
        );
        if (newPlan === stateRef.current.plan) return;
        dispatch({ plan: newPlan });
        sendOp({ kind: 'planSet', day: fromDay, ids: newPlan[fromKey] });
        if (fromDay !== toDay) {
          sendOp({ kind: 'planSet', day: toDay, ids: newPlan[toKey] });
        }
        showToast(`Moved meal to ${toDay}`);
      },

      addWeek: () => {
        const { list, count } = ops.addWeekToList(
          stateRef.current.list,
          stateRef.current.plan,
          stateRef.current.recipes,
          stateRef.current.pantry,
          stateRef.current.activeMember,
        );
        if (!count) {
          showToast('No meals planned yet');
          return;
        }
        dispatch({ list });
        showToast(`Added ${count} item${count === 1 ? '' : 's'} from your week`);
        // Mirror the aggregated week to the server (same identity as the merge).
        if (stateRef.current.household) {
          const s = stateRef.current;
          const totals = new Map<string, Op & { kind: 'upsert' }>();
          for (const ids of Object.values(s.plan)) {
            for (const ref of ids) {
              const r = s.recipes.find((x) => x.id === ops.planRecipeId(ref));
              if (!r) continue;
              for (const ing of r.ingredients) {
                if (s.pantry.includes(ing.name)) continue;
                const k = ops.listKey(ing.name, ing.unit);
                const existing = totals.get(k);
                if (existing) existing.qty = (existing.qty ?? 0) + ing.qty;
                else
                  totals.set(k, {
                    kind: 'upsert',
                    name: ing.name,
                    emoji: ing.emoji,
                    category: ing.category,
                    unit: ing.unit,
                    qty: ing.qty,
                  });
              }
            }
          }
          for (const op of totals.values()) sendOp(op);
        }
      },

      togglePantry: (name) => {
        const has = stateRef.current.pantry.includes(name);
        dispatch((s) => ({ pantry: ops.togglePantry(s.pantry, name) }));
        sendOp({ kind: 'pantrySet', name, on: !has });
      },

      setActiveMember: (name) => dispatch({ activeMember: name }),

      addMember: (name) => {
        const nm = name.trim();
        if (!nm) return;
        dispatch((s) => {
          if (s.members.some((m) => m.name.toLowerCase() === nm.toLowerCase())) {
            return {};
          }
          const color = MEMBER_COLORS[s.members.length % MEMBER_COLORS.length];
          // Use the first code point (not UTF-16 unit) so emoji names don't
          // produce a broken half-character initial.
          const initial = [...nm][0].toUpperCase();
          return {
            members: [...s.members, { name: nm, initial, color }],
          };
        });
      },

      removeMember: (name) =>
        dispatch((s) => {
          if (s.members.length <= 1) return {};
          const members = s.members.filter((m) => m.name !== name);
          const activeMember =
            s.activeMember === name ? members[0].name : s.activeMember;
          return { members, activeMember };
        }),

      openMembers: () => dispatch({ membersOpen: true }),
      closeMembers: () => dispatch({ membersOpen: false }),

      openCreate: () =>
        dispatch({
          createOpen: true,
          editingRecipeId: null,
          draft: {
            emoji: '🍽️',
            name: '',
            servings: 4,
            time: '',
            ingredients: [{ name: '', qty: '', unit: '' }],
            stepsText: '',
          },
        }),

      openEdit: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        if (!r) return;
        dispatch({
          createOpen: true,
          editingRecipeId: id,
          openRecipe: null,
          draft: {
            emoji: r.emoji,
            name: r.name,
            servings: r.servings,
            time: r.time,
            ingredients: r.ingredients.length
              ? r.ingredients.map((i) => ({
                  name: i.name,
                  qty: String(i.qty),
                  unit: i.unit,
                }))
              : [{ name: '', qty: '', unit: '' }],
            stepsText: r.steps.join('\n'),
          },
        });
      },

      closeCreate: () =>
        dispatch({ createOpen: false, draft: null, editingRecipeId: null }),

      draftSet: (field, value) =>
        dispatch((s) => (s.draft ? { draft: { ...s.draft, [field]: value } } : {})),
      draftIng: (i, field, value) =>
        dispatch((s) =>
          s.draft
            ? {
                draft: {
                  ...s.draft,
                  ingredients: s.draft.ingredients.map((x, j) =>
                    j === i ? { ...x, [field]: value } : x,
                  ),
                },
              }
            : {},
        ),
      draftAddIng: () =>
        dispatch((s) =>
          s.draft
            ? {
                draft: {
                  ...s.draft,
                  ingredients: [
                    ...s.draft.ingredients,
                    { name: '', qty: '', unit: '' },
                  ],
                },
              }
            : {},
        ),
      draftRemoveIng: (i) =>
        dispatch((s) =>
          s.draft
            ? {
                draft: {
                  ...s.draft,
                  ingredients: s.draft.ingredients.filter((_, j) => j !== i),
                },
              }
            : {},
        ),
      draftPasteIngredients: (text) => {
        const parsed = parseIngredients(text);
        if (!parsed.length) {
          showToast('Nothing to add');
          return;
        }
        dispatch((s) => {
          if (!s.draft) return {};
          // Drop the empty starter rows so a paste into a fresh draft replaces
          // them rather than leaving blanks.
          const existing = s.draft.ingredients.filter(
            (x) => x.name.trim() || x.qty.trim() || x.unit.trim(),
          );
          return {
            draft: { ...s.draft, ingredients: [...existing, ...parsed] },
          };
        });
        showToast(`Added ${parsed.length} ingredient${parsed.length === 1 ? '' : 's'}`);
      },

      loadRecipeDraft: (draft) => dispatch({ draft }),

      saveRecipe: () => {
        const d = stateRef.current.draft;
        if (!d) return;
        if (!d.name.trim()) {
          showToast('Give it a name first');
          return;
        }
        const editingId = stateRef.current.editingRecipeId;
        const id = editingId ?? 'r' + Date.now();
        const recipe = ops.recipeFromDraft(d, CATALOG, id);
        if (editingId) {
          const prev = stateRef.current.recipes.find((r) => r.id === editingId);
          recipe.favorite = prev?.favorite;
          dispatch((s) => ({
            recipes: s.recipes.map((r) => (r.id === editingId ? recipe : r)),
            createOpen: false,
            draft: null,
            editingRecipeId: null,
          }));
          showToast(`Updated “${recipe.name}”`);
        } else {
          dispatch((s) => ({
            recipes: [...s.recipes, recipe],
            createOpen: false,
            draft: null,
          }));
          showToast(`Saved “${recipe.name}”`);
        }
        sendOp({ kind: 'recipeUpsert', recipe });
      },

      showToast,

      exportData: () => {
        const s = stateRef.current;
        const persisted: PersistedState = {
          list: s.list,
          recipes: s.recipes,
          plan: s.plan,
          pantry: s.pantry,
          recents: s.recents,
          members: s.members,
          activeMember: s.activeMember,
          theme: s.theme,
        };
        try {
          const blob = new Blob([JSON.stringify(persisted, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `prepr-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Exported your data');
        } catch {
          showToast('Could not export');
        }
      },

      importData: (data) => {
        dispatch((s) => {
          // Keep only well-formed member entries; fall back to current members.
          const cleanMembers = Array.isArray(data.members)
            ? (data.members as unknown[]).filter(
                (m): m is (typeof s.members)[number] =>
                  !!m &&
                  typeof m === 'object' &&
                  typeof (m as { name?: unknown }).name === 'string' &&
                  !!(m as { name: string }).name,
              )
            : [];
          const members = cleanMembers.length ? cleanMembers : s.members;
          const activeMember =
            typeof data.activeMember === 'string' &&
            members.some((m) => m.name === data.activeMember)
              ? data.activeMember
              : members.some((m) => m.name === s.activeMember)
                ? s.activeMember
                : members[0].name;
          return {
            list: Array.isArray(data.list) ? ops.normalizeList(data.list) : s.list,
            recipes: Array.isArray(data.recipes)
              ? data.recipes.map(ops.normalizeRecipe)
              : s.recipes,
            plan:
              data.plan && typeof data.plan === 'object' && !Array.isArray(data.plan)
                ? ops.normalizePlan(data.plan)
                : s.plan,
            pantry: Array.isArray(data.pantry)
              ? ops.normalizeStringArray(data.pantry)
              : s.pantry,
            recents: Array.isArray(data.recents)
              ? ops.normalizeStringArray(data.recents)
              : s.recents,
            members,
            activeMember,
            theme: normalizeTheme(data.theme, s.theme),
            openRecipe: null,
            detailKey: null,
            createOpen: false,
          };
        });
        showToast('Imported your data');
      },

      shareLink: () => {
        const s = stateRef.current;
        const persisted: PersistedState = {
          list: s.list,
          recipes: s.recipes,
          plan: s.plan,
          pantry: s.pantry,
          recents: s.recents,
          members: s.members,
          activeMember: s.activeMember,
          theme: s.theme,
        };
        const url = buildShareUrl(persisted);
        const ok = () => showToast('Share link copied to clipboard', { dur: 3 });
        if (navigator.clipboard?.writeText) {
          navigator.clipboard
            .writeText(url)
            .then(ok, () => showToast('Could not copy the link'));
        } else {
          showToast('Clipboard unavailable on this browser');
        }
      },

      resetData: () => {
        dispatch({
          list: seedList(),
          recipes: SEED_RECIPES,
          plan: seedPlan(),
          pantry: SEED_PANTRY,
          recents: SEED_RECENTS,
          members: SAMPLE_MEMBERS,
          activeMember: SAMPLE_MEMBERS[0].name,
          openRecipe: null,
          detailKey: null,
          createOpen: false,
        });
        showToast('Reset to sample data');
      },

      createHousehold: async (name) => {
        try {
          const res = await sync.createHousehold(name);
          const s = stateRef.current;
          dispatch({
            household: {
              id: res.householdId,
              memberId: res.member.id,
              memberName: res.member.name,
            },
            members: res.members.map(toMember),
            activeMember: res.member.name,
            membersOpen: false,
            pendingJoin: null,
          });
          // Seed the new household with everything on this device — the connect
          // effect flushes these once the WebSocket is up.
          const seed: Op[] = s.list.map((it) => ({
            kind: 'upsert' as const,
            name: it.name,
            emoji: it.emoji,
            category: it.category,
            unit: it.unit,
            qty: it.qty,
            spec: it.spec,
          }));
          for (const r of s.recipes) seed.push({ kind: 'recipeUpsert', recipe: r });
          for (const [day, ids] of Object.entries(s.plan)) {
            if (ids.length) seed.push({ kind: 'planSet', day, ids });
          }
          for (const name of s.pantry) seed.push({ kind: 'pantrySet', name, on: true });
          seedRef.current = seed;
          showToast('Shared list created');
        } catch {
          showToast('Could not create the shared list');
        }
      },

      joinHousehold: async (id, name) => {
        try {
          const res = await sync.joinHousehold(id, name);
          dispatch({
            household: { id, memberId: res.member.id, memberName: res.member.name },
            members: res.members.map(toMember),
            activeMember: res.member.name,
            list: res.items.map(toListItem),
            recipes: res.recipes.map(ops.normalizeRecipe),
            plan: ops.normalizePlan(res.plan),
            pantry: ops.normalizeStringArray(res.pantry),
            membersOpen: false,
            pendingJoin: null,
          });
          showToast('Joined the shared list');
        } catch {
          showToast('Could not join — check the link');
        }
      },

      leaveHousehold: () => {
        dispatch({
          household: null,
          members: DEFAULT_MEMBERS,
          activeMember: DEFAULT_MEMBERS[0].name,
        });
        showToast('Left the shared list');
      },

      requestJoin: (id) => dispatch({ pendingJoin: id }),
      cancelJoin: () => dispatch({ pendingJoin: null }),

      dismissWelcome: () => {
        try {
          localStorage.setItem(WELCOME_KEY, '1');
        } catch {
          /* ignore */
        }
        dispatch({ welcomeOpen: false });
      },
      openWelcome: () => dispatch({ welcomeOpen: true }),

      setMyName: (name) => {
        const nm = name.trim().slice(0, 40);
        if (!nm) return;
        const initial = (Array.from(nm)[0] || '?').toUpperCase();
        dispatch((s) => {
          // In a household the name is server-managed; otherwise rename the
          // local "me" member so attributions and sharing use the real name.
          if (s.household) return {};
          const members = s.members.map((m) =>
            m.name === s.activeMember ? { ...m, name: nm, initial } : m,
          );
          return { members, activeMember: nm };
        });
      },
      startTour: () => dispatch({ tab: 'list', tourOpen: true }),
      endTour: () => dispatch({ tourOpen: false }),

      setSupermarket: (id) => {
        try {
          if (id) localStorage.setItem(SUPERMARKET_KEY, id);
          else localStorage.removeItem(SUPERMARKET_KEY);
        } catch {
          /* ignore */
        }
        dispatch({ supermarket: id });
      },
      openSettings: () => dispatch({ settingsOpen: true }),
      closeSettings: () => dispatch({ settingsOpen: false }),
    };
  }, []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
