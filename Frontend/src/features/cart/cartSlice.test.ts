import { describe, expect, it, beforeEach } from 'vitest';
import cartReducer, {
  addToCart,
  clearCart,
  removeFromCart,
  selectCartCount,
  selectCartTotal,
  updateQuantity,
} from './cartSlice';
import type { Product } from '../catalog/catalogApiSlice';

const sampleProduct: Product = {
  id: 'prod-1',
  productName: 'Test Shirt',
  sku: 'SKU-1',
  slug: 'test-shirt',
  price: 1000,
  discount: 100,
  quantity: 10,
  description: 'Test product',
  image: 'https://example.com/shirt.jpg',
  images: [],
  imagesByColor: {},
  imageEntries: [],
  size: 'M',
  color: 'Black',
  availableSizes: ['M'],
  availableColors: ['Black'],
  deliverableZones: ['673001'],
  variants: [],
  categoryId: 1,
  categoryName: 'Shirts',
};

describe('cartSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a new line item with variant metadata', () => {
    const state = cartReducer(
      undefined,
      addToCart({
        product: sampleProduct,
        productVariantId: 'variant-1',
        selectedSize: 'M',
        selectedColor: 'Black',
        deliveryCode: '673001',
      })
    );

    expect(state.items).toHaveLength(1);
    expect(state.items[0].cartQuantity).toBe(1);
    expect(state.items[0].productVariantId).toBe('variant-1');
    expect(selectCartCount({ cart: state })).toBe(1);
    expect(selectCartTotal({ cart: state })).toBe(900);
  });

  it('increments quantity for the same variant key', () => {
    const first = cartReducer(
      undefined,
      addToCart({
        product: sampleProduct,
        productVariantId: 'variant-1',
        selectedSize: 'M',
        selectedColor: 'Black',
      })
    );
    const second = cartReducer(
      first,
      addToCart({
        product: sampleProduct,
        productVariantId: 'variant-1',
        selectedSize: 'M',
        selectedColor: 'Black',
      })
    );

    expect(second.items).toHaveLength(1);
    expect(second.items[0].cartQuantity).toBe(2);
    expect(selectCartCount({ cart: second })).toBe(2);
  });

  it('removes items and clears cart', () => {
    const withItem = cartReducer(
      undefined,
      addToCart({
        product: sampleProduct,
        productVariantId: 'variant-1',
        selectedSize: 'M',
        selectedColor: 'Black',
      })
    );
    const cartItemKey = withItem.items[0].cartItemKey;

    const removed = cartReducer(withItem, removeFromCart(cartItemKey));
    expect(removed.items).toHaveLength(0);

    const cleared = cartReducer(withItem, clearCart());
    expect(cleared.items).toHaveLength(0);
    expect(localStorage.getItem('cart')).toBeNull();
  });

  it('drops line items when quantity is set to zero', () => {
    const withItem = cartReducer(
      undefined,
      addToCart({
        product: sampleProduct,
        productVariantId: 'variant-1',
        selectedSize: 'M',
        selectedColor: 'Black',
      })
    );

    const updated = cartReducer(
      withItem,
      updateQuantity({ cartItemKey: withItem.items[0].cartItemKey, quantity: 0 })
    );

    expect(updated.items).toHaveLength(0);
  });
});
