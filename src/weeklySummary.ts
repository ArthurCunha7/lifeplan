// Resumo da semana (tela Início), em tom de consulta: o que foi cumprido, o que ficou pendente
// e uma recomendação. Recebe os dados já lidos e devolve texto pronto.
// Nunca devolve valores em reais (a tela Início pode estar com os valores ocultos).
//
// A semana vai de segunda a domingo e conta até hoje.
import { vencimentosProximos } from './lembretes';
import type { Fatura, HabitsDb, HabitStatusRecord, StudyData, WorkoutLog } from './types';

export const META_TREINOS_PADRAO = 3;
export const LIMITE_BOM = 70; // % de dieta/hábitos a partir do qual conta como cumprido

export interface ResumoSemanalInput {
  hoje?: Date;
  workoutLog?: WorkoutLog | null;
  workoutGoal?: number | null;
  habitsDb?: HabitsDb | null;
  studyData?: StudyData | null;
  faturas?: Fatura[] | null;
}

export interface ResumoSemanalOutput {
  periodo: string;
  cumpriu: string[];
  pendente: string[];
  recomendacao: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');
export const dataLocal = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDias = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const plural = (n: number, um: string, varios: string): string => (n === 1 ? um : varios);
const horas = (h: number): string => (Math.round(h * 10) / 10).toLocaleString('pt-BR');

// Datas (AAAA-MM-DD) de segunda a domingo da semana de `hoje`, e a posição de hoje (0 = segunda)
export function semanaDe(hoje: Date): { datas: string[]; idx: number } {
  const idx = (hoje.getDay() + 6) % 7;
  const seg = addDias(hoje, -idx);
  return { datas: Array.from({ length: 7 }, (_, i) => dataLocal(addDias(seg, i))), idx };
}

export function dietaDaSemana(habitsDb: HabitsDb | null | undefined, datas: string[]): { pct: number; n: number } | null {
  let soma = 0, n = 0;
  const recs = habitsDb?.records || {};
  datas.forEach(d => {
    const meals = recs[d]?.diet?.meals;
    if (!meals) return;
    Object.values(meals).forEach(r => {
      if (!r || !r.followed || r.followed === 'skip') return;
      n++;
      if (r.followed === 'full') soma += 100; else if (r.followed === 'partial') soma += 50;
    });
  });
  return n ? { pct: Math.round(soma / n), n } : null;
}

function habitosDaSemana(
  habitsDb: HabitsDb | null | undefined,
  datas: string[]
): { pct: number; feitos: number; falhas: number; total: number } | null {
  let feitos = 0, falhas = 0;
  const recs = habitsDb?.records || {};
  datas.forEach(d => {
    const r = recs[d];
    if (!r) return;
    Object.entries(r).forEach(([k, x]) => {
      if (k === 'tags' || k === 'diet' || !x || typeof x !== 'object') return;
      const h = x as HabitStatusRecord;
      if (h.status === 'done') feitos++; else if (h.status === 'fail') falhas++;
    });
  });
  const total = feitos + falhas;
  return total ? { pct: Math.round((feitos / total) * 100), feitos, falhas, total } : null;
}

function estudosDaSemana(
  studyData: StudyData | null | undefined,
  datas: string[],
  hojeISO: string,
  ate7ISO: string
): { horas: number; sessoes: number; provas: Array<{ nome: string; dias: number }> } {
  const sessoes = (studyData?.studies || []).filter(s => s && !!s.date && datas.includes(s.date));
  const h = sessoes.reduce((a, s) => a + (parseFloat(String(s.hours ?? 0)) || 0), 0);
  const provas = (studyData?.events || [])
    .filter((e): e is NonNullable<typeof e> & { date: string } => !!e && e.type === 'prova' && !!e.date && e.date >= hojeISO && e.date <= ate7ISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const mat = (studyData?.subjects || []).find(s => s.id === e.subjectId);
      const dias = Math.round((new Date(e.date + 'T00:00:00').getTime() - new Date(hojeISO + 'T00:00:00').getTime()) / 86400000);
      return { nome: mat?.name || e.title || 'Prova', dias };
    });
  return { horas: h, sessoes: sessoes.length, provas };
}

const quando = (n: number): string => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

// entrada: { hoje: Date, workoutLog, workoutGoal, habitsDb, studyData, faturas }
export function resumoSemanal(entrada?: ResumoSemanalInput | null): ResumoSemanalOutput {
  const { hoje = new Date(), workoutLog = {}, habitsDb = null, studyData = null, faturas = [] } = entrada || {};
  const meta = Number(entrada?.workoutGoal) > 0 ? Number(entrada?.workoutGoal) : META_TREINOS_PADRAO;
  const { datas, idx } = semanaDe(hoje);
  const ateHoje = datas.slice(0, idx + 1);
  const diasRestantes = 7 - idx - (workoutLog && workoutLog[dataLocal(hoje)] ? 1 : 0); // dias ainda livres para treinar (hoje só conta se ainda não treinou)
  const hojeISO = dataLocal(hoje);
  const ate7ISO = dataLocal(addDias(hoje, 7));

  const cumpriu: string[] = [];
  const pendente: string[] = [];

  // Treinos
  const feitos = ateHoje.filter(d => workoutLog && workoutLog[d]).length;
  const falta = Math.max(0, meta - feitos);
  if (falta === 0) cumpriu.push(`Meta de treinos batida: ${feitos} de ${meta}`);
  else {
    if (feitos > 0) cumpriu.push(`${feitos} de ${meta} ${plural(meta, 'treino', 'treinos')} da semana`);
    pendente.push(`Falta${falta > 1 ? 'm' : ''} ${falta} ${plural(falta, 'treino', 'treinos')} para a meta da semana`);
  }

  // Dieta
  const dieta = dietaDaSemana(habitsDb, ateHoje);
  if (dieta) {
    if (dieta.pct >= LIMITE_BOM) cumpriu.push(`Dieta seguida em ${dieta.pct}% das refeições registradas`);
    else pendente.push(`Dieta em ${dieta.pct}%, abaixo dos ${LIMITE_BOM}% esperados`);
  }

  // Hábitos
  const hab = habitosDaSemana(habitsDb, ateHoje);
  if (hab) {
    if (hab.pct >= LIMITE_BOM) cumpriu.push(`Hábitos cumpridos em ${hab.pct}% (${hab.feitos} de ${hab.total})`);
    else pendente.push(`${hab.falhas} ${plural(hab.falhas, 'hábito não cumprido', 'hábitos não cumpridos')} nesta semana`);
  }

  // Estudos
  const est = estudosDaSemana(studyData, ateHoje, hojeISO, ate7ISO);
  if (est.horas > 0) cumpriu.push(`${horas(est.horas)} h de estudo registradas`);
  est.provas.forEach(p => pendente.push(`Prova de ${p.nome} ${quando(p.dias)}`));

  // Faturas perto de vencer (nunca mostra valores)
  const venc = vencimentosProximos(faturas, hojeISO, 7);
  venc.forEach(v => pendente.push(`Fatura ${v.name} vence ${quando(v.dias)} (dia ${v.dia})`));

  // Recomendação: uma só, a de maior urgência
  let recomendacao: string;
  const provaPerto = est.provas.find(p => p.dias <= 3);
  const vencPerto = venc.find(v => v.dias <= 2);
  if (provaPerto) {
    recomendacao = `A prova de ${provaPerto.nome} é ${quando(provaPerto.dias)}. Reserve um bloco de estudo hoje.`;
  } else if (falta > 0 && falta >= diasRestantes) {
    if (falta > diasRestantes) {
      recomendacao = diasRestantes === 0
        ? 'Semana corrida? Tudo bem. Que tal ajustar a meta de treinos para a próxima semana?'
        : `Semana corrida? Um treino ${diasRestantes === 1 ? 'no dia que resta' : 'em cada dia que resta'} já conta. Se a meta estiver alta, ajuste para a próxima semana.`;
    } else {
      recomendacao = `Ainda dá para fechar a meta: ${falta === 1 ? 'um treino' : 'um treino por dia'} até domingo resolve.`;
    }
  } else if (vencPerto) {
    recomendacao = `A fatura ${vencPerto.name} vence ${quando(vencPerto.dias)}. Deixe o pagamento separado hoje.`;
  } else if (dieta && dieta.pct < LIMITE_BOM) {
    recomendacao = 'A dieta escapou um pouco. Que tal escolher uma refeição para seguir com calma amanhã?';
  } else if (hab && hab.pct < LIMITE_BOM) {
    recomendacao = 'Os hábitos ficaram mais soltos. Escolha só um para focar amanhã.';
  } else if (!cumpriu.length) {
    recomendacao = 'Ainda não há registros nesta semana. Marque o treino de hoje para começar o prontuário da semana.';
  } else if (falta > 0) {
    recomendacao = `Faltam ${falta} ${plural(falta, 'treino', 'treinos')} para a meta, e ainda dá tempo. Marque o próximo no seu plano.`;
  } else {
    recomendacao = 'Semana no ritmo. Mantenha o plano.';
  }

  const fmt = (s: string): string => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return { periodo: `${fmt(datas[0])} a ${fmt(datas[6])}`, cumpriu, pendente, recomendacao };
}
