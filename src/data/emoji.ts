import type { CategoryName } from '../types';
import { CATEGORIES } from '../theme';

/** A pickable food/grocery emoji with search keywords and its category. */
export interface FoodEmoji {
  emoji: string;
  keywords: string[];
  category: CategoryName;
}

/**
 * A curated catalog of grocery emojis. Each entry carries keywords (so a typed
 * item name can suggest a matching emoji) and a category (so picking an emoji
 * also drops the item into a sensible, colour-coded group). Every emoji appears
 * once so the browse grid has no duplicates.
 */
export const FOOD_EMOJI: FoodEmoji[] = [
  // Produce
  {
    emoji: '🍎',
    keywords: ['apple', 'apples', 'red apple', 'fruit'],
    category: 'Produce',
  },
  {
    emoji: '🍏',
    keywords: ['green apple', 'apple', 'granny smith'],
    category: 'Produce',
  },
  { emoji: '🍐', keywords: ['pear', 'pears'], category: 'Produce' },
  {
    emoji: '🍊',
    keywords: ['orange', 'oranges', 'tangerine', 'mandarin', 'clementine', 'citrus'],
    category: 'Produce',
  },
  { emoji: '🍋', keywords: ['lemon', 'lemons', 'lime', 'citrus'], category: 'Produce' },
  { emoji: '🍌', keywords: ['banana', 'bananas'], category: 'Produce' },
  { emoji: '🍉', keywords: ['watermelon', 'melon'], category: 'Produce' },
  { emoji: '🍇', keywords: ['grapes', 'grape', 'raisins'], category: 'Produce' },
  {
    emoji: '🍓',
    keywords: ['strawberry', 'strawberries', 'berry', 'berries'],
    category: 'Produce',
  },
  {
    emoji: '🫐',
    keywords: ['blueberry', 'blueberries', 'berry', 'berries'],
    category: 'Produce',
  },
  { emoji: '🍈', keywords: ['melon', 'cantaloupe', 'honeydew'], category: 'Produce' },
  { emoji: '🍒', keywords: ['cherry', 'cherries'], category: 'Produce' },
  {
    emoji: '🍑',
    keywords: ['peach', 'peaches', 'nectarine', 'apricot'],
    category: 'Produce',
  },
  { emoji: '🥭', keywords: ['mango', 'mangoes'], category: 'Produce' },
  { emoji: '🍍', keywords: ['pineapple'], category: 'Produce' },
  { emoji: '🥥', keywords: ['coconut'], category: 'Produce' },
  { emoji: '🥝', keywords: ['kiwi', 'kiwifruit'], category: 'Produce' },
  { emoji: '🍅', keywords: ['tomato', 'tomatoes'], category: 'Produce' },
  { emoji: '🍆', keywords: ['eggplant', 'aubergine'], category: 'Produce' },
  { emoji: '🥑', keywords: ['avocado', 'avocados', 'guacamole'], category: 'Produce' },
  { emoji: '🥦', keywords: ['broccoli', 'cauliflower'], category: 'Produce' },
  {
    emoji: '🥬',
    keywords: ['lettuce', 'greens', 'cabbage', 'kale', 'spinach', 'salad', 'bok choy'],
    category: 'Produce',
  },
  {
    emoji: '🥒',
    keywords: ['cucumber', 'pickle', 'courgette', 'zucchini'],
    category: 'Produce',
  },
  {
    emoji: '🌶️',
    keywords: ['chilli', 'chili', 'hot pepper', 'spicy'],
    category: 'Produce',
  },
  { emoji: '🫑', keywords: ['bell pepper', 'pepper', 'capsicum'], category: 'Produce' },
  { emoji: '🌽', keywords: ['corn', 'sweetcorn', 'maize'], category: 'Produce' },
  { emoji: '🥕', keywords: ['carrot', 'carrots'], category: 'Produce' },
  { emoji: '🧄', keywords: ['garlic'], category: 'Produce' },
  { emoji: '🧅', keywords: ['onion', 'onions', 'shallot'], category: 'Produce' },
  { emoji: '🥔', keywords: ['potato', 'potatoes', 'spud'], category: 'Produce' },
  { emoji: '🍠', keywords: ['sweet potato', 'yam'], category: 'Produce' },
  {
    emoji: '🫛',
    keywords: ['peas', 'pea', 'green beans', 'edamame', 'beans'],
    category: 'Produce',
  },
  { emoji: '🍄', keywords: ['mushroom', 'mushrooms'], category: 'Produce' },
  { emoji: '🫚', keywords: ['ginger', 'turmeric', 'root'], category: 'Produce' },
  { emoji: '🥗', keywords: ['salad', 'greens', 'leaves'], category: 'Produce' },
  { emoji: '🌰', keywords: ['chestnut', 'nut'], category: 'Produce' },
  {
    emoji: '🌿',
    keywords: ['herbs', 'herb', 'basil', 'mint', 'parsley'],
    category: 'Produce',
  },

  // Bakery
  {
    emoji: '🍞',
    keywords: ['bread', 'loaf', 'toast', 'white bread'],
    category: 'Bakery',
  },
  { emoji: '🥖', keywords: ['baguette', 'french bread', 'bread'], category: 'Bakery' },
  { emoji: '🥐', keywords: ['croissant', 'pastry'], category: 'Bakery' },
  { emoji: '🥯', keywords: ['bagel', 'bagels'], category: 'Bakery' },
  {
    emoji: '🫓',
    keywords: ['flatbread', 'pita', 'naan', 'tortilla', 'wrap'],
    category: 'Bakery',
  },
  { emoji: '🥨', keywords: ['pretzel'], category: 'Bakery' },
  { emoji: '🧇', keywords: ['waffle', 'waffles'], category: 'Bakery' },
  { emoji: '🥞', keywords: ['pancake', 'pancakes', 'crepe'], category: 'Bakery' },
  { emoji: '🧁', keywords: ['cupcake', 'muffin', 'muffins'], category: 'Bakery' },
  { emoji: '🍰', keywords: ['cake', 'shortcake', 'slice'], category: 'Bakery' },
  { emoji: '🎂', keywords: ['cake', 'birthday cake'], category: 'Bakery' },
  { emoji: '🥧', keywords: ['pie', 'tart', 'quiche'], category: 'Bakery' },
  {
    emoji: '🍪',
    keywords: ['cookie', 'cookies', 'biscuit', 'biscuits'],
    category: 'Bakery',
  },
  { emoji: '🍩', keywords: ['donut', 'doughnut'], category: 'Bakery' },

  // Meat & Fish
  {
    emoji: '🥩',
    keywords: ['steak', 'beef', 'meat', 'red meat'],
    category: 'Meat & Fish',
  },
  {
    emoji: '🍗',
    keywords: ['chicken', 'poultry', 'drumstick', 'turkey'],
    category: 'Meat & Fish',
  },
  { emoji: '🍖', keywords: ['meat', 'pork', 'ribs', 'lamb'], category: 'Meat & Fish' },
  { emoji: '🥓', keywords: ['bacon'], category: 'Meat & Fish' },
  {
    emoji: '🌭',
    keywords: ['sausage', 'hot dog', 'hotdog', 'frankfurter'],
    category: 'Meat & Fish',
  },
  {
    emoji: '🍔',
    keywords: ['burger', 'hamburger', 'mince', 'ground beef'],
    category: 'Meat & Fish',
  },
  {
    emoji: '🐟',
    keywords: ['fish', 'salmon', 'cod', 'tuna', 'haddock'],
    category: 'Meat & Fish',
  },
  { emoji: '🦐', keywords: ['shrimp', 'prawn', 'prawns'], category: 'Meat & Fish' },
  { emoji: '🦀', keywords: ['crab'], category: 'Meat & Fish' },
  { emoji: '🦞', keywords: ['lobster'], category: 'Meat & Fish' },
  { emoji: '🦑', keywords: ['squid', 'calamari'], category: 'Meat & Fish' },
  { emoji: '🐙', keywords: ['octopus'], category: 'Meat & Fish' },
  {
    emoji: '🦪',
    keywords: ['oyster', 'oysters', 'clam', 'mussel', 'mussels'],
    category: 'Meat & Fish',
  },
  { emoji: '🍣', keywords: ['sushi', 'sashimi'], category: 'Meat & Fish' },

  // Dairy & Eggs
  {
    emoji: '🥛',
    keywords: ['milk', 'dairy', 'yogurt', 'yoghurt', 'cream'],
    category: 'Dairy & Eggs',
  },
  {
    emoji: '🧀',
    keywords: ['cheese', 'cheddar', 'parmesan', 'feta'],
    category: 'Dairy & Eggs',
  },
  { emoji: '🧈', keywords: ['butter', 'margarine'], category: 'Dairy & Eggs' },
  { emoji: '🥚', keywords: ['egg', 'eggs'], category: 'Dairy & Eggs' },
  { emoji: '🍳', keywords: ['fried egg', 'omelette', 'egg'], category: 'Dairy & Eggs' },

  // Pantry
  {
    emoji: '🧂',
    keywords: ['salt', 'seasoning', 'pepper', 'spice'],
    category: 'Pantry',
  },
  { emoji: '🍯', keywords: ['honey', 'syrup', 'maple'], category: 'Pantry' },
  {
    emoji: '🥫',
    keywords: ['can', 'canned', 'tin', 'tinned', 'soup', 'beans'],
    category: 'Pantry',
  },
  {
    emoji: '🫙',
    keywords: ['jar', 'jam', 'preserve', 'sauce', 'spread'],
    category: 'Pantry',
  },
  { emoji: '🍝', keywords: ['pasta', 'spaghetti', 'noodles'], category: 'Pantry' },
  { emoji: '🍚', keywords: ['rice', 'grain'], category: 'Pantry' },
  {
    emoji: '🍜',
    keywords: ['noodles', 'ramen', 'instant noodles'],
    category: 'Pantry',
  },
  {
    emoji: '🌾',
    keywords: ['flour', 'wheat', 'grain', 'oats', 'oatmeal', 'bran'],
    category: 'Pantry',
  },
  {
    emoji: '🫘',
    keywords: ['beans', 'lentils', 'legumes', 'chickpeas'],
    category: 'Pantry',
  },
  {
    emoji: '🥣',
    keywords: ['cereal', 'porridge', 'muesli', 'granola'],
    category: 'Pantry',
  },
  {
    emoji: '🫗',
    keywords: ['oil', 'olive oil', 'vinegar', 'dressing'],
    category: 'Pantry',
  },
  { emoji: '🫒', keywords: ['olive', 'olives'], category: 'Pantry' },
  {
    emoji: '🥜',
    keywords: ['peanut', 'peanuts', 'nuts', 'peanut butter'],
    category: 'Pantry',
  },
  { emoji: '🍲', keywords: ['soup', 'stew', 'broth', 'stock'], category: 'Pantry' },

  // Frozen
  { emoji: '🧊', keywords: ['ice', 'frozen', 'ice cubes'], category: 'Frozen' },
  { emoji: '🍦', keywords: ['ice cream', 'soft serve', 'frozen'], category: 'Frozen' },
  { emoji: '🍨', keywords: ['ice cream', 'gelato', 'frozen'], category: 'Frozen' },
  { emoji: '🍧', keywords: ['shaved ice', 'sorbet', 'frozen'], category: 'Frozen' },
  {
    emoji: '🥟',
    keywords: ['dumpling', 'dumplings', 'gyoza', 'potsticker'],
    category: 'Frozen',
  },
  { emoji: '🍕', keywords: ['pizza', 'frozen pizza'], category: 'Frozen' },
  { emoji: '🍟', keywords: ['fries', 'chips', 'french fries'], category: 'Frozen' },

  // Drinks
  { emoji: '☕', keywords: ['coffee', 'espresso', 'latte'], category: 'Drinks' },
  { emoji: '🍵', keywords: ['tea', 'green tea', 'matcha'], category: 'Drinks' },
  { emoji: '🧃', keywords: ['juice', 'juice box', 'apple juice'], category: 'Drinks' },
  {
    emoji: '🥤',
    keywords: ['soda', 'soft drink', 'cola', 'pop', 'drink'],
    category: 'Drinks',
  },
  { emoji: '🧋', keywords: ['boba', 'bubble tea', 'milk tea'], category: 'Drinks' },
  { emoji: '🍷', keywords: ['wine', 'red wine', 'white wine'], category: 'Drinks' },
  { emoji: '🍺', keywords: ['beer', 'ale', 'lager'], category: 'Drinks' },
  { emoji: '🥂', keywords: ['champagne', 'prosecco', 'sparkling'], category: 'Drinks' },
  { emoji: '🍸', keywords: ['cocktail', 'martini'], category: 'Drinks' },
  {
    emoji: '🥃',
    keywords: ['whiskey', 'whisky', 'bourbon', 'spirits'],
    category: 'Drinks',
  },
  {
    emoji: '💧',
    keywords: ['water', 'still water', 'sparkling water'],
    category: 'Drinks',
  },

  // Snacks
  { emoji: '🍿', keywords: ['popcorn'], category: 'Snacks' },
  {
    emoji: '🍫',
    keywords: ['chocolate', 'choc', 'cocoa', 'candy bar'],
    category: 'Snacks',
  },
  { emoji: '🍬', keywords: ['candy', 'sweets', 'sweet'], category: 'Snacks' },
  { emoji: '🍭', keywords: ['lollipop', 'lolly'], category: 'Snacks' },
  { emoji: '🍮', keywords: ['pudding', 'custard', 'flan'], category: 'Snacks' },
  { emoji: '🥠', keywords: ['fortune cookie', 'cracker'], category: 'Snacks' },
  { emoji: '🍡', keywords: ['mochi', 'dango'], category: 'Snacks' },
  { emoji: '🍘', keywords: ['rice cracker', 'crackers'], category: 'Snacks' },

  // Household
  {
    emoji: '🧻',
    keywords: ['toilet paper', 'paper towel', 'kitchen roll', 'tissue'],
    category: 'Household',
  },
  { emoji: '🧼', keywords: ['soap', 'hand soap', 'dish soap'], category: 'Household' },
  { emoji: '🧽', keywords: ['sponge', 'scourer'], category: 'Household' },
  {
    emoji: '🧴',
    keywords: ['lotion', 'shampoo', 'detergent', 'conditioner', 'bottle'],
    category: 'Household',
  },
  { emoji: '🧹', keywords: ['broom', 'sweep'], category: 'Household' },
  { emoji: '🧺', keywords: ['laundry', 'basket', 'hamper'], category: 'Household' },
  { emoji: '🪥', keywords: ['toothbrush'], category: 'Household' },
  { emoji: '🪒', keywords: ['razor', 'shaving'], category: 'Household' },
  { emoji: '🕯️', keywords: ['candle'], category: 'Household' },
  { emoji: '💡', keywords: ['light bulb', 'bulb', 'lightbulb'], category: 'Household' },
  { emoji: '🔋', keywords: ['battery', 'batteries'], category: 'Household' },
  {
    emoji: '🗑️',
    keywords: ['bin bags', 'trash bags', 'garbage', 'rubbish'],
    category: 'Household',
  },
  { emoji: '🪣', keywords: ['bucket', 'pail'], category: 'Household' },
  { emoji: '🧤', keywords: ['gloves', 'rubber gloves'], category: 'Household' },
];

const CATEGORY_BY_EMOJI = new Map(FOOD_EMOJI.map((f) => [f.emoji, f.category]));

/** The category an emoji belongs to, if it's one of the known food emojis. */
export function categoryForEmoji(emoji: string): CategoryName | undefined {
  return CATEGORY_BY_EMOJI.get(emoji);
}

/** The food emojis grouped by category, in the app's category order. */
export const FOOD_EMOJI_BY_CATEGORY: { category: CategoryName; items: FoodEmoji[] }[] =
  CATEGORIES.map((c) => ({
    category: c.name,
    items: FOOD_EMOJI.filter((f) => f.category === c.name),
  })).filter((g) => g.items.length > 0);

/**
 * Suggest emojis for a typed item name. Scores each emoji's keywords against the
 * query (whole-phrase and per-word), returns the best unique matches.
 */
export function suggestEmoji(query: string, max = 8): FoodEmoji[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  if (!tokens.length) return [];

  const scored = FOOD_EMOJI.map((f) => {
    let score = 0;
    if (f.keywords.includes(q)) score += 6; // exact whole-phrase match
    for (const token of tokens) {
      for (const kw of f.keywords) {
        if (kw === token) score += 4;
        else if (kw.startsWith(token) || token.startsWith(kw)) score += 2;
        else if (kw.includes(token)) score += 1;
      }
    }
    return { f, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: FoodEmoji[] = [];
  for (const { f } of scored) {
    if (seen.has(f.emoji)) continue;
    seen.add(f.emoji);
    out.push(f);
    if (out.length >= max) break;
  }
  return out;
}
