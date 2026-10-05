import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const COMPARE_KEY = 'urbaniq.compare.v1';
export function readCompareIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(COMPARE_KEY) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 100))].slice(0, 3) : [];
  } catch { return []; }
}

const compareSlice = createSlice({
  name: 'compare',
  initialState: { ids: readCompareIds() },
  reducers: {
    toggleCompare(state, action: PayloadAction<string>) {
      if (state.ids.includes(action.payload)) state.ids = state.ids.filter(id => id !== action.payload);
      else if (state.ids.length < 3) state.ids.push(action.payload);
    },
    removeCompare(state, action: PayloadAction<string>) {
      state.ids = state.ids.filter(id => id !== action.payload);
    },
    clearCompare(state) { state.ids = []; },
  },
});
export const { toggleCompare, removeCompare, clearCompare } = compareSlice.actions;
export default compareSlice.reducer;
