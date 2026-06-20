import { afterEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByRole('heading', { name: 'Shopping list' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /Light mode/i })).toBeInTheDocument();
  });

  it('edits an item and marks it got from the detail sheet', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Note'), 'organic');
    await user.click(within(dialog).getByRole('button', { name: /Got it/i }));
    expect(screen.queryByRole('button', { name: /Milk.*Mark as got/i })).toBeNull();
  });

  it('skips pantry staples when adding a recipe to the list', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /^Recipes/i }));
    await user.click(screen.getByText('Greek Salad'));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /Add ingredients to list/i }),
    );
    await user.click(screen.getByRole('button', { name: /Shopping list/i }));
    // Cucumber is added; Olive Oil is in the pantry and is skipped.
    expect(
      await screen.findByRole('button', { name: /Cucumber.*Mark as got/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Olive Oil.*Mark as got/i }),
    ).toBeNull();
  });

  it('creates a recipe and shows it on the recipes tab', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /^Recipes/i }));
    await user.click(screen.getByRole('button', { name: /New recipe/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Recipe name'), 'My Test Soup');
    await user.click(within(dialog).getByRole('button', { name: /Save recipe/i }));
    expect(screen.getByText('My Test Soup')).toBeInTheDocument();
  });
});

describe('App (mobile layout)', () => {
  afterEach(() => {
    // Restore the desktop default from the global setup.
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList;
  });

  it('shows the bottom nav and hides the sidebar on small screens', () => {
    window.matchMedia = (query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList;
    renderApp();
    // Bottom nav uses short labels; sidebar-only "Dark mode" button is absent.
    expect(screen.getByRole('button', { name: /^List/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dark mode/i })).toBeNull();
  });
});
