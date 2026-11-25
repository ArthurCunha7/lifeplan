import { describe, it, expect } from 'vitest';
import { sortByDateDesc } from '../financas/financeState';

describe('sortByDateDesc', () => {
  it('mais recente no topo; no mesmo dia o último lançado fica acima; sem data no topo', () => {
    const l = [
      { id: 'a', date: '2026-11-10' },
      { id: 'b', date: '2026-11-20' },
      { id: 'c', date: '2026-11-10' },
      { id: 'd', date: '' },
      { id: 'e', date: '2026-11-20' },
    ];
    expect(sortByDateDesc(l).map(x => x.id)).toEqual(['d', 'e', 'b', 'c', 'a']);
    expect(l.map(x => x.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
