import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './apiSlice';
import authReducer from '@/features/auth/authSlice';
import cartReducer from '@/features/cart/cartSlice';
import compareReducer, { COMPARE_KEY } from '@/features/catalog/compareSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    cart: cartReducer,
    compare: compareReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});

setupListeners(store.dispatch);

let previousCompare = store.getState().compare;
store.subscribe(() => {
  const current = store.getState().compare;
  if (current !== previousCompare) {
    previousCompare = current;
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(current.ids)); } catch { /* Selection still works without browser storage. */ }
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
