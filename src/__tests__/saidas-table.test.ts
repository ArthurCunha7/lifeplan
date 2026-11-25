import { describe, it, expect } from 'vitest';
import { getDefaultState, migrateFinanceState } from '../financas/financeState';
import { cfGetTableTotal } from '../financeFormulas';

describe('tabela Saídas', () => {
  it('existe por padrão, desconta do saldo (sign -1) e soma as linhas', () => {
    const s = getDefaultState();
    const t = s.balancoTables.find(x => x.type === 'saidas')!;
    expect(t).toBeTruthy();
    expect(t.sign).toBe(-1);
    expect(t.includeInSaldo).toBe(true);
    t.rows = [
      { id: 'a', values: { nome: 'Luz', val: 100 } },
      { id: 'b', values: { nome: 'Água', val: 50.5 } },
    ];
    expect(cfGetTableTotal(s as never, t as never)).toBeCloseTo(150.5);
  });
  it('é adicionada em contas antigas pela migração, uma única vez', () => {
    const old = getDefaultState();
    old.balancoTables = old.balancoTables.filter(t => t.type !== 'saidas');
    (old as { _migratedSaidasV1?: boolean })._migratedSaidasV1 = false;
    const m = migrateFinanceState(old as never);
    expect(m.balancoTables.filter(t => t.type === 'saidas')).toHaveLength(1);
    const m2 = migrateFinanceState(m as never);
    expect(m2.balancoTables.filter(t => t.type === 'saidas')).toHaveLength(1);
  });
});
