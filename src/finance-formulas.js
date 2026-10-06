// ══════════════════════════════════════════════════════════════════════════
// FÓRMULAS FINANCEIRAS COMPARTILHADAS — fonte única de verdade
// ══════════════════════════════════════════════════════════════════════════
// Usado tanto pelo app de Finanças de verdade (controle-financeiro.html)
// quanto pela prévia da Início (App.jsx, via window.FinanceFormulas depois
// de carregado por um <script> normal). Antes, essas contas existiam
// duplicadas nos dois lugares — e já divergiram de verdade uma vez (o
// "Saldo do Mês" da Início não batia com o de Finanças). Agora existe só
// uma versão: mude aqui, e os dois lugares acompanham automaticamente.
//
// Escrito como JavaScript puro (sem import/export de módulo ES) de propósito
// — assim um <script src="/finance-formulas.js"> comum funciona tanto numa
// página HTML simples quanto carregado antes do bundle do React.
(function (global) {
  'use strict';

  function cfGetAllRowsByProfile(state, pIdx) {
    const rows = [];
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

  function cfComputeEntradasTotal(state) {
    let total = 0;
    const profiles = state.profiles || [];
    profiles.forEach((p, idx) => {
      if (state.entradasProfiles && state.entradasProfiles[idx] === false) return;
      const rows = cfGetAllRowsByProfile(state, idx);
      const tg = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
      const pays = (state.payments || []).filter(pay => pay.profileIdx === idx);
      const tp = pays.reduce((s, pay) => s + (parseFloat(pay.value) || 0), 0);
      total += (tp - tg) * -1;
    });
    return total;
  }

  function cfComputeGastoCategoria(state, profileIdx, categoria) {
    let total = 0;
    (state.faturas || []).forEach(f => {
      (f.rows || []).forEach(r => {
        if (r.profileIdx === profileIdx && (r.category || '') === categoria) {
          total += parseFloat(r.value) || 0;
        }
      });
    });
    return total;
  }

  function cfGetTableTotal(state, t) {
    if (t.type === 'entradas') return cfComputeEntradasTotal(state);
    if (t.type === 'lancamentos') return 0;
    if (t.type === 'faturas_auto') {
      const faturasTotal = (state.faturas || []).reduce((s, f) =>
        s + (f.rows || []).reduce((s2, r) => s2 + (parseFloat(r.value) || 0), 0), 0);
      const pixTotal = (state.pixRows || []).reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
      return faturasTotal + pixTotal;
    }
    if (t.type === 'planejamento') {
      return (t.rows || []).filter(r => r.categoria && r.profileIdx != null)
        .reduce((s, r) => s + ((parseFloat(r.valor) || 0) - cfComputeGastoCategoria(state, r.profileIdx, r.categoria)), 0);
    }
    const numCols = (t.columns || []).filter(c => c.type === 'number');
    if (!numCols.length) return 0;
    const valCol = numCols[0];
    return (t.rows || []).reduce((s, r) => s + (parseFloat(r.values && r.values[valCol.id]) || 0), 0);
  }

  global.FinanceFormulas = {
    cfGetAllRowsByProfile,
    cfComputeEntradasTotal,
    cfComputeGastoCategoria,
    cfGetTableTotal,
  };
})(typeof window !== 'undefined' ? window : globalThis);
