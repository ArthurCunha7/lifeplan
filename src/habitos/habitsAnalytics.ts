// src/habitos/habitsAnalytics.ts — Cálculos estatísticos, alertas, previsões, correlações e busca
import type { MealPlanDay, WorkoutLog } from '../types';
import {
  addDaysISO,
  fmtDate,
  getActiveMealsCatalog,
  getEffectiveDietPlanForDate,
  getHabitRecord,
  isScheduled,
  iterHabitRecords,
  MONTH_NAMES,
  parseLocalDate,
  todayISO,
  toLocalISODate,
  WEEKDAYS,
  weekDates,
  weekStart,
} from './habitsStorage';
import type {
  AlertItem,
  AutoInsightItem,
  BodyMetric,
  CorrelationPair,
  DashboardStats,
  DietAnalysisData,
  DietMealPlan,
  HabitPrediction,
  HabitsDatabase,
  HabitTrendItem,
  MonthHistoryCell,
  MonthRangeInfo,
  OverallTrendData,
  PeriodComparisonData,
  PredictionFactor,
  RangeAverage,
  SearchResultItem,
  SuccessRate,
  TagImpactItem,
  TemporalComparisonData,
  WeekdayPatternItem,
  WorkoutWeekSummary,
} from './habitsTypes';

export function weeklyCount(db: HabitsDatabase, habitId: string, dateStr: string): number {
  let c = 0;
  for (const d of weekDates(weekStart(dateStr))) {
    if (getHabitRecord(db.records[d], habitId)?.status === 'done') c++;
  }
  return c;
}

export function dayScore(db: HabitsDatabase, dateStr: string): number | null {
  const rec = db.records[dateStr];
  if (!rec) return null;
  let done = 0;
  let total = 0;
  for (const h of db.habits) {
    if (h.freq === 'weekly') continue;
    if (!isScheduled(h, dateStr)) {
      const s = getHabitRecord(rec, h.id)?.status;
      if (s === 'done') {
        done++;
        total++;
      } else if (s === 'fail') {
        total++;
      }
      continue;
    }
    const s = getHabitRecord(rec, h.id)?.status;
    if (s === 'skip') continue;
    total++;
    if (s === 'done') done++;
  }
  return total ? Math.round((done / total) * 100) : null;
}

export function dietDayScore(
  db: HabitsDatabase,
  dateStr: string,
  nutritionDays: MealPlanDay[] | null
): number | null {
  const rec = db.records[dateStr]?.diet;
  if (!rec || !rec.meals) return null;

  const planForDate = getEffectiveDietPlanForDate(dateStr, db.dietPlan, nutritionDays);
  const countedIds = new Set<string>();
  let sum = 0;
  let count = 0;

  for (const meal of planForDate) {
    countedIds.add(meal.id);
    const r = rec.meals[meal.id];
    if (!r || !r.followed || r.followed === 'skip') continue;
    count++;
    if (r.followed === 'full') sum += 100;
    else if (r.followed === 'partial') sum += 50;
  }

  // Preserva pontuação de refeições antigas removidas do plano
  for (const [mealId, r] of Object.entries(rec.meals)) {
    if (countedIds.has(mealId)) continue;
    if (!r || !r.followed || r.followed === 'skip') continue;
    count++;
    if (r.followed === 'full') sum += 100;
    else if (r.followed === 'partial') sum += 50;
  }

  return count > 0 ? Math.round(sum / count) : null;
}

export function dietDayCounts(
  db: HabitsDatabase,
  dateStr: string,
  activeMeals: DietMealPlan[]
): { full: number; partial: number; no: number; skip: number; pending: number } {
  const rec = db.records[dateStr]?.diet;
  const counts = { full: 0, partial: 0, no: 0, skip: 0, pending: 0 };
  if (!rec || !rec.meals) {
    counts.pending = activeMeals.length;
    return counts;
  }
  for (const meal of activeMeals) {
    const r = rec.meals[meal.id];
    if (!r || !r.followed) counts.pending++;
    else counts[r.followed]++;
  }
  return counts;
}

function getMatchingMealIds(
  meal: DietMealPlan,
  nutritionDays: MealPlanDay[] | null
): Set<string> {
  const ids = new Set<string>([meal.id]);
  const match = /^nutri-(\d+)-(\d+)$/.exec(meal.id);
  if (match && nutritionDays) {
    const idx = Number(match[2]);
    const targetName = meal.name.trim().toLowerCase();
    for (let wd = 0; wd < 7; wd++) {
      const m = nutritionDays[wd]?.meals?.[idx];
      if (m && (m.name || `Refeição ${idx + 1}`).trim().toLowerCase() === targetName) {
        ids.add(`nutri-${wd}-${idx}`);
      }
    }
  }
  return ids;
}

export function mealComplianceRate(
  db: HabitsDatabase,
  meal: DietMealPlan,
  nutritionDays: MealPlanDay[] | null
): SuccessRate | null {
  const targetIds = getMatchingMealIds(meal, nutritionDays);
  let sum = 0;
  let count = 0;
  for (const rec of Object.values(db.records)) {
    const mealsMap = rec.diet?.meals;
    if (!mealsMap) continue;
    for (const id of targetIds) {
      const r = mealsMap[id];
      if (!r || !r.followed || r.followed === 'skip') continue;
      count++;
      if (r.followed === 'full') sum += 100;
      else if (r.followed === 'partial') sum += 50;
    }
  }
  return count >= 2 ? { rate: sum / count, n: count } : null;
}

export function computeHabitStreak(db: HabitsDatabase): number {
  const base = todayISO();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const s = dayScore(db, addDaysISO(base, -i));
    if (s === null) {
      if (i === 0) continue;
      break;
    }
    if (s === 100) streak++;
    else break;
  }
  return streak;
}

export function computeDietStreak(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): number {
  const base = todayISO();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const s = dietDayScore(db, addDaysISO(base, -i), nutritionDays);
    if (s === null) {
      if (i === 0) continue;
      break;
    }
    if (s >= 80) streak++;
    else break;
  }
  return streak;
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = y.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, b, i) => a + b * y[i], 0);
  const sx2 = x.reduce((a, b) => a + b * b, 0);
  const sy2 = y.reduce((a, b) => a + b * b, 0);
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  return den ? num / den : 0;
}

export function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const x = values.map((_, i) => i);
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = values.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, b, i) => a + b * values[i], 0);
  const sx2 = x.reduce((a, b) => a + b * b, 0);
  const den = n * sx2 - sx * sx;
  return den ? (n * sxy - sx * sy) / den : 0;
}

export function habitDayValue(db: HabitsDatabase, habitId: string, dateStr: string): number | null {
  const s = getHabitRecord(db.records[dateStr], habitId)?.status;
  if (s === 'done') return 1;
  if (s === 'fail') return 0;
  return null;
}

export function habitSuccessRate(
  db: HabitsDatabase,
  habitId: string,
  dates: string[]
): SuccessRate | null {
  let done = 0;
  let total = 0;
  for (const d of dates) {
    const v = habitDayValue(db, habitId, d);
    if (v !== null) {
      total++;
      if (v === 1) done++;
    }
  }
  return total >= 2 ? { rate: done / total, n: total, done } : null;
}

export function habitCorrelation(
  db: HabitsDatabase,
  idA: string,
  idB: string
): { r: number; n: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of Object.keys(db.records)) {
    const a = habitDayValue(db, idA, d);
    const b = habitDayValue(db, idB, d);
    if (a !== null && b !== null) {
      xs.push(a);
      ys.push(b);
    }
  }
  if (xs.length < 5) return null;
  return { r: pearson(xs, ys), n: xs.length };
}

export function dietHabitCorrelation(
  db: HabitsDatabase,
  habitId: string,
  nutritionDays: MealPlanDay[] | null
): { r: number; n: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of Object.keys(db.records)) {
    const habitV = habitDayValue(db, habitId, d);
    const dietS = dietDayScore(db, d, nutritionDays);
    if (habitV !== null && dietS !== null) {
      xs.push(dietS / 100);
      ys.push(habitV);
    }
  }
  if (xs.length < 5) return null;
  return { r: pearson(xs, ys), n: xs.length };
}

export function conditionalRate(
  db: HabitsDatabase,
  habitTarget: string,
  conditionFn: (dateStr: string) => boolean
): {
  withRate: number;
  withoutRate: number;
  diff: number;
  nWith: number;
  nWithout: number;
} | null {
  let withCondDone = 0;
  let withCondTotal = 0;
  let withoutCondDone = 0;
  let withoutCondTotal = 0;

  for (const d of Object.keys(db.records)) {
    const v = habitDayValue(db, habitTarget, d);
    if (v === null) continue;
    if (conditionFn(d)) {
      withCondTotal++;
      if (v === 1) withCondDone++;
    } else {
      withoutCondTotal++;
      if (v === 1) withoutCondDone++;
    }
  }
  if (withCondTotal < 2 || withoutCondTotal < 2) return null;
  const withRate = withCondDone / withCondTotal;
  const withoutRate = withoutCondDone / withoutCondTotal;
  return {
    withRate,
    withoutRate,
    diff: withRate - withoutRate,
    nWith: withCondTotal,
    nWithout: withoutCondTotal,
  };
}

export function tagImpact(db: HabitsDatabase, tag: string, habitId: string) {
  return conditionalRate(db, habitId, d => (db.records[d]?.tags || []).includes(tag));
}

export function overallTrend(db: HabitsDatabase, days = 30): OverallTrendData | null {
  const base = todayISO();
  const labels: string[] = [];
  const values: Array<number | null> = [];
  for (let i = days - 1; i >= 0; i--) {
    const ds = addDaysISO(base, -i);
    labels.push(fmtDate(ds));
    values.push(dayScore(db, ds));
  }

  const valid = values
    .map((v, i) => (v !== null ? { i, v } : null))
    .filter((x): x is { i: number; v: number } => x !== null);

  if (valid.length < 5) return null;

  const validVals = valid.map(x => x.v);
  const validIdx = valid.map(x => x.i);
  const slope = trendSlope(validVals);
  const mid = Math.floor(valid.length / 2);
  const firstHalf = valid.slice(0, mid).map(x => x.v);
  const secondHalf = valid.slice(mid).map(x => x.v);
  const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const meanY = validVals.reduce((a, b) => a + b, 0) / validVals.length;
  const meanX = validIdx.reduce((a, b) => a + b, 0) / validIdx.length;
  const intercept = meanY - slope * meanX;
  const trendLine = values.map((_, i) => slope * i + intercept);

  return {
    slope,
    weeklyChange: slope * 7,
    days: valid.length,
    firstAvg: avg1,
    secondAvg: avg2,
    labels,
    values,
    trendLine,
  };
}

export function periodComparison(db: HabitsDatabase): PeriodComparisonData {
  const base = todayISO();
  const calc = (offset: number, length: number): number | null => {
    const arr: number[] = [];
    for (let i = 0; i < length; i++) {
      const s = dayScore(db, addDaysISO(base, -(i + offset)));
      if (s !== null) arr.push(s);
    }
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  };
  return {
    last7: calc(0, 7),
    prev7: calc(7, 7),
    last30: calc(0, 30),
    prev30: calc(30, 30),
    last90: calc(0, 90),
    prev90: calc(90, 90),
  };
}

export function habitTrendCompare(db: HabitsDatabase): HabitTrendItem[] {
  const base = todayISO();
  const datesLast7: string[] = [];
  const datesPrev7: string[] = [];
  for (let i = 0; i < 7; i++) {
    datesLast7.push(addDaysISO(base, -i));
    datesPrev7.push(addDaysISO(base, -(i + 7)));
  }
  return db.habits.map(h => {
    const a = habitSuccessRate(db, h.id, datesLast7);
    const b = habitSuccessRate(db, h.id, datesPrev7);
    if (!a || !b) return { habit: h, current: a, prev: b, diff: null };
    return { habit: h, current: a, prev: b, diff: a.rate - b.rate };
  });
}

export function habitWeekdayPattern(
  db: HabitsDatabase,
  habitId: string
): Array<{ total: number; rate: number | null; fails: number }> {
  const wd = Array.from({ length: 7 }, () => ({ done: 0, fail: 0 }));
  for (const [d, rec] of Object.entries(db.records)) {
    const day = parseLocalDate(d).getDay();
    const s = getHabitRecord(rec, habitId)?.status;
    if (s === 'done') wd[day].done++;
    else if (s === 'fail') wd[day].fail++;
  }
  return wd.map(w => ({
    total: w.done + w.fail,
    rate: w.done + w.fail ? w.done / (w.done + w.fail) : null,
    fails: w.fail,
  }));
}

export function detectAlerts(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const base = todayISO();
  const win = db.alertConfig.window;
  const threshold = db.alertConfig.threshold;

  for (const h of db.habits) {
    const dates: string[] = [];
    for (let i = 0; i < win; i++) dates.push(addDaysISO(base, -i));
    const recent = habitSuccessRate(db, h.id, dates);
    if (!recent || recent.n < 3) continue;
    if (recent.rate < threshold) {
      const prevDates: string[] = [];
      for (let i = win; i < win * 2; i++) prevDates.push(addDaysISO(base, -i));
      const prev = habitSuccessRate(db, h.id, prevDates);
      const droppingFrom = Boolean(prev && prev.rate > recent.rate + 0.15);
      const severity = recent.rate < 0.3 ? 'high' : recent.rate < 0.5 ? 'medium' : 'low';
      const pct = Math.round(recent.rate * 100);
      const prevPct = prev ? Math.round(prev.rate * 100) : 0;

      alerts.push({
        id: `drop_${h.id}`,
        priority: severity === 'high' ? 1 : 2,
        severity,
        icon: severity === 'high' ? '🚨' : '⚠️',
        title: droppingFrom ? `Queda em ${h.name}` : `${h.name} em baixa`,
        descParts: droppingFrom
          ? ['Caiu de ', { bold: `${prevPct}%` }, ' para ', { bold: `${pct}%` }, ` nos últimos ${win} dias.`]
          : ['Apenas ', { bold: `${pct}%` }, ` de cumprimento nos últimos ${win} dias (${recent.done ?? 0}/${recent.n}).`],
      });
    }
  }

  // Dieta em queda
  const dietDates: string[] = [];
  for (let i = 0; i < win; i++) dietDates.push(addDaysISO(base, -i));
  const dietRecent = dietDates
    .map(d => dietDayScore(db, d, nutritionDays))
    .filter((s): s is number => s !== null);
  if (dietRecent.length >= 3) {
    const dietAvg = dietRecent.reduce((a, b) => a + b, 0) / dietRecent.length;
    if (dietAvg < threshold * 100) {
      alerts.push({
        id: 'diet_drop',
        priority: dietAvg < 30 ? 1 : 2,
        severity: dietAvg < 30 ? 'high' : 'medium',
        icon: '🥗',
        title: 'Dieta em baixa',
        descParts: [
          'Cumprimento médio de ',
          { bold: `${Math.round(dietAvg)}%` },
          ` nos últimos ${win} dias com dieta registrada (${dietRecent.length} dias).`,
        ],
      });
    }
  }

  // Refeição específica problemática
  const catalogMeals = getActiveMealsCatalog(base, db.dietPlan, nutritionDays);
  for (const meal of catalogMeals) {
    const r = mealComplianceRate(db, meal, nutritionDays);
    if (r && r.n >= 5 && r.rate < 50) {
      alerts.push({
        id: `meal_${meal.id}`,
        priority: 3,
        severity: 'low',
        icon: '🍽️',
        title: `${meal.name} é seu ponto fraco`,
        descParts: [
          'Apenas ',
          { bold: `${Math.round(r.rate)}%` },
          ` de cumprimento histórico nesta refeição (${r.n} registros).`,
        ],
      });
    }
  }

  // Streak em risco
  const streak = computeHabitStreak(db);
  const tScore = dayScore(db, base);
  if (streak >= 3 && (tScore === null || tScore < 100)) {
    const todayRec = db.records[base];
    const pendingHabits = db.habits.filter(h => {
      if (h.freq === 'weekly') return false;
      if (!isScheduled(h, base)) return false;
      const s = getHabitRecord(todayRec, h.id)?.status;
      return s !== 'done' && s !== 'skip';
    });
    if (pendingHabits.length > 0) {
      alerts.push({
        id: 'streak_risk',
        priority: 1,
        severity: 'high',
        icon: '🔥',
        title: `Streak de ${streak} dias em risco!`,
        descParts: [
          `${pendingHabits.length} hábito${pendingHabits.length > 1 ? 's' : ''} pendente${pendingHabits.length > 1 ? 's' : ''} hoje: `,
          { bold: pendingHabits.map(h => h.name).join(', ') },
          '.',
        ],
      });
    }
  }

  // Meta semanal apertada
  const todayWd = parseLocalDate(base).getDay();
  const daysIntoWeek = todayWd === 0 ? 7 : todayWd;
  for (const h of db.habits.filter(x => x.freq === 'weekly')) {
    const done = weeklyCount(db, h.id, base);
    if (done < h.times) {
      const remaining = h.times - done;
      const daysLeft = 7 - daysIntoWeek + 1;
      if (daysLeft <= remaining) {
        alerts.push({
          id: `weekly_${h.id}`,
          priority: daysLeft < remaining ? 1 : 2,
          severity: daysLeft < remaining ? 'high' : 'medium',
          icon: '⏰',
          title: `${h.name}: meta semanal apertada`,
          descParts: [
            'Faltam ',
            { bold: String(remaining) },
            ' sessões e só restam ',
            { bold: String(daysLeft) },
            ` dia${daysLeft > 1 ? 's' : ''} na semana.`,
          ],
        });
      }
    }
  }

  // Tags negativas
  for (const tag of db.contextTags) {
    for (const h of db.habits) {
      const imp = tagImpact(db, tag, h.id);
      if (imp && imp.nWith >= 3 && imp.nWithout >= 3 && imp.diff < -0.3) {
        alerts.push({
          id: `tag_${tag.replace(/\s/g, '_')}_${h.id}`,
          priority: 2,
          severity: 'medium',
          icon: '🏷️',
          title: `"${tag}" derruba ${h.name}`,
          descParts: [
            'Em dias com essa tag, você cumpre ',
            { bold: `${Math.round(imp.diff * 100)}%` },
            ' menos.',
          ],
        });
      }
    }
  }

  // Tendência geral em queda
  const t = overallTrend(db, 30);
  if (t && t.weeklyChange < -3) {
    alerts.push({
      id: 'overall_drop',
      priority: 1,
      severity: 'high',
      icon: '📉',
      title: 'Tendência geral em queda',
      descParts: [
        'Sua pontuação caiu ',
        { bold: `${Math.abs(t.weeklyChange).toFixed(1)}%` },
        ` por semana nos últimos ${t.days} dias.`,
      ],
    });
  }

  const nowMs = Date.now();
  const filtered = alerts.filter(
    a => !db.dismissedAlerts[a.id] || nowMs - db.dismissedAlerts[a.id] > 24 * 3600 * 1000
  );
  filtered.sort((a, b) => a.priority - b.priority);
  return filtered;
}

export function predictHabit(
  db: HabitsDatabase,
  habitId: string,
  targetDate: string,
  plannedTags: string[] = []
): HabitPrediction | null {
  const habit = db.habits.find(h => h.id === habitId);
  if (!habit) return null;

  const targetWd = parseLocalDate(targetDate).getDay();
  const factors: PredictionFactor[] = [];
  let baseProb = 0.5;
  let confidence = 0;

  const allDates = Object.keys(db.records);
  const overall = habitSuccessRate(db, habitId, allDates);
  if (overall && overall.n >= 5) {
    baseProb = overall.rate;
    confidence += 1;
    factors.push({ name: 'Histórico geral', value: overall.rate, weight: 1 });
  }

  const sameWdDates = allDates.filter(d => parseLocalDate(d).getDay() === targetWd);
  const sameWd = habitSuccessRate(db, habitId, sameWdDates);
  if (sameWd && sameWd.n >= 3) {
    factors.push({ name: `${WEEKDAYS[targetWd]}s`, value: sameWd.rate, weight: 2 });
    confidence += 2;
  }

  const base = todayISO();
  const recent7: string[] = [];
  for (let i = 1; i <= 7; i++) recent7.push(addDaysISO(base, -i));
  const recent = habitSuccessRate(db, habitId, recent7);
  if (recent && recent.n >= 3) {
    factors.push({ name: 'Últimos 7 dias', value: recent.rate, weight: 1.5 });
    confidence += 1.5;
  }

  let tagImpactSum = 0;
  let tagImpactCount = 0;
  for (const tag of plannedTags) {
    const imp = tagImpact(db, tag, habitId);
    if (imp && imp.nWith >= 2) {
      tagImpactSum += imp.diff;
      tagImpactCount++;
      factors.push({
        name: `Tag "${tag}"`,
        value: imp.withRate,
        weight: 1.5,
        isTag: true,
        diff: imp.diff,
      });
    }
  }

  if (habit.freq === 'weekly') {
    const done = weeklyCount(db, habitId, targetDate);
    const remaining = habit.times - done;
    if (remaining <= 0) {
      return {
        habit,
        probability: 0.3,
        confidence: 'media',
        factors,
        message: `Meta semanal já atingida (${done}/${habit.times})`,
        alreadyMet: true,
      };
    }
    const targetWdAdj = targetWd === 0 ? 7 : targetWd;
    const daysLeftInWeek = 7 - targetWdAdj + 1;
    const urgency = Math.min(1, remaining / daysLeftInWeek);
    factors.push({ name: 'Urgência semanal', value: 0.5 + urgency * 0.3, weight: 1 });
  }

  const weightedFactors = factors.filter(f => !f.isTag);
  let totalWeight = 0;
  let weightedSum = 0;
  for (const f of weightedFactors) {
    weightedSum += f.value * f.weight;
    totalWeight += f.weight;
  }
  let probability = totalWeight > 0 ? weightedSum / totalWeight : baseProb;
  if (tagImpactCount > 0) {
    const avgTagDiff = tagImpactSum / tagImpactCount;
    probability = Math.max(0, Math.min(1, probability + avgTagDiff * 0.6));
  }

  if (habit.freq === 'weekdays' && !habit.days.includes(targetWd)) {
    return {
      habit,
      probability: 0,
      confidence: 'alta',
      factors,
      message: `Não agendado para ${WEEKDAYS[targetWd]}`,
      notScheduled: true,
    };
  }

  const confidenceLabel = confidence >= 4 ? 'alta' : confidence >= 2 ? 'media' : 'baixa';
  return { habit, probability, confidence: confidenceLabel, factors };
}

export function dateRangeAvg(
  db: HabitsDatabase,
  startDate: string,
  endDate: string
): RangeAverage | null {
  const scores: number[] = [];
  const d = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  while (d <= end) {
    const s = dayScore(db, toLocalISODate(d));
    if (s !== null) scores.push(s);
    d.setDate(d.getDate() + 1);
  }
  return scores.length
    ? { avg: scores.reduce((a, b) => a + b, 0) / scores.length, n: scores.length }
    : null;
}

export function monthRange(year: number, month: number): MonthRangeInfo {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: toLocalISODate(start),
    end: toLocalISODate(end),
    label: `${MONTH_NAMES[month]}/${year}`,
  };
}

export function computeTemporalComparison(db: HabitsDatabase): TemporalComparisonData {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  const thisMonth = monthRange(curY, curM);
  const prevMonthY = curM === 0 ? curY - 1 : curY;
  const prevMonthM = curM === 0 ? 11 : curM - 1;
  const prevMonth = monthRange(prevMonthY, prevMonthM);

  const tm = dateRangeAvg(db, thisMonth.start, thisMonth.end);
  const pm = dateRangeAvg(db, prevMonth.start, prevMonth.end);

  const todayD = new Date();
  const startThis = new Date(todayD);
  startThis.setDate(startThis.getDate() - 29);
  const startLast = new Date(todayD);
  startLast.setFullYear(startLast.getFullYear() - 1);
  startLast.setDate(startLast.getDate() - 29);
  const endLast = new Date(todayD);
  endLast.setFullYear(endLast.getFullYear() - 1);

  const thisYearAvg = dateRangeAvg(db, toLocalISODate(startThis), toLocalISODate(todayD));
  const lastYearAvg = dateRangeAvg(db, toLocalISODate(startLast), toLocalISODate(endLast));

  const monthHistory: MonthHistoryCell[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(curY, curM - i, 1);
    const m = monthRange(d.getFullYear(), d.getMonth());
    const data = dateRangeAvg(db, m.start, m.end);
    if (data) {
      const prev = new Date(d);
      prev.setMonth(prev.getMonth() - 1);
      const pmInfo = monthRange(prev.getFullYear(), prev.getMonth());
      const prevData = dateRangeAvg(db, pmInfo.start, pmInfo.end);
      monthHistory.push({
        label: m.label,
        avg: data.avg,
        n: data.n,
        diffVsPrev: prevData ? data.avg - prevData.avg : null,
      });
    }
  }

  return {
    prevMonthLabel: prevMonth.label,
    thisMonthLabel: `${thisMonth.label} (atual)`,
    prevMonth: pm,
    thisMonth: tm,
    prevYearLabel: `${curY - 1} (mesmo período)`,
    thisYearLabel: `${curY} (atual)`,
    prevYear: lastYearAvg,
    thisYear: thisYearAvg,
    monthHistory,
  };
}

export function computeDietAnalysis(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): DietAnalysisData {
  const catalogMeals = getActiveMealsCatalog(todayISO(), db.dietPlan, nutritionDays);
  if (!catalogMeals.length) {
    return {
      hasPlan: false,
      daysCount: 0,
      avg: 0,
      best: null,
      worst: null,
      meals: [],
      bestWeekday: null,
      worstWeekday: null,
      dietStreak: 0,
    };
  }

  const dates = Object.keys(db.records);
  const dietScores = dates
    .map(d => dietDayScore(db, d, nutritionDays))
    .filter((s): s is number => s !== null);

  if (dietScores.length === 0) {
    return {
      hasPlan: true,
      daysCount: 0,
      avg: 0,
      best: null,
      worst: null,
      meals: [],
      bestWeekday: null,
      worstWeekday: null,
      dietStreak: 0,
    };
  }

  const avg = Math.round(dietScores.reduce((a, b) => a + b, 0) / dietScores.length);

  const mealAnalysis = catalogMeals
    .map(m => {
      const rate = mealComplianceRate(db, m, nutritionDays);
      return rate ? { meal: m, rate } : null;
    })
    .filter((x): x is { meal: DietMealPlan; rate: SuccessRate } => x !== null)
    .sort((a, b) => b.rate.rate - a.rate.rate);

  const best = mealAnalysis[0] || null;
  const worstCandidate = mealAnalysis[mealAnalysis.length - 1] || null;
  const worst = worstCandidate && worstCandidate.rate.rate < 80 ? worstCandidate : null;

  const wdScores: number[][] = Array.from({ length: 7 }, () => []);
  for (const d of dates) {
    const s = dietDayScore(db, d, nutritionDays);
    if (s !== null) wdScores[parseLocalDate(d).getDay()].push(s);
  }
  const wdAvg = wdScores
    .map((arr, i) => ({
      wd: i,
      avg: arr.length >= 2 ? arr.reduce((a, b) => a + b, 0) / arr.length : null,
    }))
    .filter((x): x is { wd: number; avg: number } => x.avg !== null);

  let bestWeekday: { wd: number; avg: number } | null = null;
  let worstWeekday: { wd: number; avg: number } | null = null;
  if (wdAvg.length >= 4) {
    const sortedWd = [...wdAvg].sort((a, b) => b.avg - a.avg);
    if (sortedWd[0].avg - sortedWd[sortedWd.length - 1].avg > 10) {
      bestWeekday = sortedWd[0];
      worstWeekday = sortedWd[sortedWd.length - 1];
    }
  }

  return {
    hasPlan: true,
    daysCount: dietScores.length,
    avg,
    best,
    worst,
    meals: mealAnalysis,
    bestWeekday,
    worstWeekday,
    dietStreak: computeDietStreak(db, nutritionDays),
  };
}

export function computeAutoInsights(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): AutoInsightItem[] {
  const insights: AutoInsightItem[] = [];
  const t = overallTrend(db, 30);
  if (t) {
    if (t.weeklyChange > 2) {
      insights.push({
        id: 'trend_up',
        type: 'positive',
        parts: [
          { bold: 'Em alta!' },
          ' Sua pontuação subiu cerca de ',
          { stat: `+${t.weeklyChange.toFixed(1)}%` },
          ' por semana.',
        ],
      });
    } else if (t.weeklyChange < -2) {
      insights.push({
        id: 'trend_down',
        type: 'negative',
        parts: [
          { bold: 'Tendência de queda.' },
          ' ',
          { stat: `${t.weeklyChange.toFixed(1)}%` },
          ' por semana.',
        ],
      });
    }
  }

  const dietScores = Object.keys(db.records)
    .map(d => dietDayScore(db, d, nutritionDays))
    .filter((s): s is number => s !== null);

  if (dietScores.length >= 5) {
    const dAvg = dietScores.reduce((a, b) => a + b, 0) / dietScores.length;
    if (dAvg >= 80) {
      insights.push({
        id: 'diet_high',
        type: 'positive',
        parts: [
          'Sua dieta está em ',
          { bold: 'excelente' },
          ' nível: média de ',
          { stat: `${Math.round(dAvg)}%` },
          ` em ${dietScores.length} dias.`,
        ],
      });
    } else if (dAvg < 50) {
      insights.push({
        id: 'diet_low',
        type: 'warning',
        parts: [
          'Sua dieta está ',
          { bold: 'abaixo do esperado' },
          `: ${Math.round(dAvg)}% de média. Vale revisar com seu nutricionista.`,
        ],
      });
    }
  }

  const catalogMeals = getActiveMealsCatalog(todayISO(), db.dietPlan, nutritionDays);
  if (catalogMeals.length) {
    const mealRates = catalogMeals
      .map(m => {
        const rate = mealComplianceRate(db, m, nutritionDays);
        return rate && rate.n >= 5 ? { name: m.name, rate } : null;
      })
      .filter((x): x is { name: string; rate: SuccessRate } => x !== null);
    if (mealRates.length) {
      const worst = mealRates.sort((a, b) => a.rate.rate - b.rate.rate)[0];
      if (worst.rate.rate < 60) {
        insights.push({
          id: 'worst_meal',
          type: 'warning',
          parts: [
            { bold: worst.name },
            ' é sua refeição mais difícil: apenas ',
            { stat: `${Math.round(worst.rate.rate)}%` },
            ' de cumprimento.',
          ],
        });
      }
    }
  }

  for (const h of db.habits) {
    const c = dietHabitCorrelation(db, h.id, nutritionDays);
    if (c && c.n >= 5 && c.r > 0.4) {
      insights.push({
        id: `corr_pos_${h.id}`,
        type: 'diet',
        parts: [
          'Quando você segue a dieta, também tende a cumprir ',
          { bold: h.name },
          ` (correlação +${c.r.toFixed(2)}). Use isso a seu favor!`,
        ],
      });
    } else if (c && c.n >= 5 && c.r < -0.4) {
      insights.push({
        id: `corr_neg_${h.id}`,
        type: 'warning',
        parts: [
          'Curiosamente, em dias de dieta apertada você cumpre menos ',
          { bold: h.name },
          ` (correlação ${c.r.toFixed(2)}).`,
        ],
      });
    }
  }

  const p = periodComparison(db);
  if (p.last7 !== null && p.prev7 !== null) {
    const diff = p.last7 - p.prev7;
    if (diff > 5) {
      insights.push({
        id: 'week_up',
        type: 'positive',
        parts: [
          'Esta semana: ',
          { stat: `${p.last7.toFixed(0)}%` },
          ` vs ${p.prev7.toFixed(0)}% anterior.`,
        ],
      });
    } else if (diff < -5) {
      insights.push({
        id: 'week_down',
        type: 'warning',
        parts: [
          'Esta semana caiu para ',
          { stat: `${p.last7.toFixed(0)}%` },
          '.',
        ],
      });
    }
  }

  const trends = habitTrendCompare(db).filter(
    (x): x is HabitTrendItem & { current: SuccessRate; diff: number } =>
      x.diff !== null && x.current !== null
  );
  if (trends.length) {
    const sorted = [...trends].sort((a, b) => b.diff - a.diff);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.diff > 0.1) {
      insights.push({
        id: `hab_up_${best.habit.id}`,
        type: 'positive',
        parts: [
          { bold: best.habit.name },
          ' subiu para ',
          { stat: `${Math.round(best.current.rate * 100)}%` },
          '.',
        ],
      });
    }
    if (worst.diff < -0.1) {
      insights.push({
        id: `hab_down_${worst.habit.id}`,
        type: 'warning',
        parts: [
          { bold: worst.habit.name },
          ' caiu para ',
          { stat: `${Math.round(worst.current.rate * 100)}%` },
          '.',
        ],
      });
    }
  }

  const streak = computeHabitStreak(db);
  if (streak >= 3) {
    insights.push({
      id: 'streak_active',
      type: 'positive',
      parts: [{ bold: `${streak} dias consecutivos` }, ' com 100%!'],
    });
  }

  return insights;
}

export function computeCorrelations(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): CorrelationPair[] {
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < db.habits.length; i++) {
    for (let j = i + 1; j < db.habits.length; j++) {
      const c = habitCorrelation(db, db.habits[i].id, db.habits[j].id);
      if (c && Math.abs(c.r) > 0.05) {
        pairs.push({
          a: db.habits[i].name,
          b: db.habits[j].name,
          r: c.r,
          n: c.n,
          type: 'habit',
        });
      }
    }
  }

  for (const h of db.habits) {
    const c = dietHabitCorrelation(db, h.id, nutritionDays);
    if (c && Math.abs(c.r) > 0.1) {
      pairs.push({ a: 'Dieta', b: h.name, r: c.r, n: c.n, type: 'diet' });
    }
  }

  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  return pairs.slice(0, 12);
}

export function computeTagImpacts(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): TagImpactItem[] {
  const allImpacts: TagImpactItem[] = [];
  const dates = Object.keys(db.records);

  for (const tag of db.contextTags) {
    for (const h of db.habits) {
      const imp = tagImpact(db, tag, h.id);
      if (imp && Math.abs(imp.diff) > 0.05) {
        allImpacts.push({ tag, habit: h.name, ...imp });
      }
    }

    let withSum = 0;
    let withN = 0;
    let withoutSum = 0;
    let withoutN = 0;
    for (const d of dates) {
      const score = dietDayScore(db, d, nutritionDays);
      if (score === null) continue;
      const hasTag = (db.records[d]?.tags || []).includes(tag);
      if (hasTag) {
        withSum += score;
        withN++;
      } else {
        withoutSum += score;
        withoutN++;
      }
    }
    if (withN >= 2 && withoutN >= 2) {
      const withRate = withSum / withN / 100;
      const withoutRate = withoutSum / withoutN / 100;
      const diff = withRate - withoutRate;
      if (Math.abs(diff) > 0.05) {
        allImpacts.push({
          tag,
          habit: 'Dieta',
          withRate,
          withoutRate,
          diff,
          nWith: withN,
          nWithout: withoutN,
        });
      }
    }
  }

  allImpacts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return allImpacts.slice(0, 15);
}

export function computeWeekdayPatterns(db: HabitsDatabase): WeekdayPatternItem[] {
  const items: WeekdayPatternItem[] = [];
  for (const h of db.habits) {
    const wd = habitWeekdayPattern(db, h.id);
    const totalFails = wd.reduce((a, b) => a + b.fails, 0);
    if (!totalFails) continue;
    const worstDay = wd
      .map((w, i) => ({ i, fails: w.fails }))
      .sort((a, b) => b.fails - a.fails)[0];
    if (worstDay.fails === 0) continue;
    items.push({
      habitName: h.name,
      worstWeekdayIdx: worstDay.i,
      failsOnWorst: worstDay.fails,
      totalFails,
      pct: Math.round((worstDay.fails / totalFails) * 100),
    });
  }
  return items;
}

export function computeDashboardStats(
  db: HabitsDatabase,
  nutritionDays: MealPlanDay[] | null
): DashboardStats {
  const base = todayISO();
  const todayScore = dayScore(db, base);
  const streak = computeHabitStreak(db);

  const dates = Object.keys(db.records).sort();
  const scores = dates
    .map(d => ({ d, s: dayScore(db, d) }))
    .filter((x): x is { d: string; s: number } => x.s !== null);

  const overallAvg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b.s, 0) / scores.length)
    : 0;

  let totalFails = 0;
  for (const r of Object.values(db.records)) {
    for (const [, entry] of iterHabitRecords(r)) {
      if (entry.status === 'fail') totalFails++;
    }
  }

  const bestDay = scores.length ? scores.reduce((a, b) => (a.s > b.s ? a : b)) : null;
  const worstDay = scores.length ? scores.reduce((a, b) => (a.s < b.s ? a : b)) : null;

  const dietToday = dietDayScore(db, base, nutritionDays);
  const dietScores = dates
    .map(d => dietDayScore(db, d, nutritionDays))
    .filter((s): s is number => s !== null);
  const dietAvg = dietScores.length
    ? Math.round(dietScores.reduce((a, b) => a + b, 0) / dietScores.length)
    : null;
  const dietStreak = computeDietStreak(db, nutritionDays);

  const catalogMeals = getActiveMealsCatalog(base, db.dietPlan, nutritionDays);
  const mealRatesWithNull = catalogMeals.map(m => ({
    name: m.name,
    rate: mealComplianceRate(db, m, nutritionDays),
  }));
  const validMealRates = mealRatesWithNull.filter(
    (x): x is { name: string; rate: SuccessRate } => x.rate !== null
  );
  const bestMeal = validMealRates.length
    ? (() => {
        const b = [...validMealRates].sort((x, y) => y.rate.rate - x.rate.rate)[0];
        return { name: b.name, pct: Math.round(b.rate.rate) };
      })()
    : null;

  const last30Dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    last30Dates.push(addDaysISO(base, -i));
  }
  const last30HabitScores = last30Dates.map(d => dayScore(db, d));
  const last30DietScores = last30Dates.map(d => dietDayScore(db, d, nutritionDays));

  const mealRates = mealRatesWithNull.map(m => ({
    name: m.name,
    pct: m.rate ? Math.round(m.rate.rate) : 0,
  }));

  const habitStats = db.habits.map(h => {
    let done = 0;
    let expected = 0;
    if (h.freq === 'weekly') {
      const weeksWithData = new Set<string>();
      for (const d of Object.keys(db.records)) weeksWithData.add(weekStart(d));
      for (const mon of weeksWithData) {
        const wDone = weekDates(mon).reduce(
          (acc, d) => acc + (getHabitRecord(db.records[d], h.id)?.status === 'done' ? 1 : 0),
          0
        );
        done += Math.min(wDone, h.times);
        expected += h.times;
      }
    } else {
      for (const d of Object.keys(db.records)) {
        if (!isScheduled(h, d)) continue;
        const s = getHabitRecord(db.records[d], h.id)?.status;
        if (s === 'skip') continue;
        expected++;
        if (s === 'done') done++;
      }
    }
    return { name: h.name, pct: expected ? Math.round((done / expected) * 100) : 0 };
  });

  const wdScores: number[][] = Array.from({ length: 7 }, () => []);
  const wdFails: number[] = Array<number>(7).fill(0);
  for (const { d, s } of scores) {
    wdScores[parseLocalDate(d).getDay()].push(s);
  }
  for (const [d, rec] of Object.entries(db.records)) {
    const wd = parseLocalDate(d).getDay();
    for (const [, entry] of iterHabitRecords(rec)) {
      if (entry.status === 'fail') wdFails[wd]++;
    }
  }
  const weekdayAvg = wdScores.map(arr =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  );

  const reasonMap = new Map<string, number>();
  const mealFailMap = new Map<string, number>();
  for (const rec of Object.values(db.records)) {
    for (const [, entry] of iterHabitRecords(rec)) {
      if (entry.status === 'fail') {
        if (entry.reason) reasonMap.set(entry.reason, (reasonMap.get(entry.reason) || 0) + 1);
        if (entry.meal) mealFailMap.set(entry.meal, (mealFailMap.get(entry.meal) || 0) + 1);
      }
    }
  }
  const reasonCounts = Array.from(reasonMap.entries()).map(([label, count]) => ({ label, count }));
  const mealFailCounts = Array.from(mealFailMap.entries()).map(([label, count]) => ({ label, count }));

  const matrix = new Map<string, number[]>();
  for (const h of db.habits) {
    matrix.set(h.id, Array<number>(7).fill(0));
  }
  for (const [d, rec] of Object.entries(db.records)) {
    const wd = parseLocalDate(d).getDay();
    for (const [hid, entry] of iterHabitRecords(rec)) {
      const row = matrix.get(hid);
      if (entry.status === 'fail' && row) {
        row[wd]++;
      }
    }
  }

  let heatmapMax = 0;
  const heatmapRows = db.habits.map(h => {
    const counts = matrix.get(h.id) || Array<number>(7).fill(0);
    for (const v of counts) {
      if (v > heatmapMax) heatmapMax = v;
    }
    return { habitId: h.id, habitName: h.name, counts };
  });

  return {
    todayScore,
    streak,
    overallAvg,
    totalFails,
    bestDay,
    worstDay,
    dietToday,
    dietAvg,
    dietStreak,
    bestMeal,
    last30Dates,
    last30HabitScores,
    last30DietScores,
    mealRates,
    habitStats,
    weekdayAvg,
    weekdayFails: wdFails,
    reasonCounts,
    mealFailCounts,
    heatmapRows,
    heatmapMax,
  };
}

export function computeWorkoutWeekSummary(
  workoutLog: WorkoutLog | undefined,
  workoutGoalPerWeek: number | undefined
): WorkoutWeekSummary {
  const log = workoutLog || {};
  const goal = workoutGoalPerWeek && workoutGoalPerWeek > 0 ? workoutGoalPerWeek : 3;
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toLocalISODate(d);
    if (log[key]) done++;
  }
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return { done, goal, pct, met: done >= goal };
}

export function performGlobalSearch(
  query: string,
  db: HabitsDatabase,
  bodyMetrics: BodyMetric[],
  nutritionDays: MealPlanDay[] | null
): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  for (const h of db.habits) {
    if (h.name.toLowerCase().includes(q)) {
      results.push({
        id: `hab_${h.id}`,
        kind: 'habit',
        title: h.name,
        subtitle: 'Hábito',
        value: '',
        targetPanel: 'today',
      });
    }
  }

  for (const m of bodyMetrics) {
    const haystack = `${m.notes || ''} ${m.recorded_at || ''} ${fmtDate(m.recorded_at)}`.toLowerCase();
    if (haystack.includes(q)) {
      const parts: string[] = [];
      if (m.weight_kg != null) parts.push(`${m.weight_kg}kg`);
      if (m.muscle_pct != null) parts.push(`${m.muscle_pct}% músculo`);
      if (m.fat_pct != null) parts.push(`${m.fat_pct}% gordura`);
      results.push({
        id: `body_${m.id}`,
        kind: 'body',
        title: m.notes || 'Medição',
        subtitle: `Corpo · ${fmtDate(m.recorded_at)}`,
        value: parts.join(' · '),
        targetPanel: 'body',
        targetDate: m.recorded_at,
      });
    }
  }

  const seenFoodKeys = new Set<string>();
  const allMeals: DietMealPlan[] = [];
  if (nutritionDays && nutritionDays.length > 0) {
    for (let wd = 0; wd < 7; wd++) {
      for (const m of getEffectiveDietPlanForDate(
        addDaysISO(weekStart(todayISO()), wd),
        db.dietPlan,
        nutritionDays
      )) {
        allMeals.push(m);
      }
    }
  } else {
    allMeals.push(...getActiveMealsCatalog(todayISO(), db.dietPlan, null));
  }

  for (const meal of allMeals) {
    for (const opt of meal.options || []) {
      for (const food of opt.foods || []) {
        const haystack = `${food.name || ''} ${meal.name || ''}`.toLowerCase();
        if (haystack.includes(q)) {
          const dedupeKey = `${meal.name.toLowerCase()}::${food.name.toLowerCase()}::${food.amount}`;
          if (seenFoodKeys.has(dedupeKey)) continue;
          seenFoodKeys.add(dedupeKey);
          results.push({
            id: `food_${dedupeKey}`,
            kind: 'diet',
            title: food.name,
            subtitle: `Dieta · ${meal.name}`,
            value: food.amount || '',
            targetPanel: 'diet',
          });
        }
      }
    }
  }

  return results.slice(0, 50);
}
