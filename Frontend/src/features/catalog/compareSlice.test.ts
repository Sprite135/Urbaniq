import { afterEach, describe, expect, it } from 'vitest';
import reducer, { COMPARE_KEY, clearCompare, readCompareIds, removeCompare, toggleCompare } from './compareSlice';

afterEach(() => localStorage.removeItem(COMPARE_KEY));
describe('Comparison selection', () => {
  it('limits selection to three and allows replacing a removed product', () => {
    let state = { ids: [] as string[] };
    for (const id of ['a', 'b', 'c', 'd']) state = reducer(state, toggleCompare(id));
    expect(state.ids).toEqual(['a', 'b', 'c']);
    state = reducer(state, removeCompare('b'));
    state = reducer(state, toggleCompare('d'));
    expect(state.ids).toEqual(['a', 'c', 'd']);
    expect(reducer(state, clearCompare()).ids).toEqual([]);
  });
  it('toggles an existing product without duplicating it', () => {
    expect(reducer({ ids: ['a'] }, toggleCompare('a')).ids).toEqual([]);
  });
  it('recovers safely from malformed saved selections', () => {
    localStorage.setItem(COMPARE_KEY, '{bad');
    expect(readCompareIds()).toEqual([]);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(['a', 'a', null, '', 'b', 'c', 'd']));
    expect(readCompareIds()).toEqual(['a', 'b', 'c']);
  });
});
