import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { ListItem, PersistedState, Recipe, Tab } from '../types';
import { DEFAULT_MEMBERS, MEMBER_COLORS } from '../theme';
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

const STORAGE_KEY = 'prepr.v2';

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

function makeInitialState(): AppState {
  const saved = loadPersisted();
  const members =
    saved.members && saved.members.length ? saved.members : DEFAULT_MEMBERS;
  const activeMember =
    saved.activeMember && members.some((m) => m.name === saved.activeMember)
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
    list: saved.list ?? seedList(),
    recipes: saved.recipes ? saved.recipes.map(ops.normalizeRecipe) : SEED_RECIPES,
    plan: saved.plan ?? seedPlan(),
    pantry: saved.pantry ?? SEED_PANTRY,
    recents: saved.recents ?? SEED_RECENTS,
    members,
    activeMember,
    theme: saved.theme ?? 'light',
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
  toggleTheme: () => void;
  addCatalog: (id: string) => void;
  addCustom: () => void;
  changeQty: (key: string, delta: number) => void;
  setItemField: (key: string, field: 'unit' | 'spec', value: string) => void;
  openDetail: (key: string) => void;
  closeDetail: () => void;
  gotIt: (key: string) => void;
  undo: () => void;
  clearAll: () => void;
  openRecipe: (id: string) => void;
  closeRecipe: () => void;
  incServings: () => void;
  decServings: () => void;
  addRecipeToList: (recipe: Recipe, servings: number) => void;
  toggleFavorite: (id: string) => void;
  deleteRecipe: (id: string) => void;
  assignMeal: (day: string, id: string) => void;
  removeMeal: (day: string, index: number) => void;
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
  saveRecipe: () => void;
  showToast: (msg: string, opts?: { undo?: boolean; dur?: number }) => void;
  exportData: () => void;
  importData: (data: Partial<PersistedState>) => void;
  shareLink: () => void;
  resetData: () => void;
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

    return {
      setTab: (tab) => dispatch({ tab, search: '' }),
      setSearch: (search) => dispatch({ search }),
      setRecipeQuery: (recipeQuery) => dispatch({ recipeQuery }),
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
      },

      addCustom: () => {
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
        } else {
          dispatch((s) => ({
            list: ops.mergeIntoList(s.list, {
              name: q,
              emoji: '🛒',
              category: 'Pantry',
              by: s.activeMember,
            }),
            search: '',
          }));
        }
        showToast(`Added “${q}”`);
      },

      changeQty: (key, delta) =>
        dispatch((s) => ({ list: ops.changeQty(s.list, key, delta) })),

      setItemField: (key, field, value) =>
        dispatch((s) => ({ list: ops.setItemField(s.list, key, field, value) })),

      openDetail: (key) => dispatch({ detailKey: key }),
      closeDetail: () => dispatch({ detailKey: null }),

      gotIt: (key) => {
        const it = stateRef.current.list.find((x) => x.key === key);
        if (!it) return;
        undoRef.current = [it];
        dispatch((s) => ({
          list: ops.removeItem(s.list, key),
          detailKey: null,
        }));
        showToast(`Got ${it.name}`, { undo: true, dur: 5 });
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
      },

      openRecipe: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        dispatch({ openRecipe: id, servings: r ? r.servings : 4 });
      },
      closeRecipe: () => dispatch({ openRecipe: null }),
      incServings: () => dispatch((s) => ({ servings: Math.min(40, s.servings + 1) })),
      decServings: () => dispatch((s) => ({ servings: Math.max(1, s.servings - 1) })),

      addRecipeToList: (recipe, servings) => {
        const { list, added, skipped } = ops.addRecipeToList(
          stateRef.current.list,
          recipe,
          servings,
          stateRef.current.pantry,
          stateRef.current.activeMember,
        );
        dispatch({ list, openRecipe: null });
        showToast(
          `Added ${added} item${added === 1 ? '' : 's'}` +
            (skipped ? ` · ${skipped} in pantry` : ''),
        );
      },

      toggleFavorite: (id) =>
        dispatch((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === id ? { ...r, favorite: !r.favorite } : r,
          ),
        })),

      deleteRecipe: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        dispatch((s) => ({
          recipes: s.recipes.filter((x) => x.id !== id),
          plan: Object.fromEntries(
            Object.entries(s.plan).map(([d, ids]) => [d, ids.filter((x) => x !== id)]),
          ) as AppState['plan'],
          openRecipe: s.openRecipe === id ? null : s.openRecipe,
        }));
        showToast(`Deleted “${r ? r.name : 'recipe'}”`);
      },

      assignMeal: (day, id) => {
        if (!id) return;
        dispatch((s) => ({
          plan: ops.assignMeal(s.plan, day as keyof AppState['plan'], id),
        }));
        const r = stateRef.current.recipes.find((x) => x.id === id);
        showToast(`${r ? r.name : 'Meal'} → ${day}`);
      },
      removeMeal: (day, index) =>
        dispatch((s) => ({
          plan: ops.removeMeal(s.plan, day as keyof AppState['plan'], index),
        })),

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
      },

      togglePantry: (name) =>
        dispatch((s) => ({ pantry: ops.togglePantry(s.pantry, name) })),

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
        const arr = <T,>(v: unknown, fallback: T[]): T[] =>
          Array.isArray(v) ? (v as T[]) : fallback;
        dispatch((s) => {
          const members =
            Array.isArray(data.members) && data.members.length
              ? data.members
              : s.members;
          const activeMember =
            typeof data.activeMember === 'string' &&
            members.some((m) => m.name === data.activeMember)
              ? data.activeMember
              : members.some((m) => m.name === s.activeMember)
                ? s.activeMember
                : members[0].name;
          return {
            list: arr(data.list, s.list),
            recipes: Array.isArray(data.recipes)
              ? data.recipes.map(ops.normalizeRecipe)
              : s.recipes,
            plan:
              data.plan && typeof data.plan === 'object' && !Array.isArray(data.plan)
                ? (data.plan as AppState['plan'])
                : s.plan,
            pantry: arr(data.pantry, s.pantry),
            recents: arr(data.recents, s.recents),
            members,
            activeMember,
            theme:
              data.theme === 'dark' || data.theme === 'light' ? data.theme : s.theme,
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
          members: DEFAULT_MEMBERS,
          activeMember: DEFAULT_MEMBERS[0].name,
          openRecipe: null,
          detailKey: null,
          createOpen: false,
        });
        showToast('Reset to sample data');
      },
    };
  }, []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
