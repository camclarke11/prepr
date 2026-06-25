import type {
  CatalogItem,
  CategoryName,
  Ingredient,
  ListItem,
  Plan,
  Recipe,
} from '../types';
import { idify } from '../theme';

function C(name: string, emoji: string, category: CategoryName): CatalogItem {
  return { id: idify(name), name, emoji, category };
}

/** The catalog is static reference data — the palette of items you can add. */
export const CATALOG: CatalogItem[] = [
  C('Bananas', '🍌', 'Produce'),
  C('Apples', '🍎', 'Produce'),
  C('Avocado', '🥑', 'Produce'),
  C('Tomatoes', '🍅', 'Produce'),
  C('Yellow Onion', '🧅', 'Produce'),
  C('Garlic', '🧄', 'Produce'),
  C('Lettuce', '🥬', 'Produce'),
  C('Carrots', '🥕', 'Produce'),
  C('Bell Pepper', '🫑', 'Produce'),
  C('Lemon', '🍋', 'Produce'),
  C('Lime', '🍈', 'Produce'),
  C('Cucumber', '🥒', 'Produce'),
  C('Broccoli', '🥦', 'Produce'),
  C('Potatoes', '🥔', 'Produce'),
  C('Mushrooms', '🍄', 'Produce'),
  C('Strawberries', '🍓', 'Produce'),
  C('Blueberries', '🫐', 'Produce'),
  C('Spinach', '🥬', 'Produce'),
  C('Ginger', '🫚', 'Produce'),
  C('Basil', '🌿', 'Produce'),
  C('Bread', '🍞', 'Bakery'),
  C('Bagels', '🥯', 'Bakery'),
  C('Tortillas', '🫓', 'Bakery'),
  C('Croissants', '🥐', 'Bakery'),
  C('Chicken Breast', '🍗', 'Meat & Fish'),
  C('Ground Beef', '🥩', 'Meat & Fish'),
  C('Salmon', '🐟', 'Meat & Fish'),
  C('Bacon', '🥓', 'Meat & Fish'),
  C('Shrimp', '🦐', 'Meat & Fish'),
  C('Tofu', '🧊', 'Meat & Fish'),
  C('Milk', '🥛', 'Dairy & Eggs'),
  C('Eggs', '🥚', 'Dairy & Eggs'),
  C('Butter', '🧈', 'Dairy & Eggs'),
  C('Cheese', '🧀', 'Dairy & Eggs'),
  C('Greek Yogurt', '🥣', 'Dairy & Eggs'),
  C('Feta', '🧀', 'Dairy & Eggs'),
  C('Pasta', '🍝', 'Pantry'),
  C('Rice', '🍚', 'Pantry'),
  C('Olive Oil', '🫒', 'Pantry'),
  C('Canned Tomatoes', '🥫', 'Pantry'),
  C('Black Beans', '🫘', 'Pantry'),
  C('Chickpeas', '🫘', 'Pantry'),
  C('Oats', '🌾', 'Pantry'),
  C('Flour', '🌾', 'Pantry'),
  C('Sugar', '🍬', 'Pantry'),
  C('Honey', '🍯', 'Pantry'),
  C('Peanut Butter', '🥜', 'Pantry'),
  C('Soy Sauce', '🍶', 'Pantry'),
  C('Coffee', '☕', 'Pantry'),
  C('Tea', '🍵', 'Pantry'),
  C('Salt', '🧂', 'Pantry'),
  C('Cereal', '🥣', 'Pantry'),
  C('Frozen Peas', '🫛', 'Frozen'),
  C('Ice Cream', '🍨', 'Frozen'),
  C('Frozen Berries', '🫐', 'Frozen'),
  C('Frozen Pizza', '🍕', 'Frozen'),
  C('Orange Juice', '🧃', 'Drinks'),
  C('Sparkling Water', '🥤', 'Drinks'),
  C('Beer', '🍺', 'Drinks'),
  C('Wine', '🍷', 'Drinks'),
  C('Tortilla Chips', '🌽', 'Snacks'),
  C('Dark Chocolate', '🍫', 'Snacks'),
  C('Crackers', '🍘', 'Snacks'),
  C('Cookies', '🍪', 'Snacks'),
  C('Almonds', '🥜', 'Snacks'),
  C('Popcorn', '🍿', 'Snacks'),
  C('Paper Towels', '🧻', 'Household'),
  C('Dish Soap', '🧴', 'Household'),
  C('Trash Bags', '🗑️', 'Household'),
  C('Sponges', '🧽', 'Household'),
  C('Laundry Detergent', '🧺', 'Household'),
];

function listItem(name: string, qty: number, by: string, checked = false): ListItem {
  const c = CATALOG.find((x) => x.name === name);
  return {
    key: idify(name),
    name,
    emoji: c ? c.emoji : '🛒',
    category: c ? c.category : 'Pantry',
    qty,
    unit: '',
    checked,
    by: by || 'You',
  };
}

function ing(
  name: string,
  emoji: string,
  qty: number,
  unit: string,
  category: CategoryName,
): Ingredient {
  return { name, emoji, qty, unit: unit || '', category };
}

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'tacos',
    name: 'Weeknight Tacos',
    emoji: '🌮',
    servings: 4,
    time: '25 min',
    ingredients: [
      ing('Ground Beef', '🥩', 1, 'lb', 'Meat & Fish'),
      ing('Tortillas', '🫓', 8, '', 'Bakery'),
      ing('Tomatoes', '🍅', 2, '', 'Produce'),
      ing('Lettuce', '🥬', 1, 'head', 'Produce'),
      ing('Cheese', '🧀', 1, 'cup', 'Dairy & Eggs'),
      ing('Yellow Onion', '🧅', 1, '', 'Produce'),
      ing('Avocado', '🥑', 2, '', 'Produce'),
      ing('Lime', '🍈', 1, '', 'Produce'),
    ],
    steps: [
      'Brown the ground beef with chopped onion over medium-high heat, 6–8 min.',
      'Season with salt, cumin and chili; add a splash of water and simmer 3 min.',
      'Warm the tortillas in a dry pan.',
      'Chop tomatoes and shred the lettuce.',
      'Build tacos and top with cheese, avocado and a squeeze of lime.',
    ],
  },
  {
    id: 'oats',
    name: 'Overnight Oats',
    emoji: '🥣',
    servings: 2,
    time: '5 min + overnight',
    ingredients: [
      ing('Oats', '🌾', 1, 'cup', 'Pantry'),
      ing('Milk', '🥛', 1, 'cup', 'Dairy & Eggs'),
      ing('Greek Yogurt', '🥣', 0.5, 'cup', 'Dairy & Eggs'),
      ing('Honey', '🍯', 2, 'tbsp', 'Pantry'),
      ing('Strawberries', '🍓', 1, 'cup', 'Produce'),
      ing('Peanut Butter', '🥜', 2, 'tbsp', 'Pantry'),
    ],
    steps: [
      'Combine oats, milk and yogurt in a jar.',
      'Stir in honey and peanut butter.',
      'Cover and refrigerate overnight.',
      'Top with sliced strawberries before serving.',
    ],
  },
  {
    id: 'chicken',
    name: 'Sheet-Pan Chicken',
    emoji: '🍗',
    servings: 4,
    time: '40 min',
    ingredients: [
      ing('Chicken Breast', '🍗', 4, '', 'Meat & Fish'),
      ing('Potatoes', '🥔', 4, '', 'Produce'),
      ing('Broccoli', '🥦', 1, 'head', 'Produce'),
      ing('Olive Oil', '🫒', 3, 'tbsp', 'Pantry'),
      ing('Garlic', '🧄', 4, 'clove', 'Produce'),
      ing('Lemon', '🍋', 1, '', 'Produce'),
    ],
    steps: [
      'Heat oven to 220°C / 425°F.',
      'Toss potatoes with olive oil, garlic, salt and pepper; roast 15 min.',
      'Add chicken and broccoli to the pan; squeeze over the lemon.',
      'Roast 20–25 min until the chicken is cooked through.',
    ],
  },
  {
    id: 'pesto',
    name: 'Pesto Pasta',
    emoji: '🍝',
    servings: 3,
    time: '20 min',
    ingredients: [
      ing('Pasta', '🍝', 12, 'oz', 'Pantry'),
      ing('Cheese', '🧀', 0.5, 'cup', 'Dairy & Eggs'),
      ing('Garlic', '🧄', 2, 'clove', 'Produce'),
      ing('Olive Oil', '🫒', 2, 'tbsp', 'Pantry'),
      ing('Basil', '🌿', 2, 'cup', 'Produce'),
      ing('Tomatoes', '🍅', 2, '', 'Produce'),
    ],
    steps: [
      'Boil pasta in well-salted water until al dente.',
      'Blend basil, garlic, cheese and olive oil into a pesto.',
      'Toss the drained pasta with the pesto.',
      'Top with halved cherry tomatoes.',
    ],
  },
  {
    id: 'greek',
    name: 'Greek Salad',
    emoji: '🥗',
    servings: 4,
    time: '15 min',
    ingredients: [
      ing('Cucumber', '🥒', 1, '', 'Produce'),
      ing('Tomatoes', '🍅', 3, '', 'Produce'),
      ing('Yellow Onion', '🧅', 0.5, '', 'Produce'),
      ing('Feta', '🧀', 1, 'cup', 'Dairy & Eggs'),
      ing('Olive Oil', '🫒', 3, 'tbsp', 'Pantry'),
      ing('Lemon', '🍋', 1, '', 'Produce'),
    ],
    steps: [
      'Chop cucumber, tomatoes and onion into chunks.',
      'Add cubed feta.',
      'Dress with olive oil, lemon, oregano, salt and pepper.',
      'Toss gently and serve.',
    ],
  },
];

export function seedList(): ListItem[] {
  return [
    listItem('Milk', 1, 'Sam'),
    listItem('Bananas', 1, 'You'),
    listItem('Coffee', 1, 'You'),
    listItem('Bread', 1, 'You'),
    listItem('Avocado', 2, 'You'),
    listItem('Eggs', 1, 'Sam'),
    listItem('Chicken Breast', 2, 'Sam'),
    listItem('Tomatoes', 4, 'You'),
  ];
}

export function seedPlan(): Plan {
  return {
    Mon: ['chicken'],
    Tue: [],
    Wed: ['tacos'],
    Thu: [],
    Fri: ['pesto'],
    Sat: [],
    Sun: ['greek'],
  };
}

export const SEED_PANTRY = ['Olive Oil', 'Salt', 'Garlic', 'Rice'];

export const SEED_RECENTS = [
  'avocado',
  'milk',
  'bananas',
  'eggs',
  'coffee',
  'tomatoes',
  'chicken-breast',
];

// Add-frequency for the sample dataset, so "the usual" has something to show.
export const SEED_FREQUENCY: Record<string, number> = {
  milk: 8,
  bananas: 6,
  eggs: 5,
  coffee: 5,
  avocado: 3,
  tomatoes: 3,
  'chicken-breast': 2,
};
