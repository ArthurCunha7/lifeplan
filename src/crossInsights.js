// Cruzamento de saúde e dinheiro (tela Início):
// "nas semanas em que você gastou mais com Restaurante, a dieta ficou em 58%".
// JavaScript puro. Compara, semana a semana, a dieta (hábitos) com o gasto de cada categoria
// (finanças). Só mostra relação, nunca valores em reais, e nunca afirma que um causou o outro.
import { dietaDaSemana, semanaDe } from './weeklySummary.js';

export const SEMANAS_ANALISADAS = 12;   // últimas semanas completas
export const MIN_REFEICOES_SEMANA = 5;  // refeições registradas para a semana contar
export const MIN_SEMANAS = 4;           // semanas com dieta para poder comparar
export const MIN_DIFERENCA = 10;        // pontos de diferença na dieta para valer o aviso

const norm = s => String(s || '').trim().toLowerCase();
const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const mediana = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Semanas completas anteriores à de `hoje`, da mais antiga para a mais recente
function semanasAnteriores(hoje, n) {
  const { datas } = semanaDe(hoje);
  const seg = new Date(datas[0] + 'T12:00:00');
  const out = [];
  for (let i = n; i >= 1; i--) {
    const ini = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() - 7 * i, 12);
    out.push(semanaDe(ini).datas);
  }
  return out;
}

// Gasto da pessoa por categoria: faturas + Pix do perfil dela (perfil 0 = a própria conta)
function linhasDeGasto(state, perfil = 0) {
  const rows = [];
  (state?.faturas || []).forEach(f => (f?.rows || []).forEach(r => rows.push(r)));
  (state?.pixRows || []).forEach(r => rows.push(r));
  return rows.filter(r => r && r.date && !r.family && (r.profileIdx ?? 0) === perfil && norm(r.category) && (parseFloat(r.value) || 0) > 0);
}

// entrada: { hoje: Date, habitsDb, state }   saída: { status, ... }
//   status 'sem-dados'   → nada de dieta ou de categorias: o cartão nem aparece
//   status 'faltam-dados'→ há dados, mas ainda poucos (devolve semanasComDieta e minimo)
//   status 'sem-relacao' → dados suficientes, nenhuma categoria se destaca
//   status 'achado'      → categoria, dietaAlta, dietaBaixa, semanasAltas, semanasBaixas, frase
export function cruzarSaudeDinheiro(entrada) {
  const { hoje = new Date(), habitsDb = null, state = null } = entrada || {};
  const semanas = semanasAnteriores(hoje, SEMANAS_ANALISADAS);
  const dietas = semanas.map(datas => {
    const d = dietaDaSemana(habitsDb, datas);
    return d && d.n >= MIN_REFEICOES_SEMANA ? d.pct : null;
  });
  const comDieta = dietas.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0);
  const linhas = linhasDeGasto(state);
  const temAlgumaDieta = Object.values(habitsDb?.records || {}).some(r => r && r.diet && r.diet.meals && Object.keys(r.diet.meals).length);
  if (!temAlgumaDieta && !linhas.length) return { status: 'sem-dados' };
  if (comDieta.length < MIN_SEMANAS) return { status: 'faltam-dados', semanasComDieta: comDieta.length, minimo: MIN_SEMANAS };

  // gasto por categoria em cada semana (0 quando não houve gasto)
  const nomes = new Map();
  const porCat = new Map();
  const idxSemana = new Map(); semanas.forEach((datas, i) => datas.forEach(d => idxSemana.set(d, i)));
  linhas.forEach(r => {
    const i = idxSemana.get(String(r.date).slice(0, 10)); if (i === undefined) return;
    const k = norm(r.category); if (!nomes.has(k)) nomes.set(k, String(r.category).trim());
    if (!porCat.has(k)) porCat.set(k, new Array(semanas.length).fill(0));
    porCat.get(k)[i] += parseFloat(r.value) || 0;
  });

  let melhor = null;
  porCat.forEach((gastos, k) => {
    const g = comDieta.map(i => gastos[i]);
    if (g.filter(x => x > 0).length < 2) return;           // categoria quase sem uso
    const lim = mediana(g);
    const alta = comDieta.filter(i => gastos[i] > lim), baixa = comDieta.filter(i => gastos[i] <= lim);
    if (alta.length < 2 || baixa.length < 2) return;
    const dAlta = Math.round(media(alta.map(i => dietas[i]))), dBaixa = Math.round(media(baixa.map(i => dietas[i])));
    const dif = dBaixa - dAlta;
    if (dif >= MIN_DIFERENCA && (!melhor || dif > melhor.dif)) melhor = { k, dif, dAlta, dBaixa, nAlta: alta.length, nBaixa: baixa.length };
  });

  if (!melhor) return { status: 'sem-relacao', semanas: comDieta.length };
  const categoria = nomes.get(melhor.k);
  return {
    status: 'achado', categoria, dietaAlta: melhor.dAlta, dietaBaixa: melhor.dBaixa,
    semanasAltas: melhor.nAlta, semanasBaixas: melhor.nBaixa, semanas: comDieta.length,
    frase: `Nas semanas em que você gastou mais com ${categoria}, a dieta ficou em ${melhor.dAlta}% (contra ${melhor.dBaixa}% nas outras).`,
  };
}
