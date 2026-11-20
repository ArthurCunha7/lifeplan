// src/__tests__/financas.test.ts — Testes unitários para o módulo nativo de Finanças
import { describe, it, expect } from 'vitest';
import {
  getDefaultState,
  migrateFinanceState,
  getActiveProfiles,
  getAllRowsByProfileDetailed,
  getAllTransactionsByProfile,
} from '../financas/financeState';

describe('Finance State Management', () => {
  it('creates default finance state with profiles, faturas, and balanco tables', () => {
    const s = getDefaultState();
    expect(s.profiles.length).toBeGreaterThan(0);
    expect(s.activeProfiles).toBeGreaterThan(0);
    expect(s.faturas.length).toBeGreaterThan(0);
    expect(s.balancoTables.length).toBeGreaterThan(0);
  });

  it('migrates legacy finance state adding missing arrays', () => {
    const legacy = {
      faturas: [
        {
          id: 'fat1',
          name: 'Nubank',
          rows: [
            { id: 'r1', date: '2026-11-20', name: 'Mercado', parcelas: '1/1', value: 150, profileIdx: 0 },
          ],
        },
      ],
    };
    const s = migrateFinanceState(legacy);
    expect(s.profiles).toBeDefined();
    expect(s.activeProfiles).toBeGreaterThanOrEqual(1);
    expect(s.pixRows).toBeDefined();
    expect(s.payments).toBeDefined();
    expect(s.faturas[0].name).toBe('Nubank');
  });

  it('filters active profiles correctly', () => {
    const s = getDefaultState();
    s.profiles.push({ name: 'Perfil 2', linkedUserId: null });
    s.activeProfiles = 2;
    const active = getActiveProfiles(s);
    expect(active).toHaveLength(2);
    expect(active[0].idx).toBe(0);
    expect(active[1].idx).toBe(1);
  });
});

describe('Finance Computations by Profile', () => {
  it('aggregates expenses across faturas and pix for a specific profile', () => {
    const s = getDefaultState();
    s.faturas = [
      {
        id: 'f1',
        name: 'Cartão 1',
        rows: [
          { id: 'r1', date: '2026-11-10', name: 'Item 1', parcelas: '1/1', value: 100, profileIdx: 0, category: 'Alimentação' },
          { id: 'r2', date: '2026-11-11', name: 'Item 2', parcelas: '1/1', value: 200, profileIdx: 1, category: 'Lazer' },
        ],
      },
    ];
    s.pixRows = [
      { id: 'p1', date: '2026-11-12', desc: 'Pix Padaria', value: 30, profileIdx: 0, category: 'Alimentação' },
    ];

    const p0Expenses = getAllRowsByProfileDetailed(s, 0);
    expect(p0Expenses).toHaveLength(2);
    const sum0 = p0Expenses.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    expect(sum0).toBe(130);

    const p1Expenses = getAllRowsByProfileDetailed(s, 1);
    expect(p1Expenses).toHaveLength(1);
    expect(Number(p1Expenses[0].value)).toBe(200);
  });

  it('aggregates transactions including expenses and payments for a profile', () => {
    const s = getDefaultState();
    s.faturas = [
      {
        id: 'f1',
        name: 'Nubank',
        rows: [
          { id: 'r1', date: '2026-11-10', name: 'Farmácia', parcelas: '1/1', value: 80, profileIdx: 0, category: 'Saúde' },
        ],
      },
    ];
    s.pixRows = [];
    s.payments = [
      { id: 'pay1', date: '2026-11-15', desc: 'Pagamento Parcial', value: 50, profileIdx: 0 },
    ];

    const txs = getAllTransactionsByProfile(s, 0);
    expect(txs).toHaveLength(2);
    expect(txs.some(t => t.txKind === 'expense')).toBe(true);
    expect(txs.some(t => t.txKind === 'payment')).toBe(true);
  });
});
