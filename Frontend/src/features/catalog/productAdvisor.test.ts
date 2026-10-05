import { describe, expect, it } from 'vitest';
import { recommendProducts } from './productAdvisor';
import type { HomeProductCard } from './catalogApiSlice';

const product = (id: string, overrides: Partial<HomeProductCard> = {}): HomeProductCard => ({
  id, productName: 'Laptop para estudio', slug: id, quantity: 2, price: 1200, discount: 0, image: '', categoryId: 1, ...overrides,
});
describe('Product advisor selection', () => {
  it('uses discounted prices, excludes unavailable items and orders affordable choices', () => {
    const items = [product('discount', { price: 1600, discount: 300 }), product('cheap'), product('out', { quantity: 0 }), product('expensive', { price: 1800 })];
    expect(recommendProducts(items, 1400, 'laptop', 'study').map(p => p.id)).toEqual(['cheap', 'discount']);
  });
  it('does not offer components or accessories as a laptop', () => {
    expect(recommendProducts([product('cpu', { productName: 'Procesador Ryzen' }), product('mouse', { productName: 'Mouse gamer' })], 1500, 'laptop', 'work')).toEqual([]);
  });
  it('requires a gaming clue in the actual product name', () => {
    expect(recommendProducts([product('basic', { categoryName: 'Gaming' }), product('game', { productName: 'Laptop Gaming RTX' })], 1500, 'laptop', 'gaming').map(p => p.id)).toEqual(['game']);
  });
  it('rejects invalid budgets and prices', () => {
    expect(recommendProducts([product('p')], NaN, 'laptop', 'study')).toEqual([]);
    expect(recommendProducts([product('p')], -1, 'laptop', 'study')).toEqual([]);
    expect(recommendProducts([product('p', { discount: 1300 })], 100, 'laptop', 'study')).toEqual([]);
  });
  it('returns at most three options', () => {
    expect(recommendProducts(['1', '2', '3', '4'].map(id => product(id)), 1500, 'laptop', 'study')).toHaveLength(3);
  });
});
