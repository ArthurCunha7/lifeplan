// src/habitos/habitsStorage.ts — Persistência localStorage, normalização e sincronização com Nutrição
import type { MealPlanDay } from '../types';
import type {
  DayRecord,
  DietFood,
  DietMealEntryRecord,
  DietMealOption,
  DietMealPlan,
  Habit,
  HabitEntryRecord,
  HabitFrequency,
  HabitsDatabase,
} from './habitsTypes';

export const HABITS_STORAGE_KEY = 'habitsAppV4';
export const HABITS_UID_KEY = 'habitsAppV4_uid';
export const HABITS_KEY_V3 = 'habitsAppV3';
export const HABITS_KEY_V2 = 'habitsAppV2';
export const HABITS_KEY_V1 = 'habitsAppV1';

export const DEFAULT_SAMPLE_MEAL_IDS = new Set(['mp1', 'mp2', 'mp3', 'mp4', 'mp5']);

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export function uid(): string {
  return 'h' + Math.random().toString(36).slice(2, 9);
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function toLocalISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function addDaysISO(dateStr: string, delta: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + delta);
  return toLocalISODate(d);
}

export function fmtDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function fmtFullDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR');
}

export function weekStart(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
}

export function weekDates(mondayStr: string): string[] {
  const arr: string[] = [];
  for (let i = 0; i < 7; i++) {
    arr.push(addDaysISO(mondayStr, i));
  }
  return arr;
}

export function weekdayIdxFromDate(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  return d.getDay() === 0 ? 6 : d.getDay() - 1; // 0 = Segunda .. 6 = Domingo
}

export function isScheduled(habit: Habit, dateStr: string): boolean {
  if (habit.freq === 'daily') return true;
  if (habit.freq === 'weekdays') return habit.days.includes(parseLocalDate(dateStr).getDay());
  return false;
}

export function describeFreq(h: Habit): string {
  if (h.freq === 'daily') return 'Diário';
  if (h.freq === 'weekdays') return h.days.map(d => WEEKDAYS_SHORT[d] || '').filter(Boolean).join(', ');
  if (h.freq === 'weekly') return `${h.times}x na semana`;
  return '';
}

export function getHabitRecord(dayRec: DayRecord | undefined, habitId: string): HabitEntryRecord | undefined {
  if (!dayRec) return undefined;
  if (habitId === 'tags' || habitId === 'diet') return undefined;
  const val = dayRec[habitId];
  if (!val || Array.isArray(val) || 'meals' in val) return undefined;
  return val as HabitEntryRecord;
}

export function iterHabitRecords(dayRec: DayRecord | undefined): Array<[string, HabitEntryRecord]> {
  if (!dayRec) return [];
  const out: Array<[string, HabitEntryRecord]> = [];
  for (const [key, val] of Object.entries(dayRec)) {
    if (key === 'tags' || key === 'diet' || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if ('meals' in val) continue;
    out.push([key, val as HabitEntryRecord]);
  }
  return out;
}

export function normalizeMeal(rawMeal: Partial<DietMealPlan> & { foods?: DietFood[] }): DietMealPlan {
  const rawOptions = Array.isArray(rawMeal.options) && rawMeal.options.length > 0
    ? rawMeal.options
    : [{ id: uid(), name: 'Opção 1', foods: Array.isArray(rawMeal.foods) ? [...rawMeal.foods] : [] }];

  const options: DietMealOption[] = rawOptions.map((opt, idx) => ({
    id: opt?.id || uid(),
    name: opt?.name || `Opção ${idx + 1}`,
    foods: Array.isArray(opt?.foods)
      ? opt.foods.map(f => ({
          name: String(f?.name || ''),
          amount: String(f?.amount || ''),
        }))
      : [],
  }));

  return {
    id: rawMeal.id || uid(),
    name: rawMeal.name || 'Refeição',
    time: rawMeal.time || '',
    emoji: rawMeal.emoji || '🍽️',
    options,
    ...(rawMeal.custom ? { custom: true } : {}),
  };
}

export function getMealOptions(meal: DietMealPlan): DietMealOption[] {
  return meal.options && meal.options.length > 0
    ? meal.options
    : [{ id: `${meal.id}-opt0`, name: 'Opção 1', foods: [] }];
}

export function getMealRecordOption(
  meal: DietMealPlan,
  mealRec?: DietMealEntryRecord
): DietMealOption | null {
  const opts = getMealOptions(meal);
  if (!opts.length) return null;
  let optId = mealRec?.optionId;
  if (!optId || !opts.some(o => o.id === optId)) {
    optId = opts[0].id;
  }
  return opts.find(o => o.id === optId) || opts[0];
}

export function getMealActiveFoods(
  meal: DietMealPlan,
  mealRec?: DietMealEntryRecord
): DietFood[] {
  const opt = getMealRecordOption(meal, mealRec);
  return opt ? opt.foods : [];
}

export function createDefaultDb(): HabitsDatabase {
  return {
    habits: [
      { id: 'h1', name: 'Não comer doce', perMeal: true, freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], times: 7 },
      { id: 'h2', name: 'Beber 2L de água', perMeal: false, freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], times: 7 },
      { id: 'h3', name: 'Academia', perMeal: false, freq: 'weekly', days: [], times: 3 },
    ],
    contextTags: [
      'Trabalho presencial',
      'Home office',
      'Viagem',
      'Reunião à noite',
      'Final de semana social',
      'TPM',
      'Mal dormido',
    ],
    reasons: ['Ansiedade', 'Estresse', 'Fome', 'Festa/Evento social', 'Cansaço', 'Sem motivo'],
    meals: ['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Madrugada'],
    dietPlan: [
      {
        id: 'mp1',
        name: 'Café da manhã',
        time: '07:00',
        emoji: '☕',
        options: [{
          id: 'mp1o1',
          name: 'Cardápio padrão',
          foods: [
            { name: 'Ovos mexidos', amount: '3 unidades' },
            { name: 'Pão integral', amount: '2 fatias' },
            { name: 'Café preto', amount: '200ml' },
          ],
        }],
      },
      {
        id: 'mp2',
        name: 'Lanche da manhã',
        time: '10:00',
        emoji: '🍎',
        options: [{
          id: 'mp2o1',
          name: 'Cardápio padrão',
          foods: [
            { name: 'Maçã', amount: '1 unidade' },
            { name: 'Castanhas', amount: '20g' },
          ],
        }],
      },
      {
        id: 'mp3',
        name: 'Almoço',
        time: '12:30',
        emoji: '🍽️',
        options: [
          {
            id: 'mp3o1',
            name: 'Opção A — Frango',
            foods: [
              { name: 'Frango grelhado', amount: '150g' },
              { name: 'Arroz integral', amount: '100g' },
              { name: 'Feijão', amount: '80g' },
              { name: 'Salada', amount: 'à vontade' },
            ],
          },
          {
            id: 'mp3o2',
            name: 'Opção B — Peixe',
            foods: [
              { name: 'Peixe grelhado', amount: '150g' },
              { name: 'Batata doce', amount: '120g' },
              { name: 'Salada', amount: 'à vontade' },
            ],
          },
        ],
      },
      {
        id: 'mp4',
        name: 'Lanche da tarde',
        time: '16:00',
        emoji: '🥤',
        options: [{
          id: 'mp4o1',
          name: 'Cardápio padrão',
          foods: [
            { name: 'Iogurte natural', amount: '170g' },
            { name: 'Granola', amount: '30g' },
          ],
        }],
      },
      {
        id: 'mp5',
        name: 'Jantar',
        time: '20:00',
        emoji: '🥗',
        options: [{
          id: 'mp5o1',
          name: 'Cardápio padrão',
          foods: [
            { name: 'Peixe assado', amount: '120g' },
            { name: 'Batata doce', amount: '100g' },
            { name: 'Legumes refogados', amount: '150g' },
          ],
        }],
      },
    ],
    records: {},
    alertConfig: { threshold: 0.5, window: 7 },
    dismissedAlerts: {},
  };
}

export function normalizeDb(raw: unknown, markCustomMeals = false): HabitsDatabase {
  const def = createDefaultDb();
  if (!raw || typeof raw !== 'object') return def;
  const r = raw as Record<string, unknown>;

  const habits: Habit[] = Array.isArray(r.habits)
    ? r.habits.map((hRaw): Habit => {
        const h = (hRaw || {}) as Record<string, unknown>;
        const freq: HabitFrequency =
          h.freq === 'weekdays' || h.freq === 'weekly' || h.freq === 'daily'
            ? h.freq
            : 'daily';
        const days = Array.isArray(h.days)
          ? h.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
          : freq === 'daily'
            ? [0, 1, 2, 3, 4, 5, 6]
            : [];
        const times = typeof h.times === 'number' && h.times >= 1 ? h.times : freq === 'daily' ? 7 : Math.max(1, days.length || 3);
        return {
          id: typeof h.id === 'string' && h.id ? h.id : uid(),
          name: typeof h.name === 'string' && h.name ? h.name : 'Hábito',
          perMeal: Boolean(h.perMeal),
          freq,
          days,
          times,
        };
      })
    : def.habits;

  const contextTags: string[] = Array.isArray(r.contextTags)
    ? r.contextTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : def.contextTags;

  const reasons: string[] = Array.isArray(r.reasons)
    ? r.reasons.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : def.reasons;

  const meals: string[] = Array.isArray(r.meals)
    ? r.meals.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : def.meals;

  const dietPlan: DietMealPlan[] = Array.isArray(r.dietPlan)
    ? r.dietPlan.map((mRaw) => {
        const m = normalizeMeal((mRaw || {}) as Partial<DietMealPlan>);
        if (markCustomMeals && !m.id.startsWith('nutri-')) {
          m.custom = true;
        }
        return m;
      })
    : def.dietPlan;

  const records: Record<string, DayRecord> =
    r.records && typeof r.records === 'object' && !Array.isArray(r.records)
      ? (r.records as Record<string, DayRecord>)
      : {};

  const ac = (r.alertConfig && typeof r.alertConfig === 'object' ? r.alertConfig : {}) as Record<string, unknown>;
  const threshold = typeof ac.threshold === 'number' && !Number.isNaN(ac.threshold) ? ac.threshold : 0.5;
  const win = typeof ac.window === 'number' && !Number.isNaN(ac.window) ? ac.window : 7;

  const dismissedAlerts: Record<string, number> =
    r.dismissedAlerts && typeof r.dismissedAlerts === 'object' && !Array.isArray(r.dismissedAlerts)
      ? (r.dismissedAlerts as Record<string, number>)
      : {};

  return {
    habits,
    contextTags,
    reasons,
    meals,
    dietPlan,
    records,
    alertConfig: { threshold, window: win },
    dismissedAlerts,
  };
}

export function migrateOrDefault(): HabitsDatabase {
  try {
    const v3Raw = localStorage.getItem(HABITS_KEY_V3);
    if (v3Raw) return normalizeDb(JSON.parse(v3Raw), true);

    const v2Raw = localStorage.getItem(HABITS_KEY_V2);
    if (v2Raw) {
      const v2 = JSON.parse(v2Raw) as Record<string, unknown>;
      return normalizeDb({ ...v2, dietPlan: [] });
    }

    const v1Raw = localStorage.getItem(HABITS_KEY_V1);
    if (v1Raw) {
      const v1 = JSON.parse(v1Raw) as Record<string, unknown>;
      const habits = Array.isArray(v1.habits)
        ? v1.habits.map((h: Record<string, unknown>) => ({
            ...h,
            freq: 'daily',
            days: [0, 1, 2, 3, 4, 5, 6],
            times: 7,
          }))
        : [];
      return normalizeDb({
        ...v1,
        habits,
        contextTags: ['Trabalho presencial', 'Home office'],
        dietPlan: [],
      });
    }
  } catch {
    // ignore corrupt legacy storage
  }
  return createDefaultDb();
}

export function resetLocalHabitsCache(): HabitsDatabase {
  try {
    [HABITS_STORAGE_KEY, HABITS_KEY_V3, HABITS_KEY_V2, HABITS_KEY_V1].forEach(k =>
      localStorage.removeItem(k)
    );
  } catch {
    // ignore storage quota/privacy errors
  }
  return createDefaultDb();
}

export function loadInitialDb(userId: string | null): HabitsDatabase {
  try {
    const lastUid = localStorage.getItem(HABITS_UID_KEY);
    if (userId && lastUid && lastUid !== userId) {
      const fresh = resetLocalHabitsCache();
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(fresh));
      localStorage.setItem(HABITS_UID_KEY, userId);
      return fresh;
    }
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    if (raw) {
      return normalizeDb(JSON.parse(raw));
    }
  } catch {
    // ignore parse errors
  }
  return migrateOrDefault();
}

export function persistLocalDb(db: HabitsDatabase, userId: string | null): void {
  try {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(db));
    if (userId) {
      localStorage.setItem(HABITS_UID_KEY, userId);
    }
  } catch {
    // ignore quota errors
  }
}

// ── Sincronização do Plano Alimentar (Nutrição user_plans + customizações em Configurações) ──

function isEmojiLike(icon?: string): boolean {
  if (!icon) return false;
  return !/^[a-z0-9_-]+$/i.test(icon.trim());
}

export function buildNutritionMealsForWeekday(
  weekdayIdx: number,
  nutritionDays: MealPlanDay[] | null
): DietMealPlan[] {
  if (!nutritionDays || !nutritionDays.length) return [];
  const day = nutritionDays[weekdayIdx];
  if (!day || !Array.isArray(day.meals) || !day.meals.length) return [];

  return day.meals.map((m, idx) => {
    const id = `nutri-${weekdayIdx}-${idx}`;
    return {
      id,
      name: m.name || `Refeição ${idx + 1}`,
      time: m.time || '',
      emoji: isEmojiLike(m.icon) ? m.icon : '🍽️',
      options: [
        {
          id: `${id}-opt0`,
          name: 'Cardápio padrão',
          foods: (m.foods || []).map(f => ({
            name: f.name,
            amount: `${f.qty || 100}g`,
          })),
        },
      ],
    };
  });
}

function getCustomMeals(dietPlan: DietMealPlan[]): DietMealPlan[] {
  return dietPlan.filter(m => {
    if (m.id.startsWith('nutri-')) return false;
    if (m.custom) return true;
    return !DEFAULT_SAMPLE_MEAL_IDS.has(m.id);
  });
}

/**
 * Retorna o plano alimentar efetivo para uma data específica:
 * 1. Refeições vindas de `user_plans` (aba Nutrição) para o dia da semana correspondente,
 *    aplicando eventuais edições/opções extras salvas pelo usuário em Configurações (`m.custom`).
 * 2. Mais quaisquer refeições personalizadas criadas pelo usuário em Configurações.
 */
export function getEffectiveDietPlanForDate(
  dateStr: string,
  dbDietPlan: DietMealPlan[],
  nutritionDays: MealPlanDay[] | null
): DietMealPlan[] {
  const wd = weekdayIdxFromDate(dateStr);
  const nutriMeals = buildNutritionMealsForWeekday(wd, nutritionDays);
  const overridesById = new Map<string, DietMealPlan>();
  for (const m of dbDietPlan) {
    if (m.id.startsWith('nutri-') && m.custom) {
      overridesById.set(m.id, m);
    }
  }

  const mergedNutri = nutriMeals.map(nm => overridesById.get(nm.id) || nm);
  const customMeals = getCustomMeals(dbDietPlan);

  return [...mergedNutri, ...customMeals];
}

/**
 * Lista consolidada de refeições ativas para gráficos, busca e análises.
 */
export function getActiveMealsCatalog(
  referenceDate: string,
  dbDietPlan: DietMealPlan[],
  nutritionDays: MealPlanDay[] | null
): DietMealPlan[] {
  const forRef = getEffectiveDietPlanForDate(referenceDate, dbDietPlan, nutritionDays);
  if (forRef.length > 0) return forRef;

  // Se o dia de referência não tiver refeições na Nutrição (ex.: dia livre), procura em outros dias da semana
  if (nutritionDays && nutritionDays.length > 0) {
    for (let wd = 0; wd < 7; wd++) {
      const m = buildNutritionMealsForWeekday(wd, nutritionDays);
      if (m.length > 0) {
        return [...m, ...getCustomMeals(dbDietPlan)];
      }
    }
  }
  return getCustomMeals(dbDietPlan);
}

/**
 * Resolve o nome de uma refeição a partir do ID salvo em um registro histórico.
 */
export function resolveHistoricalMealName(
  mealId: string,
  dbDietPlan: DietMealPlan[],
  nutritionDays: MealPlanDay[] | null
): string {
  const inDb = dbDietPlan.find(m => m.id === mealId);
  if (inDb) return inDb.name;

  const match = /^nutri-(\d+)-(\d+)$/.exec(mealId);
  if (match && nutritionDays) {
    const wd = Number(match[1]);
    const idx = Number(match[2]);
    const meal = nutritionDays[wd]?.meals?.[idx];
    if (meal?.name) return meal.name;
    return `Refeição ${idx + 1}`;
  }

  const sampleNames: Record<string, string> = {
    mp1: 'Café da manhã',
    mp2: 'Lanche da manhã',
    mp3: 'Almoço',
    mp4: 'Lanche da tarde',
    mp5: 'Jantar',
  };
  return sampleNames[mealId] || 'Refeição';
}
