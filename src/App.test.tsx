import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { StoreProvider } from './state/store';

function renderApp() {
  return render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  );
}

describe('App (integration)', () => {
  it('renders the shopping list with seed items', () => {
    renderApp();
    expect(
      screen.getByRole('heading', { name: 'Shopping list' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your list')).toBeInTheDocument();
    // A seeded item.
    expect(screen.getAllByText('Bananas').length).toBeGreaterThan(0);
  });

  it('switches tabs via the sidebar', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /Recipes/i }));
    expect(screen.getByText('Weeknight Tacos')).toBeInTheDocument();
    expect(screen.getByText('Overnight Oats')).toBeInTheDocument();
  });

  it('opens a recipe and adds its ingredients to the list', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /^Recipes/i }));
    await user.click(screen.getByText('Weeknight Tacos'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ingredients')).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: /Add ingredients to list/i }),
    );
    // Toast confirms the add.
    expect(await screen.findByText(/Added \d+ items/)).toBeInTheDocument();
  });

  it('adds a catalog item to the list from the search palette', async () => {
    const user = userEvent.setup();
    renderApp();
    const search = screen.getByLabelText('Search or add an item');
    await user.type(search, 'Strawberries');
    // The catalog tile (button) for Strawberries should now be filtered in.
    const addBtn = await screen.findByRole('button', { name: /Add Strawberries/i });
    await user.click(addBtn);
    // It now appears on the list side as an active tile with a "got it" label.
    expect(
      await screen.findByRole('button', { name: /Strawberries.*Mark as got/i }),
    ).toBeInTheDocument();
  });

  it('toggles dark mode from the sidebar', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /Dark mode/i }));
    expect(
      screen.getByRole('button', { name: /Light mode/i }),
    ).toBeInTheDocument();
  });
});
