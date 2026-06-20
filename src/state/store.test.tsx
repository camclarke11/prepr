import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StoreProvider, useStore } from './store';

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

  it('undo restores a removed item', () => {
    const { result } = setup();
    const { key, name } = result.current.state.list[0];
    act(() => result.current.actions.gotIt(key));
    expect(result.current.state.list.find((x) => x.key === key)).toBeUndefined();
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
    expect(result.current.state.plan.Tue).toContain('tacos');
    act(() => result.current.actions.removeMeal('Tue', 0));
    expect(result.current.state.plan.Tue).not.toContain('tacos');
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
    const saved = JSON.parse(localStorage.getItem('prepr.v2') || '{}');
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
});
