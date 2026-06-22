/** Supermarkets you can shop with — each gives a deep link to search its store. */
export interface Supermarket {
  id: string;
  name: string;
  /** A URL that searches this supermarket's groceries for a term. */
  searchUrl: (query: string) => string;
}

const enc = encodeURIComponent;

export const SUPERMARKETS: Supermarket[] = [
  {
    id: 'tesco',
    name: 'Tesco',
    searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${enc(q)}`,
  },
  {
    id: 'sainsburys',
    name: "Sainsbury's",
    searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${enc(q)}`,
  },
  {
    id: 'asda',
    name: 'Asda',
    searchUrl: (q) => `https://groceries.asda.com/search/${enc(q)}`,
  },
  {
    id: 'morrisons',
    name: 'Morrisons',
    searchUrl: (q) => `https://groceries.morrisons.com/search?entry=${enc(q)}`,
  },
  {
    id: 'waitrose',
    name: 'Waitrose',
    searchUrl: (q) => `https://www.waitrose.com/ecom/shop/search?&searchTerm=${enc(q)}`,
  },
  {
    id: 'ocado',
    name: 'Ocado',
    searchUrl: (q) => `https://www.ocado.com/search?entry=${enc(q)}`,
  },
  {
    id: 'aldi',
    name: 'Aldi',
    searchUrl: (q) => `https://groceries.aldi.co.uk/en-GB/Search?keywords=${enc(q)}`,
  },
];

export function supermarketById(
  id: string | null | undefined,
): Supermarket | undefined {
  return id ? SUPERMARKETS.find((s) => s.id === id) : undefined;
}
