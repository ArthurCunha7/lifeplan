// src/financas/financeReport.ts — extrato financeiro em PDF (imprimir → "Salvar como PDF").
// Port do relatório do Finanças antigo: faturas, pagamentos, extrato por perfil e balanço.
// O relatório sai sempre com os valores reais, mesmo com os valores ocultos na tela.
import type { FinanceAppState } from './financeTypes';
import { fmtRaw, formatDateBR } from './FinanceIcons';
import { getActiveProfiles, getAllRowsByProfileDetailed } from './financeState';
import { cfGetTableTotal } from '../financeFormulas';

const esc = (v: unknown): string =>
  String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const num = (v: unknown): number => parseFloat(String(v)) || 0;
const sign = (n: number) => (n >= 0 ? 'pdf-pos' : 'pdf-neg');

const REPORT_CSS = `
  @page { margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 8px; color: #1a1a1a; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .pdf-subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
  h2 { font-size: 16px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #333; }
  h3 { font-size: 13px; margin: 14px 0 6px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
  th { background: #eee; }
  tr { page-break-inside: avoid; }
  .pdf-total-row td { font-weight: bold; background: #f7f7f7; }
  .pdf-neg { color: #b03a2e; }
  .pdf-pos { color: #1e7a3c; }
  .pdf-empty { font-size: 12px; color: #777; margin-bottom: 10px; }
`;

export function buildFinanceReportHtml(state: FinanceAppState, today = new Date().toLocaleDateString('pt-BR')): string {
  const profileName = (idx: number | null | undefined) => (idx != null ? state.profiles[idx]?.name || '—' : '—');
  let h = `<h1>Extrato financeiro</h1><div class="pdf-subtitle">Gerado em ${esc(today)} — LifePlan</div>`;

  h += '<h2>Faturas</h2>';
  if (!state.faturas.length) h += '<div class="pdf-empty">Nenhuma fatura cadastrada.</div>';
  state.faturas.forEach(f => {
    const total = f.rows.reduce((s, r) => s + num(r.value), 0);
    h += `<h3>${esc(f.name)} — Total: ${fmtRaw(total)}</h3>`;
    if (!f.rows.length) { h += '<div class="pdf-empty">Sem lançamentos.</div>'; return; }
    h += '<table><thead><tr><th>Data</th><th>Descrição</th><th>Parcelas</th><th>Perfil</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>';
    f.rows.forEach(r => {
      h += `<tr><td>${esc(formatDateBR(r.date) || '—')}</td><td>${esc(r.name || '—')}</td><td>${esc(r.parcelas || '—')}</td><td>${esc(profileName(r.profileIdx))}</td><td>${esc(r.category || '—')}</td><td>${fmtRaw(r.value)}</td></tr>`;
    });
    h += `<tr class="pdf-total-row"><td colspan="5">Total</td><td>${fmtRaw(total)}</td></tr></tbody></table>`;
  });

  h += '<h2>Pagamentos</h2>';
  const totalPago = state.payments.reduce((s, p) => s + num(p.value), 0);
  if (!state.payments.length) h += '<div class="pdf-empty">Nenhum pagamento no extrato.</div>';
  else {
    h += '<table><thead><tr><th>Data</th><th>Descrição</th><th>Perfil</th><th>Valor</th></tr></thead><tbody>';
    [...state.payments].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(p => {
      h += `<tr><td>${esc(formatDateBR(p.date) || '—')}</td><td>${esc(p.desc || '—')}</td><td>${esc(profileName(p.profileIdx))}</td><td class="pdf-pos">${fmtRaw(p.value)}</td></tr>`;
    });
    h += `<tr class="pdf-total-row"><td colspan="3">Total pago</td><td>${fmtRaw(totalPago)}</td></tr></tbody></table>`;
  }

  h += '<h2>Extrato por perfil</h2><table><thead><tr><th>Perfil</th><th>Total gastos</th><th>Total pago</th><th>Saldo</th></tr></thead><tbody>';
  let gtGastos = 0, gtPago = 0;
  getActiveProfiles(state).forEach(({ name, idx }) => {
    const tg = getAllRowsByProfileDetailed(state, idx).reduce((s, r) => s + num(r.value), 0);
    const tp = state.payments.filter(p => p.profileIdx === idx).reduce((s, p) => s + num(p.value), 0);
    gtGastos += tg; gtPago += tp;
    h += `<tr><td>${esc(name)}</td><td class="pdf-neg">${fmtRaw(tg)}</td><td class="pdf-pos">${fmtRaw(tp)}</td><td class="${sign(tp - tg)}">${fmtRaw(tp - tg)}</td></tr>`;
  });
  h += `<tr class="pdf-total-row"><td>Total geral</td><td>${fmtRaw(gtGastos)}</td><td>${fmtRaw(gtPago)}</td><td>${fmtRaw(gtPago - gtGastos)}</td></tr></tbody></table>`;

  h += '<h2>Balanço mensal</h2>';
  let saldoFinal = 0;
  state.balancoTables.forEach(t => {
    const total = cfGetTableTotal(state, t);
    if (t.includeInSaldo && t.sign !== 0) saldoFinal += total * t.sign;
    h += `<h3>${esc(t.name)}</h3>`;
    if (t.type === 'planejamento') {
      const rows = (t.rows || []).filter(r => r.categoria && r.profileIdx != null);
      if (!rows.length) { h += '<div class="pdf-empty">Nenhuma categoria cadastrada.</div>'; return; }
      h += '<table><thead><tr><th>Categoria</th><th>Perfil</th><th>Expectativa</th><th>Gasto</th><th>Restante</th></tr></thead><tbody>';
      rows.forEach(r => {
        const gasto = getAllRowsByProfileDetailed(state, r.profileIdx as number).filter(x => x.category === r.categoria).reduce((s, x) => s + num(x.value), 0);
        const restante = num(r.valor) - gasto;
        h += `<tr><td>${esc(r.categoria)}</td><td>${esc(profileName(r.profileIdx))}</td><td>${fmtRaw(r.valor)}</td><td class="pdf-neg">${fmtRaw(gasto)}</td><td class="${sign(restante)}">${fmtRaw(restante)}</td></tr>`;
      });
      h += '</tbody></table>';
    } else if (t.type === 'custom' && t.columns?.length) {
      if (!t.rows.length) { h += '<div class="pdf-empty">Sem lançamentos.</div>'; return; }
      h += `<table><thead><tr>${t.columns.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>`;
      t.rows.forEach(r => {
        h += `<tr>${t.columns!.map(c => { const v = r.values?.[c.id]; return `<td>${c.type === 'number' ? fmtRaw(v || 0) : esc(v || '—')}</td>`; }).join('')}</tr>`;
      });
      h += '</tbody></table>';
    } else {
      h += `<div class="pdf-empty">Total: ${fmtRaw(total)}</div>`;
    }
  });
  h += `<h3>Saldo do mês: <span class="${sign(saldoFinal)}">${fmtRaw(saldoFinal)}</span></h3>`;
  return h;
}

/** Abre a janela de impressão com o extrato (o navegador oferece "Salvar como PDF"). */
export function printFinanceReport(state: FinanceAppState): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  iframe.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Extrato financeiro</title><style>${REPORT_CSS}</style></head><body>${buildFinanceReportHtml(state)}</body></html>`;
  iframe.onload = () => {
    const w = iframe.contentWindow;
    if (!w) { iframe.remove(); return; }
    w.addEventListener('afterprint', () => iframe.remove());
    w.focus();
    w.print();
    setTimeout(() => iframe.remove(), 60_000); // garantia caso afterprint não dispare
  };
  document.body.appendChild(iframe);
}
