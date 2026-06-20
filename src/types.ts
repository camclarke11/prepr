/** Domain types for prepr. */

export type CategoryName =
  | 'Produce'
  | 'Bakery'
  | 'Meat & Fish'
  | 'Dairy & Eggs'
  | 'Pantry'
  | 'Frozen'
  | 'Drinks'
  | 'Snacks'
  | 'Household';

export interface Category {
  name: CategoryName;
  color: string;
  tint: string;
}

/** A selectable item in the catalog (the "add items" palette). */
export interface CatalogItem {
  id: string;
  name: string;
  emoji: string;
  category: CategoryName;
}

/** An item that lives on the shopping list. */
export interface ListItem {
  key: string;
  name: string;
  emoji: string;
  category: CategoryName;
  qty: number;
  unit: string;
  checked: boolean;
  by: string;
  /** Optional free-text note, e.g. "organic", "for tacos". */
  spec?: string;
}

/** An ingredient line inside a recipe. */
export interface Ingredient {
  name: string;
  emoji: string;
  qty: number;
  unit: string;
  category: CategoryName;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  servings: number;
  time: string;
  ingredients: Ingredient[];
  steps: string[];
  /** Set on user-created recipes so they can be edited/deleted. */
  custom?: boolean;
  /** Recipe ids marked as favourites surface first. */
  favorite?: boolean;
}

export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type Plan = Record<DayKey, string[]>;

export interface Member {
  name: string;
  initial: string;
  color: string;
}

export type Tab = 'list' | 'recipes' | 'plan' | 'pantry';

export type ThemeMode = 'light' | 'dark';

/** The persisted slice of application state. */
export interface PersistedState {
  list: ListItem[];
  recipes: Recipe[];
  plan: Plan;
  pantry: string[];
  recents: string[];
  members: Member[];
  theme: ThemeMode;
}
