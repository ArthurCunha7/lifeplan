// Resumo da semana (tela Início), em tom de consulta: o que foi cumprido, o que ficou pendente
// e uma recomendação. JavaScript puro: recebe os dados já lidos e devolve texto pronto.
// Nunca devolve valores em reais (a tela Início pode estar com os valores ocultos).
//
// A semana vai de segunda a domingo e conta até hoje.
import { vencimentosProximos } from './lembretes.js';

export const META_TREINOS_PADRAO = 3;
export const LIMITE_BOM = 70; // % de dieta/hábitos a partir do qual conta como cumprido

const pad = n => String(n).padStart(2, '0');
export const dataLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDias = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };
const plural = (n, um, varios) => (n === 1 ? um : varios);
const horas = h => (Math.round(h * 10) / 10).toLocaleString('pt-BR');

// Datas (AAAA-MM-DD) de segunda a domingo da semana de `hoje`, e a posição de hoje (0 = segunda)
export function semanaDe(hoje) {
  const idx = (hoje.getDay() + 6) % 7;
  const seg = addDias(hoje, -idx);
  return { datas: Array.from({ length: 7 }, (_, i) => dataLocal(addDias(seg, i))), idx };
}

export function dietaDaSemana(habitsDb, datas) {
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

function habitosDaSemana(habitsDb, datas) {
  let feitos = 0, falhas = 0;
  const recs = habitsDb?.records || {};
  datas.forEach(d => {
    const r = recs[d];
    if (!r) return;
    Object.entries(r).forEach(([k, x]) => {
      if (k === 'tags' || k === 'diet' || !x) return;
      if (x.status === 'done') feitos++; else if (x.status === 'fail') falhas++;
    });
  });
  const total = feitos + falhas;
  return total ? { pct: Math.round((feitos / total) * 100), feitos, falhas, total } : null;
}

function estudosDaSemana(studyData, datas, hojeISO, ate7ISO) {
  const sessoes = (studyData?.studies || []).filter(s => s && datas.includes(s.date));
  const h = sessoes.reduce((a, s) => a + (parseFloat(s.hours) || 0), 0);
  const provas = (studyData?.events || [])
    .filter(e => e && e.type === 'prova' && e.date && e.date >= hojeISO && e.date <= ate7ISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const mat = (studyData.subjects || []).find(s => s.id === e.subjectId);
      const dias = Math.round((new Date(e.date + 'T00:00:00') - new Date(hojeISO + 'T00:00:00')) / 86400000);
      return { nome: mat?.name || e.title || 'Prova', dias };
    });
  return { horas: h, sessoes: sessoes.length, provas };
}

const quando = n => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

// entrada: { hoje: Date, workoutLog, workoutGoal, habitsDb, studyData, faturas }
export function resumoSemanal(entrada) {
  const { hoje = new Date(), workoutLog = {}, habitsDb = null, studyData = null, faturas = [] } = entrada || {};
  const meta = Number(entrada?.workoutGoal) > 0 ? Number(entrada.workoutGoal) : META_TREINOS_PADRAO;
  const { datas, idx } = semanaDe(hoje);
  const ateHoje = datas.slice(0, idx + 1);
  const diasRestantes = 7 - idx - (workoutLog && workoutLog[dataLocal(hoje)] ? 1 : 0); // dias ainda livres para treinar (hoje só conta se ainda não treinou)
  const hojeISO = dataLocal(hoje);
  const ate7ISO = dataLocal(addDias(hoje, 7));

  const cumpriu = [], pendente = [];

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
  let recomendacao;
  const provaPerto = est.provas.find(p => p.dias <= 3);
  const vencPerto = venc.find(v => v.dias <= 2);
  if (provaPerto) {
    recomendacao = `A prova de ${provaPerto.nome} é ${quando(provaPerto.dias)}. Reserve um bloco de estudo hoje.`;
  } else if (falta > 0 && falta >= diasRestantes) {
    if (falta > diasRestantes) {
      recomendacao = diasRestantes === 0
        ? `Faltam ${falta} ${plural(falta, 'treino', 'treinos')} e não restam dias livres nesta semana. Vale ajustar a meta da próxima semana.`
        : `Faltam ${falta} treinos e só ${plural(diasRestantes, 'resta', 'restam')} ${diasRestantes} ${plural(diasRestantes, 'dia', 'dias')}. Vale ajustar a meta ou encaixar dois treinos no mesmo dia.`;
    } else {
      recomendacao = `Faltam ${falta} ${plural(falta, 'treino', 'treinos')} e ${plural(diasRestantes, 'resta', 'restam')} ${diasRestantes} ${plural(diasRestantes, 'dia', 'dias')}. Treine ${diasRestantes === 1 ? 'no dia que resta' : 'todos os dias que restam'} para fechar a meta.`;
    }
  } else if (vencPerto) {
    recomendacao = `A fatura ${vencPerto.name} vence ${quando(vencPerto.dias)}. Deixe o pagamento separado hoje.`;
  } else if (dieta && dieta.pct < LIMITE_BOM) {
    recomendacao = 'A dieta ficou abaixo do esperado. Escolha uma refeição para seguir à risca amanhã.';
  } else if (hab && hab.pct < LIMITE_BOM) {
    recomendacao = 'Os hábitos ficaram abaixo do esperado. Escolha um só para focar amanhã.';
  } else if (!cumpriu.length) {
    recomendacao = 'Ainda não há registros nesta semana. Marque o treino de hoje para começar o prontuário da semana.';
  } else if (falta > 0) {
    recomendacao = `Faltam ${falta} ${plural(falta, 'treino', 'treinos')} para a meta, e ainda dá tempo. Marque o próximo no seu plano.`;
  } else {
    recomendacao = 'Semana no ritmo. Mantenha o plano.';
  }

  const fmt = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return { periodo: `${fmt(datas[0])} a ${fmt(datas[6])}`, cumpriu, pendente, recomendacao };
}
