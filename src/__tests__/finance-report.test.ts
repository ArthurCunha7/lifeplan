import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../financas/financeState';
import { buildFinanceReportHtml } from '../financas/financeReport';

describe('relatório PDF de Finanças', () => {
  it('inclui as quatro seções e escapa HTML', () => {
    const st = getDefaultState();
    st.faturas = [{ id: 'f1', name: '<b>Nubank</b>', fechamento: '', vencimento: '', rows: [
      { id: 'r1', date: '2026-11-05', name: 'Mercado', parcelas: '1/1', value: 120.5, profileIdx: 0, category: null },
    ] }];
    const html = buildFinanceReportHtml(st, '21/11/2026');
    for (const t of ['Faturas', 'Pagamentos', 'Extrato por perfil', 'Balanço mensal']) expect(html).toContain(t);
    expect(html).toContain('&lt;b&gt;Nubank&lt;/b&gt;');
    expect(html).not.toContain('<b>Nubank</b>');
    expect(html).toContain('Gerado em 21/11/2026');
  });
});
