// Cruzamento de saúde e dinheiro (tela Início):
// "nas semanas em que você gastou mais com Restaurante, a dieta ficou em 58%".
// Compara, semana a semana, a dieta (hábitos) com o gasto de cada categoria
// (finanças). Só mostra relação, nunca valores em reais, e nunca afirma que um causou o outro.
import { dietaDaSemana, semanaDe } from './weeklySummary';
import type { FinanceRow, FinanceState, HabitsDb } from './types';

export const SEMANAS_ANALISADAS = 12;   // últimas semanas completas
export const MIN_REFEICOES_SEMANA = 5;  // refeições registradas para a semana contar
export const MIN_SEMANAS = 4;           // semanas com dieta para poder comparar
export const MIN_DIFERENCA = 10;        // pontos de diferença na dieta para valer o aviso

export interface CruzamentoInput {
  hoje?: Date;
  habitsDb?: HabitsDb | null;
  state?: FinanceState | null;
}

export type CruzamentoSaudeDinheiro =
  | { status: 'sem-dados' }
  | { status: 'faltam-dados'; semanasComDieta: number; minimo: number }
  | { status: 'sem-relacao'; semanas: number }
  | {
      status: 'achado';
      categoria: string;
      dietaAlta: number;
      dietaBaixa: number;
      semanasAltas: number;
      semanasBaixas: number;
      semanas: number;
      frase: string;
    };

const norm = (s?: string | null): string => String(s || '').trim().toLowerCase();
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const mediana = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Semanas completas anteriores à de `hoje`, da mais antiga para a mais recente
function semanasAnteriores(hoje: Date, n: number): string[][] {
  const { datas } = semanaDe(hoje);
  const seg = new Date(datas[0] + 'T12:00:00');
  const out: string[][] = [];
  for (let i = n; i >= 1; i--) {
    const ini = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() - 7 * i, 12);
    out.push(semanaDe(ini).datas);
  }
  return out;
}

// Gasto da pessoa por categoria: faturas + Pix do perfil dela (perfil 0 = a própria conta)
function linhasDeGasto(state: FinanceState | null | undefined, perfil = 0): FinanceRow[] {
  const rows: FinanceRow[] = [];
  (state?.faturas || []).forEach(f => (f?.rows || []).forEach(r => rows.push(r)));
  (state?.pixRows || []).forEach(r => rows.push(r));
  return rows.filter(r => r && r.date && !r.family && (r.profileIdx ?? 0) === perfil && norm(r.category) && (parseFloat(String(r.value ?? 0)) || 0) > 0);
}

// entrada: { hoje: Date, habitsDb, state }   saída: { status, ... }
export function cruzarSaudeDinheiro(entrada?: CruzamentoInput | null): CruzamentoSaudeDinheiro {
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
  const nomes = new Map<string, string>();
  const porCat = new Map<string, number[]>();
  const idxSemana = new Map<string, number>();
  semanas.forEach((datas, i) => datas.forEach(d => idxSemana.set(d, i)));
  linhas.forEach(r => {
    const i = idxSemana.get(String(r.date).slice(0, 10));
    if (i === undefined) return;
    const k = norm(r.category);
    if (!nomes.has(k)) nomes.set(k, String(r.category).trim());
    let arr = porCat.get(k);
    if (!arr) {
      arr = new Array<number>(semanas.length).fill(0);
      porCat.set(k, arr);
    }
    arr[i] += parseFloat(String(r.value ?? 0)) || 0;
  });

  let melhor: { k: string; dif: number; dAlta: number; dBaixa: number; nAlta: number; nBaixa: number } | null = null;
  for (const [k, gastos] of porCat.entries()) {
    const g = comDieta.map(i => gastos[i]);
    if (g.filter(x => x > 0).length < 2) continue;           // categoria quase sem uso
    const lim = mediana(g);
    const alta = comDieta.filter(i => gastos[i] > lim);
    const baixa = comDieta.filter(i => gastos[i] <= lim);
    if (alta.length < 2 || baixa.length < 2) continue;
    const dAlta = Math.round(media(alta.map(i => dietas[i] as number)));
    const dBaixa = Math.round(media(baixa.map(i => dietas[i] as number)));
    const dif = dBaixa - dAlta;
    if (dif >= MIN_DIFERENCA && (!melhor || dif > melhor.dif)) {
      melhor = { k, dif, dAlta, dBaixa, nAlta: alta.length, nBaixa: baixa.length };
    }
  }

  if (!melhor) return { status: 'sem-relacao', semanas: comDieta.length };
  const categoria = nomes.get(melhor.k) || melhor.k;
  return {
    status: 'achado',
    categoria,
    dietaAlta: melhor.dAlta,
    dietaBaixa: melhor.dBaixa,
    semanasAltas: melhor.nAlta,
    semanasBaixas: melhor.nBaixa,
    semanas: comDieta.length,
    frase: `Nas semanas em que você gastou mais com ${categoria}, a dieta ficou em ${melhor.dAlta}% (contra ${melhor.dBaixa}% nas outras).`,
  };
}
