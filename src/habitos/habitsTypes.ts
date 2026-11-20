// src/habitos/habitsTypes.ts — Tipos estritos do módulo Hábitos, Dieta e Composição Corporal

export type PanelId =
  | 'today'
  | 'diet'
  | 'body'
  | 'dashboard'
  | 'insights'
  | 'history'
  | 'settings';

export type MainTabId = Exclude<PanelId, 'settings'>;

export type CloudSyncState = 'idle' | 'sync' | 'ok' | 'err';

export interface CloudStatus {
  text: string;
  state: CloudSyncState;
}

export type HabitFrequency = 'daily' | 'weekdays' | 'weekly';
export type HabitStatus = 'done' | 'fail' | 'skip';
export type MealComplianceStatus = 'full' | 'partial' | 'no' | 'skip';

export interface Habit {
  id: string;
  name: string;
  perMeal: boolean;
  freq: HabitFrequency;
  days: number[];
  times: number;
}

export interface DietFood {
  name: string;
  amount: string;
}

export interface DietMealOption {
  id: string;
  name: string;
  foods: DietFood[];
}

export interface DietMealPlan {
  id: string;
  name: string;
  time?: string;
  emoji?: string;
  options: DietMealOption[];
  foods?: DietFood[];
  custom?: boolean;
}

export interface HabitEntryRecord {
  status?: HabitStatus | null;
  reason?: string;
  meal?: string;
  note?: string;
}

export interface DietMealEntryRecord {
  followed?: MealComplianceStatus | null;
  note?: string;
  optionId?: string;
  foods?: Record<number, boolean>;
}

export interface DayDietRecord {
  meals: Record<string, DietMealEntryRecord>;
  overallNote?: string;
}

export interface DayRecord {
  tags?: string[];
  diet?: DayDietRecord;
  [habitId: string]: HabitEntryRecord | string[] | DayDietRecord | undefined;
}

export interface AlertConfig {
  threshold: number;
  window: number;
}

export interface HabitsDatabase {
  habits: Habit[];
  contextTags: string[];
  reasons: string[];
  meals: string[];
  dietPlan: DietMealPlan[];
  records: Record<string, DayRecord>;
  alertConfig: AlertConfig;
  dismissedAlerts: Record<string, number>;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  recorded_at: string;
  weight_kg: number | null;
  muscle_pct: number | null;
  fat_pct: number | null;
  notes: string | null;
  photo_path?: string | null;
  created_at?: string;
}

export interface WorkoutWeekSummary {
  done: number;
  goal: number;
  pct: number;
  met: boolean;
}

export type RichTextPart =
  | string
  | { bold: string }
  | { stat: string };

export type AlertSeverity = 'high' | 'medium' | 'low';

export interface AlertItem {
  id: string;
  priority: number;
  severity: AlertSeverity;
  icon: string;
  title: string;
  descParts: RichTextPart[];
}

export interface SuccessRate {
  rate: number;
  n: number;
  done?: number;
}

export interface PredictionFactor {
  name: string;
  value: number;
  weight: number;
  isTag?: boolean;
  diff?: number;
}

export interface HabitPrediction {
  habit: Habit;
  probability: number;
  confidence: 'alta' | 'media' | 'baixa';
  factors: PredictionFactor[];
  message?: string;
  notScheduled?: boolean;
  alreadyMet?: boolean;
}

export interface RangeAverage {
  avg: number;
  n: number;
}

export interface MonthRangeInfo {
  start: string;
  end: string;
  label: string;
}

export interface MonthHistoryCell {
  label: string;
  avg: number;
  n: number;
  diffVsPrev: number | null;
}

export interface TemporalComparisonData {
  prevMonthLabel: string;
  thisMonthLabel: string;
  prevMonth: RangeAverage | null;
  thisMonth: RangeAverage | null;
  prevYearLabel: string;
  thisYearLabel: string;
  prevYear: RangeAverage | null;
  thisYear: RangeAverage | null;
  monthHistory: MonthHistoryCell[];
}

export interface MealAnalysisItem {
  meal: DietMealPlan;
  rate: SuccessRate;
}

export interface DietAnalysisData {
  hasPlan: boolean;
  daysCount: number;
  avg: number;
  best: MealAnalysisItem | null;
  worst: MealAnalysisItem | null;
  meals: MealAnalysisItem[];
  bestWeekday: { wd: number; avg: number } | null;
  worstWeekday: { wd: number; avg: number } | null;
  dietStreak: number;
}

export type InsightTone = 'positive' | 'negative' | 'warning' | 'info' | 'diet';

export interface AutoInsightItem {
  id: string;
  type: InsightTone;
  parts: RichTextPart[];
}

export interface OverallTrendData {
  slope: number;
  weeklyChange: number;
  days: number;
  firstAvg: number;
  secondAvg: number;
  labels: string[];
  values: Array<number | null>;
  trendLine: number[];
}

export interface PeriodComparisonData {
  last7: number | null;
  prev7: number | null;
  last30: number | null;
  prev30: number | null;
  last90: number | null;
  prev90: number | null;
}

export interface HabitTrendItem {
  habit: Habit;
  current: SuccessRate | null;
  prev: SuccessRate | null;
  diff: number | null;
}

export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
  n: number;
  type: 'habit' | 'diet';
}

export interface TagImpactItem {
  tag: string;
  habit: string;
  withRate: number;
  withoutRate: number;
  diff: number;
  nWith: number;
  nWithout: number;
}

export interface WeekdayPatternItem {
  habitName: string;
  worstWeekdayIdx: number;
  failsOnWorst: number;
  totalFails: number;
  pct: number;
}

export interface DashboardStats {
  todayScore: number | null;
  streak: number;
  overallAvg: number;
  totalFails: number;
  bestDay: { d: string; s: number } | null;
  worstDay: { d: string; s: number } | null;
  dietToday: number | null;
  dietAvg: number | null;
  dietStreak: number;
  bestMeal: { name: string; pct: number } | null;
  last30Dates: string[];
  last30HabitScores: Array<number | null>;
  last30DietScores: Array<number | null>;
  mealRates: Array<{ name: string; pct: number }>;
  habitStats: Array<{ name: string; pct: number }>;
  weekdayAvg: number[];
  weekdayFails: number[];
  reasonCounts: Array<{ label: string; count: number }>;
  mealFailCounts: Array<{ label: string; count: number }>;
  heatmapRows: Array<{ habitId: string; habitName: string; counts: number[] }>;
  heatmapMax: number;
}

export interface SearchResultItem {
  id: string;
  kind: 'habit' | 'body' | 'diet';
  title: string;
  subtitle: string;
  value: string;
  targetPanel: MainTabId;
  targetDate?: string;
}
