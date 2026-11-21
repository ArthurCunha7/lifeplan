// src/__tests__/habitos.test.ts — Testes unitários para o módulo nativo de Hábitos
import { describe, it, expect } from 'vitest';
import {
  createDefaultDb,
  normalizeDb,
  isScheduled,
  todayISO,
  addDaysISO,
} from '../habitos/habitsStorage';
import {
  dayScore,
  computeHabitStreak,
} from '../habitos/habitsAnalytics';
import type { Habit } from '../habitos/habitsTypes';

describe('Habits Storage & Scheduling', () => {
  it('creates default db structure with habits and categories', () => {
    const db = createDefaultDb();
    expect(db.habits.length).toBeGreaterThan(0);
    expect(db.contextTags.length).toBeGreaterThan(0);
    expect(db.reasons.length).toBeGreaterThan(0);
    expect(db.records).toEqual({});
  });

  it('normalizes legacy / raw db correctly', () => {
    const raw = {
      habits: [{ id: 'h1', name: 'Água', freq: 'daily' }],
      records: {
        '2026-11-20': { h1: { status: 'done' } },
      },
    };
    const db = normalizeDb(raw);
    expect(db.habits).toHaveLength(1);
    expect(db.records['2026-11-20']).toBeDefined();
    expect(db.alertConfig.threshold).toBeDefined();
  });

  it('evaluates frequency schedules accurately', () => {
    const dailyHabit: Habit = {
      id: 'h-daily',
      name: 'Diário',
      perMeal: false,
      freq: 'daily',
      days: [0, 1, 2, 3, 4, 5, 6],
      times: 1,
    };
    expect(isScheduled(dailyHabit, '2026-11-20')).toBe(true); // Sexta
    expect(isScheduled(dailyHabit, '2026-11-22')).toBe(true); // Domingo

    const weekdayHabit: Habit = {
      id: 'h-week',
      name: 'Dia de semana',
      perMeal: false,
      freq: 'weekdays',
      days: [1, 2, 3, 4, 5],
      times: 1,
    };
    // 2026-11-20 é Sexta (weekday)
    expect(isScheduled(weekdayHabit, '2026-11-20')).toBe(true);
    // 2026-11-22 é Domingo (fim de semana)
    expect(isScheduled(weekdayHabit, '2026-11-22')).toBe(false);
  });
});

describe('Habits Analytics', () => {
  it('computes daily score correctly with done/fail items', () => {
    const db = createDefaultDb();
    const habitId1 = db.habits[0].id;
    const habitId2 = db.habits[1].id;

    // Se não há registros para a data, retorna null
    expect(dayScore(db, '2026-11-20')).toBeNull();

    // 1 feito e 1 falho
    db.records['2026-11-20'] = {
      [habitId1]: { status: 'done' },
      [habitId2]: { status: 'fail' },
    };

    const score = dayScore(db, '2026-11-20');
    expect(score).toBe(50);
  });

  it('calculates streaks correctly for consecutive 100% days', () => {
    const db = createDefaultDb();
    const habit = db.habits[0];
    db.habits = [habit]; // Apenas 1 hábito para teste

    const t = todayISO();
    const tMinus1 = addDaysISO(t, -1);
    const tMinus2 = addDaysISO(t, -2);

    db.records[tMinus2] = { [habit.id]: { status: 'done' } };
    db.records[tMinus1] = { [habit.id]: { status: 'done' } };
    db.records[t] = { [habit.id]: { status: 'done' } };

    const streak = computeHabitStreak(db);
    expect(streak).toBe(3);
  });
});
