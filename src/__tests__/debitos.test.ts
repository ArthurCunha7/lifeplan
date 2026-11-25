import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../financas/financeState';
import { cfGetDebitosGroups, cfGetDebitosTotal, cfGetTableTotal } from '../financeFormulas';

describe('Débitos lançados por outra pessoa', () => {
  it('ficam fora do total das Faturas e aparecem agrupados por quem lançou', () => {
    const s = getDefaultState();
    expect(cfGetDebitosGroups(s as never)).toHaveLength(0);
    s.faturas = [
      { id: 'f1', name: 'Nubank', rows: [{ id: 'r1', date: '2026-11-01', name: 'Mercado', parcelas: '1/1', value: 100, profileIdx: 0, category: null }] },
      { id: 'family-x', family: true, who: 'Arthur', name: 'Em aberto · Arthur', rows: [{ id: 'fc-1', date: '2026-11-02', name: 'Luz', parcelas: '', value: 40, profileIdx: 0, category: null, family: true }] },
    ] as never;
    const fat = s.balancoTables.find(t => t.type === 'faturas_auto')!;
    expect(cfGetTableTotal(s as never, fat as never)).toBe(100);
    expect(cfGetDebitosTotal(s as never)).toBe(40);
    expect(cfGetDebitosGroups(s as never)[0].who).toBe('Arthur');
  });
});
