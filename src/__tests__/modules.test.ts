import { describe, it, expect } from 'vitest';
import { dividirTitulo, lerExercicios } from '../workoutFormat';
import { MODELOS, montarModelo, treinosDeForca } from '../workoutTemplates';
import { resumoSemanal } from '../weeklySummary';
import { cruzarSaudeDinheiro } from '../crossInsights';
import { generatePlan } from '../tacoDb';

describe('workoutFormat & workoutTemplates (TypeScript)', () => {
  it('divide título e lê séries com RIR e intervalo', () => {
    expect(dividirTitulo('Superior A – Peito e costas')).toEqual({
      nome: 'Superior A',
      foco: 'Peito e costas',
    });
    const ex = lerExercicios('Supino reto 4×6-8 · RIR 1-2 · 2-3 min\nCardio leve 15 min');
    expect(ex).toEqual([
      { tipo: 'serie', nome: 'Supino reto', dose: '4×6-8', rir: '1-2', intervalo: '2-3 min' },
      { tipo: 'texto', texto: 'Cardio leve 15 min' },
    ]);
  });

  it('aplica um modelo de treino aos 7 dias do plano gerado pela Tabela TACO', () => {
    const basePlan = generatePlan({
      weight: 78,
      height: 178,
      age: 26,
      sex: 'M',
      activity: 'moderado',
      goal: 'manter',
    });
    expect(basePlan).toHaveLength(7);
    const abc = MODELOS.find(m => m.id === 'abc')!;
    const out = montarModelo(abc, basePlan, [], 1700000000000);
    expect(out.meta).toBe(treinosDeForca(abc));
    expect(out.profiles).toHaveLength(3);
    expect(out.plan[0].typeLabel).toContain('Treino A');
    expect(out.plan[1].type).toBe('rest');
  });
});

describe('weeklySummary & crossInsights (TypeScript)', () => {
  it('gera resumo semanal consistente sem expor valores em reais', () => {
    const out = resumoSemanal({
      hoje: new Date('2026-11-18T12:00:00'),
      workoutLog: { '2026-11-16': true, '2026-11-18': true },
      workoutGoal: 3,
      faturas: [{ id: 'f1', name: 'Nubank', vencimento: '20' }],
    });
    expect(out.cumpriu.some(s => s.includes('2 de 3'))).toBe(true);
    expect(out.pendente.some(s => s.includes('Nubank'))).toBe(true);
    expect(JSON.stringify(out)).not.toContain('R$');
  });

  it('retorna sem-dados quando não há dieta nem gastos registrados', () => {
    expect(cruzarSaudeDinheiro({ hoje: new Date('2026-11-18T12:00:00') })).toEqual({
      status: 'sem-dados',
    });
  });
});
