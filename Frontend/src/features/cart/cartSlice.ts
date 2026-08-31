import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../catalog/catalogApiSlice';

export interface LocalCartItem extends Product {
  cartItemKey: string;
  productVariantId: string;
  cartQuantity: number;
  selectedSize: string;
  selectedColor: string;
  deliveryCode?: string;
}

interface CartState {
  items: LocalCartItem[];
  isOpen: boolean;
}

const initialState: CartState = {
  items: JSON.parse(localStorage.getItem('cart') || '[]'),
  isOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; productVariantId: string; selectedSize: string; selectedColor: string; deliveryCode?: string; quantity?: number }>) => {
      const { product, productVariantId, selectedSize, selectedColor, deliveryCode, quantity = 1 } = action.payload;
      const cartItemKey = `${product.id}:${productVariantId}`;
      const existingItem = state.items.find((item) => item.cartItemKey === cartItemKey);
      if (existingItem) {
        existingItem.cartQuantity += quantity;
      } else {
        state.items.push({
          ...product,
          cartItemKey,
          productVariantId,
          cartQuantity: quantity,
          selectedSize,
          selectedColor,
          deliveryCode,
        });
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.cartItemKey !== action.payload);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    updateQuantity: (state, action: PayloadAction<{ cartItemKey: string; quantity: number }>) => {
      const item = state.items.find((entry) => entry.cartItemKey === action.payload.cartItemKey);
      if (item) {
        item.cartQuantity = action.payload.quantity;
        if (item.cartQuantity <= 0) {
          state.items = state.items.filter((entry) => entry.cartItemKey !== action.payload.cartItemKey);
        }
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    clearCart: (state) => {
      state.items = [];
      localStorage.removeItem('cart');
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    setCartOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  toggleCart,
  setCartOpen,
} = cartSlice.actions;

export default cartSlice.reducer;

export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((total, item) => total + (item.price - item.discount) * item.cartQuantity, 0);
export const selectCartCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((count, item) => count + item.cartQuantity, 0);
