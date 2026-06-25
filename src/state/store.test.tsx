import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StoreProvider, useStore, STORAGE_KEY } from './store';

const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

const setup = () => renderHook(() => useStore(), { wrapper });

describe('store', () => {
  it('attributes new items to the active member', () => {
    const { result } = setup();
    act(() => result.current.actions.addMember('Alex'));
    act(() => result.current.actions.setActiveMember('Alex'));
    act(() => result.current.actions.addCatalog('apples'));
    expect(result.current.state.list.find((x) => x.name === 'Apples')?.by).toBe('Alex');
  });

  it('does not add duplicate members', () => {
    const { result } = setup();
    const n = result.current.state.members.length;
    act(() => result.current.actions.addMember('sam')); // case-insensitive dupe
    expect(result.current.state.members.length).toBe(n);
  });

  it('reassigns the active member when it is removed', () => {
    const { result } = setup();
    act(() => result.current.actions.setActiveMember('Sam'));
    act(() => result.current.actions.removeMember('Sam'));
    expect(result.current.state.members.some((m) => m.name === 'Sam')).toBe(false);
    expect(result.current.state.activeMember).toBe('You');
  });

  it('always keeps at least one member', () => {
    const { result } = setup();
    act(() => result.current.actions.removeMember('Sam'));
    act(() => result.current.actions.removeMember('You'));
    expect(result.current.state.members.length).toBeGreaterThanOrEqual(1);
  });

  it('toggleGot checks an item off without removing it', () => {
    const { result } = setup();
    const { key } = result.current.state.list[0];
    act(() => result.current.actions.toggleGot(key));
    expect(result.current.state.list.find((x) => x.key === key)?.checked).toBe(true);
    act(() => result.current.actions.toggleGot(key));
    expect(result.current.state.list.find((x) => x.key === key)?.checked).toBe(false);
  });

  it('clearTrolley removes checked items but leaves the rest, and undo restores them', () => {
    const { result } = setup();
    const { key, name } = result.current.state.list[0];
    const before = result.current.state.list.length;
    act(() => result.current.actions.toggleGot(key));
    act(() => result.current.actions.clearTrolley());
    expect(result.current.state.list.find((x) => x.key === key)).toBeUndefined();
    expect(result.current.state.list.length).toBe(before - 1);
    act(() => result.current.actions.undo());
    expect(result.current.state.list.find((x) => x.key === key)?.name).toBe(name);
  });

  it('deleting a recipe also removes it from the plan', () => {
    const { result } = setup();
    act(() => result.current.actions.deleteRecipe('chicken'));
    const planned = Object.values(result.current.state.plan).flat();
    expect(planned).not.toContain('chicken');
    expect(
      result.current.state.recipes.find((r) => r.id === 'chicken'),
    ).toBeUndefined();
  });

  it('adds a recipe to the list', () => {
    const { result } = setup();
    const before = result.current.state.list.length;
    const greek = result.current.state.recipes.find((x) => x.id === 'greek')!;
    act(() => result.current.actions.addRecipeToList(greek, greek.servings));
    expect(result.current.state.list.length).toBeGreaterThan(before - 1);
    // Cucumber is unique to the Greek salad and not in the seed list/pantry.
    expect(result.current.state.list.some((x) => x.name === 'Cucumber')).toBe(true);
  });

  it('toggles theme', () => {
    const { result } = setup();
    const start = result.current.state.theme;
    act(() => result.current.actions.toggleTheme());
    expect(result.current.state.theme).not.toBe(start);
  });

  it('clears the whole list and restores it with undo', () => {
    const { result } = setup();
    const before = result.current.state.list.length;
    expect(before).toBeGreaterThan(0);
    act(() => result.current.actions.clearAll());
    expect(result.current.state.list).toHaveLength(0);
    act(() => result.current.actions.undo());
    expect(result.current.state.list).toHaveLength(before);
  });

  it('pastes parsed ingredients into a fresh draft, replacing blanks', () => {
    const { result } = setup();
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.draftPasteIngredients('2 cups flour\n3 eggs'));
    const ings = result.current.state.draft?.ingredients ?? [];
    expect(ings).toHaveLength(2);
    expect(ings[0]).toMatchObject({ name: 'flour', unit: 'cups', qty: '2' });
    expect(ings[1]).toMatchObject({ name: 'eggs', qty: '3' });
  });

  it('assigns and removes meals on the plan', () => {
    const { result } = setup();
    act(() => result.current.actions.assignMeal('Tue', 'tacos'));
    expect(result.current.state.plan.Tue.join(',')).toContain('tacos');
    act(() => result.current.actions.removeMeal('Tue', 0));
    expect(result.current.state.plan.Tue.join(',')).not.toContain('tacos');
  });

  it('adds the planned week to the list, skipping pantry staples', () => {
    const { result } = setup();
    act(() => result.current.actions.addWeek());
    const names = result.current.state.list.map((x) => x.name);
    // Broccoli comes from the seeded Mon (Sheet-Pan Chicken) and isn't a staple.
    expect(names).toContain('Broccoli');
    // Garlic is in the seeded pantry, so it should be skipped.
    expect(names).not.toContain('Garlic');
  });

  it('persists state changes to localStorage', () => {
    const { result } = setup();
    act(() => result.current.actions.addCatalog('apples'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.list.some((x: { name: string }) => x.name === 'Apples')).toBe(true);
  });

  it('imports data with malformed members without crashing', () => {
    const { result } = setup();
    act(() =>
      result.current.actions.importData({
        members: [null, { name: 'Zed', initial: 'Z', color: '#000' }] as never,
      }),
    );
    expect(result.current.state.members).toHaveLength(1);
    expect(result.current.state.members[0].name).toBe('Zed');
    expect(result.current.state.activeMember).toBe('Zed');
  });

  it('starts on an empty clean slate with the welcome on a fresh install', () => {
    localStorage.clear();
    const { result } = setup();
    expect(result.current.state.list).toHaveLength(0);
    expect(result.current.state.recipes).toHaveLength(0);
    expect(Object.values(result.current.state.plan).flat()).toHaveLength(0);
    expect(result.current.state.pantry).toHaveLength(0);
    expect(result.current.state.members.map((m) => m.name)).toEqual(['You']);
    expect(result.current.state.welcomeOpen).toBe(true);
    expect(result.current.state.household).toBeNull();
  });

  it('sets your name by renaming the active member', () => {
    const { result } = setup();
    act(() => result.current.actions.setMyName('Alex'));
    expect(result.current.state.activeMember).toBe('Alex');
    expect(result.current.state.members.some((m) => m.name === 'Alex')).toBe(true);
    expect(result.current.state.members.some((m) => m.name === 'You')).toBe(false);
  });

  it('creates a household and switches into shared mode', async () => {
    const member = {
      id: 'M1',
      name: 'Alex',
      color: '#3f7a4f',
      initial: 'A',
      joinedAt: 1,
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ householdId: 'HID', member, items: [], members: [member] }),
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const { result } = setup();
    await act(async () => {
      await result.current.actions.createHousehold('Alex');
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.current.state.household?.id).toBe('HID');
    expect(result.current.state.household?.memberId).toBe('M1');
    expect(result.current.state.activeMember).toBe('Alex');
    expect(result.current.state.members.some((m) => m.name === 'Alex')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('a join link sets a pending join (shown via the focused JoinPrompt)', () => {
    const { result } = setup();
    act(() => result.current.actions.requestJoin('HID'));
    expect(result.current.state.pendingJoin).toBe('HID');
    // It no longer opens the full members modal — JoinPrompt handles invites.
    expect(result.current.state.membersOpen).toBe(false);
    act(() => result.current.actions.cancelJoin());
    expect(result.current.state.pendingJoin).toBeNull();
  });

  it('leaving a household returns to solo mode', async () => {
    const member = {
      id: 'M1',
      name: 'Alex',
      color: '#3f7a4f',
      initial: 'A',
      joinedAt: 1,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          householdId: 'HID',
          member,
          items: [],
          members: [member],
        }),
      })) as unknown as typeof fetch,
    );
    const { result } = setup();
    await act(async () => {
      await result.current.actions.createHousehold('Alex');
    });
    act(() => result.current.actions.leaveHousehold());
    expect(result.current.state.household).toBeNull();
    vi.unstubAllGlobals();
  });

  it('adds a custom item with the chosen emoji and category', () => {
    const { result } = setup();
    act(() => result.current.actions.setSearch('Dragonfruit'));
    act(() => result.current.actions.addCustom({ emoji: '🐉', category: 'Produce' }));
    const item = result.current.state.list.find((x) => x.name === 'Dragonfruit');
    expect(item?.emoji).toBe('🐉');
    expect(item?.category).toBe('Produce');
  });

  it('falls back to a default emoji/category when none is chosen', () => {
    const { result } = setup();
    act(() => result.current.actions.setSearch('Mystery Item'));
    act(() => result.current.actions.addCustom());
    const item = result.current.state.list.find((x) => x.name === 'Mystery Item');
    expect(item?.emoji).toBe('🛒');
    expect(item?.category).toBe('Pantry');
  });

  it('imports a malformed plan without crashing and normalises the days', () => {
    const { result } = setup();
    act(() =>
      result.current.actions.importData({
        plan: { Mon: 'tacos', Tue: ['greek', 5], Wed: 42 } as never,
      }),
    );
    // Non-array / garbage day values become clean string arrays...
    expect(result.current.state.plan.Mon).toEqual([]);
    expect(result.current.state.plan.Tue).toEqual(['greek']);
    expect(result.current.state.plan.Wed).toEqual([]);
    // ...so addWeek, which iterates the plan, no longer throws.
    expect(() => act(() => result.current.actions.addWeek())).not.toThrow();
  });

  it('imports list items with a missing qty without producing NaN', () => {
    const { result } = setup();
    act(() =>
      result.current.actions.importData({
        list: [
          { name: 'Milk', unit: '', emoji: '🥛', category: 'Dairy & Eggs' },
        ] as never,
      }),
    );
    const milk = result.current.state.list.find((x) => x.name === 'Milk')!;
    expect(Number.isFinite(milk.qty)).toBe(true);
    // The corruption path: editing the qty must stay a finite number.
    act(() => result.current.actions.changeQty(milk.key, 1));
    const after = result.current.state.list.find((x) => x.name === 'Milk')!;
    expect(Number.isFinite(after.qty)).toBe(true);
    expect(after.qty).toBe(2);
  });
});
