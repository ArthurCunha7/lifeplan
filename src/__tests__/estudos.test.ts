import { describe, it, expect } from 'vitest';
import { computeSubjectStatus, type EstudosState } from '../estudos/EstudosApp';

describe('EstudosApp — computeSubjectStatus (cálculo de média ponderada e etapas)', () => {
  const baseState: EstudosState = {
    subjects: [
      { id: 'calc', name: 'Cálculo I', pass: 7, max: 10, stages: 3 },
      { id: 'hist', name: 'História', pass: 6, max: 10, stages: 2 },
    ],
    studies: [],
    grades: [],
    events: [],
  };

  it('mostra aviso de sem notas quando nenhuma avaliação foi lançada', () => {
    const st = computeSubjectStatus(baseState, 'calc');
    expect(st.cssClass).toBe('');
    expect(st.text).toContain('0/3 avaliações lançadas');
  });

  it('mantém média parcial enquanto faltam etapas para fechar a matéria', () => {
    const state: EstudosState = {
      ...baseState,
      grades: [
        { id: 'g1', subjectId: 'calc', name: 'P1', value: 8, weight: 1 },
        { id: 'g2', subjectId: 'calc', name: 'P2', value: 6, weight: 1 },
      ],
    };
    const st = computeSubjectStatus(state, 'calc');
    expect(st.cssClass).toBe('');
    expect(st.avg).toBeCloseTo(7, 5);
    expect(st.text).toContain('2/3 avaliações lançadas');
  });

  it('marca aprovado ou reprovado conforme média ponderada final ao completar etapas', () => {
    const state: EstudosState = {
      ...baseState,
      grades: [
        { id: 'g1', subjectId: 'hist', name: 'P1', value: 4, weight: 1 },
        { id: 'g2', subjectId: 'hist', name: 'P2', value: 8, weight: 2 }, // (4*1 + 8*2)/3 = 6.67 >= 6
      ],
    };
    const approved = computeSubjectStatus(state, 'hist');
    expect(approved.cssClass).toBe('aprovado');
    expect(approved.avg).toBeCloseTo(20 / 3, 4);

    const failedState: EstudosState = {
      ...baseState,
      grades: [
        { id: 'g1', subjectId: 'hist', name: 'P1', value: 4, weight: 2 },
        { id: 'g2', subjectId: 'hist', name: 'P2', value: 6, weight: 1 }, // (8 + 6)/3 = 4.67 < 6
      ],
    };
    const failed = computeSubjectStatus(failedState, 'hist');
    expect(failed.cssClass).toBe('reprovado');
  });
});
