import { describe, expect, it } from 'vitest';
import { daysUntilVencimento, sortFaturasByVencimento } from '../financas/financeState';

describe('ordem das faturas por vencimento', () => {
  const today = new Date(2026, 10, 24); // 24/11/2026
  it('calcula dias até o próximo vencimento, virando o mês quando já passou', () => {
    expect(daysUntilVencimento('24', today)).toBe(0);
    expect(daysUntilVencimento('1', today)).toBe(7);
    expect(daysUntilVencimento('dia 4', today)).toBe(10);
    expect(daysUntilVencimento('29', today)).toBe(5);
    expect(daysUntilVencimento('', today)).toBe(Infinity);
  });
  it('ordena da mais próxima para a mais distante e deixa sem data por último', () => {
    const list = [{ n: 'sem' }, { n: 'a', vencimento: '4' }, { n: 'b', vencimento: '29' }, { n: 'c', vencimento: '1' }];
    expect(sortFaturasByVencimento(list, today).map(f => f.n)).toEqual(['b', 'c', 'a', 'sem']);
  });
});
