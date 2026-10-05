import type { HomeProductCard } from './catalogApiSlice';

export type AdvisorUse = 'study' | 'work' | 'gaming';
export type AdvisorFamily = 'laptop' | 'monitor' | 'accessory';
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const families: Record<AdvisorFamily, RegExp> = {
  laptop: /\blaptop\b|\bnotebook\b|\bportatil\b|\bmacbook\b/,
  monitor: /\bmonitor(?:es)?\b/,
  accessory: /\bmouse\b|\bteclado\b|\bauricular(?:es)?\b|\bheadset\b|\bwebcam\b/,
};
export function recommendProducts(products: HomeProductCard[], budget: number, family: AdvisorFamily, use: AdvisorUse) {
  if (!Number.isFinite(budget) || budget <= 0) return [];
  return products.filter(p => {
    const text = normal(`${p.productName} ${p.categoryName ?? ''} ${p.subCategoryName ?? ''}`);
    const price = p.price - p.discount;
    return p.quantity > 0 && Number.isFinite(price) && price >= 0 && price <= budget && families[family].test(text)
      && (use !== 'gaming' || /\bgaming\b|\bgamer\b|\brtx\b|\bradeon\b/.test(normal(p.productName)));
  }).sort((a, b) => (a.price - a.discount) - (b.price - b.discount) || a.productName.localeCompare(b.productName)).slice(0, 3);
}
