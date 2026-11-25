// src/financeFormulas.ts — Fórmulas financeiras compartilhadas (fonte única de verdade em TypeScript)
import type { BalancoTable, FinanceFormulasApi, FinanceRow, FinanceState } from './types';

export const FINANCE_FORMULAS_VERSION = 4;

export function cfGetAllRowsByProfile(state: FinanceState, pIdx: number): FinanceRow[] {
  const rows: FinanceRow[] = [];
  (state.faturas || []).forEach(f => {
    (f.rows || []).forEach(r => {
      if (r.profileIdx === pIdx) rows.push(r);
    });
  });
  (state.pixRows || []).forEach(p => {
    if (p.profileIdx === pIdx) rows.push(p);
  });
  return rows;
}

export function cfComputeEntradasTotal(state: FinanceState): number {
  let total = 0;
  const profiles = state.profiles || [];
  profiles.forEach((_p, idx) => {
    if (state.entradasProfiles && state.entradasProfiles[idx] === false) return;
    // Gastos lançados pelo líder do modo família no cartão dele (r.family) são gasto REAL
    // de quem recebe: nunca viram "entrada a receber", mesmo com o perfil marcado em Entradas.
    const rows = cfGetAllRowsByProfile(state, idx).filter(r => !r.family);
    const tg = rows.reduce((s, r) => s + (parseFloat(String(r.value ?? 0)) || 0), 0);
    const pays = (state.payments || []).filter(pay => pay.profileIdx === idx);
    const tp = pays.reduce((s, pay) => s + (parseFloat(String(pay.value ?? 0)) || 0), 0);
    total += (tp - tg) * -1;
  });
  return total;
}

export function cfComputeGastoCategoria(state: FinanceState, profileIdx: number, categoria: string): number {
  return cfGetAllRowsByProfile(state, profileIdx).reduce((total, r) => {
    return (r.category || '') === categoria ? total + (parseFloat(String(r.value ?? 0)) || 0) : total;
  }, 0);
}

/** Débitos: gastos que outra pessoa da família lançou para este usuário (faturas marcadas como family). */
export function cfGetDebitosGroups(state: FinanceState): Array<{ who: string; total: number; rows: Array<{ id: string; date: string; name: string; value: number; origem?: string }> }> {
  const by = new Map<string, { who: string; total: number; rows: Array<{ id: string; date: string; name: string; value: number; origem?: string }> }>();
  (state.faturas || []).filter(f => f.family).forEach(f => {
    const who = f.who || 'Família';
    const g = by.get(who) || { who, total: 0, rows: [] };
    (f.rows || []).forEach(r => {
      const v = parseFloat(String(r.value ?? 0)) || 0;
      g.total += v;
      g.rows.push({ id: String(r.id ?? ''), date: r.date || '', name: r.name || '', value: v, origem: (r as { faturaOrigem?: string }).faturaOrigem });
    });
    by.set(who, g);
  });
  return [...by.values()].filter(g => g.rows.length > 0);
}

export function cfGetDebitosTotal(state: FinanceState): number {
  return cfGetDebitosGroups(state).reduce((s, g) => s + g.total, 0);
}

export function cfGetTableTotal(state: FinanceState, t: BalancoTable): number {
  if (t.type === 'entradas') return cfComputeEntradasTotal(state);
  // Orçamento prospectivo é só previsão do próximo mês: nunca entra em soma nenhuma.
  if (t.type === 'lancamentos' || t.type === 'prospectivo') return 0;
  if (t.type === 'faturas_auto') {
    // Débitos lançados por outras pessoas têm linha própria no saldo: não entram aqui para não contar duas vezes.
    const faturasTotal = (state.faturas || []).filter(f => !f.family).reduce((s, f) =>
      s + (f.rows || []).reduce((s2, r) => s2 + (parseFloat(String(r.value ?? 0)) || 0), 0), 0);
    // Pix já saiu da conta: conta no gasto do perfil (cfGetAllRowsByProfile), mas NÃO entra no
    // total das faturas — não há nada a pagar depois.
    return faturasTotal;
  }
  if (t.type === 'saidas') {
    return (t.rows || []).reduce((s, r) => s + (parseFloat(String(r.values?.val ?? 0)) || 0), 0);
  }
  if (t.type === 'planejamento') {
    // O que a linha do Planejamento reserva no saldo: só o que AINDA FALTA gastar em cada categoria.
    return (t.rows || []).filter(r => r.categoria && r.profileIdx != null)
      .reduce((s, r) => s + Math.max(0, (parseFloat(String(r.valor ?? 0)) || 0) - cfComputeGastoCategoria(state, r.profileIdx as number, r.categoria as string)), 0);
  }
  const numCols = (t.columns || []).filter(c => c.type === 'number');
  if (!numCols.length) return 0;
  const valCol = numCols[0];
  return (t.rows || []).reduce((s, r) => s + (parseFloat(String(r.values?.[valCol.id] ?? 0)) || 0), 0);
}

export const FinanceFormulas: FinanceFormulasApi = {
  version: FINANCE_FORMULAS_VERSION,
  cfGetAllRowsByProfile,
  cfComputeEntradasTotal,
  cfComputeGastoCategoria,
  cfGetTableTotal,
};

if (typeof window !== 'undefined') {
  window.FinanceFormulas = FinanceFormulas;
}
