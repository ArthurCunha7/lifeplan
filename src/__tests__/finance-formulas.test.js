import { describe, it, expect } from 'vitest';
import {
  cfGetAllRowsByProfile,
  cfComputeEntradasTotal,
  cfComputeGastoCategoria,
  cfGetTableTotal,
} from '../App.jsx';

// Estas funções replicam, no app React (tela Início), as mesmas fórmulas
// usadas de verdade dentro do app de Finanças. Já tivemos um bug real onde
// as duas fórmulas divergiam — estes testes existem pra isso nunca mais
// passar despercebido.

function makeState(overrides = {}) {
  return {
    profiles: ['Arthur', 'Maria'],
    faturas: [],
    pixRows: [],
    payments: [],
    balancoTables: [],
    entradasProfiles: {},
    ...overrides,
  };
}

describe('cfGetAllRowsByProfile', () => {
  it('retorna só as linhas de fatura do perfil pedido', () => {
    const state = makeState({
      faturas: [
        { id: 'f1', rows: [
          { id: 'r1', profileIdx: 0, value: 100 },
          { id: 'r2', profileIdx: 1, value: 50 },
        ]},
      ],
    });
    const rows = cfGetAllRowsByProfile(state, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('r1');
  });

  it('inclui linhas do pix atribuídas ao perfil', () => {
    const state = makeState({
      pixRows: [{ id: 'p1', profileIdx: 0, value: 30 }],
    });
    const rows = cfGetAllRowsByProfile(state, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(30);
  });

  it('não inclui linhas sem perfil atribuído', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [{ id: 'r1', profileIdx: null, value: 100 }] }],
    });
    expect(cfGetAllRowsByProfile(state, 0)).toHaveLength(0);
  });
});

describe('cfComputeEntradasTotal', () => {
  it('calcula (pago - gasto) * -1 por perfil e soma todos', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [{ id: 'r1', profileIdx: 0, value: 100 }] }],
      payments: [{ profileIdx: 0, value: 60 }],
    });
    // perfil 0: pago=60, gasto=100 -> (60-100)*-1 = 40
    // perfil 1: sem gasto nem pagamento -> 0
    expect(cfComputeEntradasTotal(state)).toBe(40);
  });

  it('ignora perfis desmarcados em entradasProfiles', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [{ id: 'r1', profileIdx: 0, value: 100 }] }],
      payments: [{ profileIdx: 0, value: 60 }],
      entradasProfiles: { 0: false },
    });
    expect(cfComputeEntradasTotal(state)).toBe(0);
  });
});

describe('cfComputeGastoCategoria', () => {
  it('soma só os gastos da categoria e perfil certos', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [
        { profileIdx: 0, value: 50, category: 'Restaurantes' },
        { profileIdx: 0, value: 20, category: 'Uber' },
        { profileIdx: 1, value: 999, category: 'Restaurantes' },
      ]}],
    });
    expect(cfComputeGastoCategoria(state, 0, 'Restaurantes')).toBe(50);
  });

  it('retorna 0 quando não há gastos na categoria', () => {
    const state = makeState();
    expect(cfComputeGastoCategoria(state, 0, 'Academia')).toBe(0);
  });
});

describe('cfGetTableTotal — cada tipo de tabela do Balanço Mensal', () => {
  it('tabela "lancamentos" nunca soma pro saldo (é só informativa)', () => {
    const state = makeState();
    const t = { type: 'lancamentos' };
    expect(cfGetTableTotal(state, t)).toBe(0);
  });

  it('tabela "entradas" usa a fórmula de pago-menos-gasto por perfil', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [{ profileIdx: 0, value: 100 }] }],
      payments: [{ profileIdx: 0, value: 100 }],
    });
    // pago == gasto -> saldo zero
    expect(cfGetTableTotal(state, { type: 'entradas' })).toBe(0);
  });

  it('tabela "planejamento" soma o "restante" (expectativa - gasto) só das linhas válidas', () => {
    const state = makeState({
      faturas: [{ id: 'f1', rows: [{ profileIdx: 0, value: 50, category: 'Restaurantes' }] }],
    });
    const t = {
      type: 'planejamento',
      rows: [
        { categoria: 'Restaurantes', profileIdx: 0, valor: 200 }, // restante = 200-50 = 150
        { categoria: 'Academia', profileIdx: 0, valor: 100 },      // sem gasto -> restante = 100
        { categoria: '', profileIdx: 0, valor: 999 },              // sem categoria -> ignorada
        { categoria: 'Uber', profileIdx: null, valor: 999 },       // sem perfil -> ignorada
      ],
    };
    expect(cfGetTableTotal(state, t)).toBe(250);
  });

  it('tabela "faturas_auto" soma o total de todas as faturas de verdade, sempre atualizado', () => {
    const state = makeState({
      faturas: [
        { id: 'f1', rows: [{ value: 100 }, { value: 50 }] },
        { id: 'f2', rows: [{ value: 30 }] },
      ],
    });
    expect(cfGetTableTotal(state, { type: 'faturas_auto' })).toBe(180);
  });

  it('tabela "custom" soma a primeira coluna numérica de todas as linhas', () => {
    const state = makeState();
    const t = {
      type: 'custom',
      columns: [{ id: 'nome', type: 'text' }, { id: 'val', type: 'number' }],
      rows: [
        { values: { nome: 'Aluguel', val: 1200 } },
        { values: { nome: 'Luz', val: 180 } },
      ],
    };
    expect(cfGetTableTotal(state, t)).toBe(1380);
  });

  it('tabela "custom" sem coluna numérica retorna 0 (não quebra)', () => {
    const state = makeState();
    const t = { type: 'custom', columns: [{ id: 'nome', type: 'text' }], rows: [{ values: { nome: 'x' } }] };
    expect(cfGetTableTotal(state, t)).toBe(0);
  });
});
