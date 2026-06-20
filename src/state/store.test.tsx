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
});
