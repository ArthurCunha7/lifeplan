import 'react';

// src/types.ts — Tipos centrais compartilhados do LifePlan

export type Sex = 'M' | 'F';
export type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso';
export type NutritionGoal = 'emagrecer_rapido' | 'emagrecer' | 'manter' | 'ganhar_massa' | 'ganhar_rapido';
export type WorkoutKind = 'strength' | 'cardio' | 'rest';

export type ScreenId =
  | 'loading'
  | 'login'
  | 'register'
  | 'reset-password'
  | 'profile'
  | 'home'
  | 'nutrition'
  | 'shopping'
  | 'treinos'
  | 'estudos'
  | 'timetable'
  | 'financas'
  | 'habitos';

export interface UserProfile {
  id?: string;
  name?: string;
  weight: number | string;
  height: number | string;
  age: number | string;
  sex: Sex;
  activity: ActivityLevel;
  goal: NutritionGoal;
}

export interface TacoFood {
  id: number;
  n: string;
  c: string;
  e: number;
  p: number;
  l: number;
  cb: number;
}

export interface TacoSearchResult extends TacoFood {
  score: number;
}

export interface MealFoodItem {
  id: string;
  name: string;
  qty: number;
  tacoId?: number;
  kcal: number;
  p: number;
  l: number;
  cb: number;
}

export interface MealEntry {
  time: string;
  name: string;
  icon: string;
  foods: MealFoodItem[];
}

export interface MealPlanDay {
  id: number;
  name: string;
  short: string;
  fullName: string;
  type: WorkoutKind;
  typeLabel: string;
  detail?: string;
  exercises: string;
  calories: number;
  burned: number;
  meals: MealEntry[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  qty: number;
  kcal: number;
  checked: boolean;
}

export interface WorkoutProfile {
  id: string;
  type: WorkoutKind;
  typeLabel: string;
  detail?: string;
  exercises: string;
  color?: string;
}

export interface WaterData {
  date: string;
  goal: number;
  current: number;
}

export interface ManualAgendaItem {
  id: string;
  title: string;
  time: string;
}

export interface TimetableRow {
  id: string;
  label: string;
}

export interface TimetableData {
  rows: TimetableRow[];
  cells: Record<string, string>;
}

export type WorkoutLog = Record<string, boolean>;

export interface UserPlanDataBlob {
  [dayIndex: string]: unknown;
  shopping?: ShoppingItem[];
  workoutProfiles?: WorkoutProfile[];
  workoutGoalPerWeek?: number;
  workoutLog?: WorkoutLog;
  water?: WaterData;
  agendaManual?: ManualAgendaItem[];
  timetable?: TimetableData;
}

// ── Finanças (cache localStorage cf_state e fórmulas compartilhadas) ──────────
export interface FinanceRow {
  id?: string;
  date?: string;
  name?: string;
  desc?: string;
  parcelas?: string;
  value?: number | string;
  profileIdx?: number | null;
  category?: string | null;
  family?: boolean;
  receiptPath?: string;
}

export interface Fatura {
  id: string;
  name?: string;
  fechamento?: string;
  vencimento?: string;
  family?: boolean;
  who?: string;
  rows?: FinanceRow[];
}

export interface FinancePayment {
  id?: string;
  profileIdx?: number | null;
  desc?: string;
  value?: number | string;
  date?: string;
}

export interface BalancoColumn {
  id: string;
  name?: string;
  type: 'text' | 'number';
}

export interface BalancoCustomRow {
  id?: string;
  values?: Record<string, string | number>;
}

export interface PlanejamentoRow {
  id?: string;
  categoria?: string;
  profileIdx?: number | null;
  valor?: number | string;
}

export interface BalancoTable {
  id?: string;
  name?: string;
  icon?: string;
  type: 'entradas' | 'lancamentos' | 'faturas_auto' | 'planejamento' | 'custom' | string;
  sign?: number;
  includeInSaldo?: boolean;
  columns?: BalancoColumn[];
  rows?: Array<BalancoCustomRow & PlanejamentoRow>;
}

export type FinanceProfileEntry = string | { name?: string; linkedUserId?: string | null };

export interface FinanceState {
  profiles?: FinanceProfileEntry[];
  faturas?: Fatura[];
  pixRows?: FinanceRow[];
  payments?: FinancePayment[];
  balancoTables?: BalancoTable[];
  entradasProfiles?: Record<number, boolean>;
}

export interface FinanceFormulasApi {
  version: number;
  cfGetAllRowsByProfile(state: FinanceState, pIdx: number): FinanceRow[];
  cfComputeEntradasTotal(state: FinanceState): number;
  cfComputeGastoCategoria(state: FinanceState, profileIdx: number, categoria: string): number;
  cfGetTableTotal(state: FinanceState, t: BalancoTable): number;
}

// ── Hábitos / Dieta e Estudos (cache localStorage para resumos e cruzamentos) ─
export interface DietMealRecord {
  followed?: 'full' | 'partial' | 'no' | 'skip' | null;
  note?: string;
  optionId?: string;
  foods?: Record<number, boolean>;
}

export interface HabitStatusRecord {
  status?: 'done' | 'fail' | 'skip' | null;
  reason?: string;
  meal?: string;
  note?: string;
}

export interface DayHabitRecord {
  tags?: string[];
  diet?: {
    meals?: Record<string, DietMealRecord>;
    overallNote?: string;
  };
  [habitId: string]: unknown;
}

export interface HabitsDb {
  records?: Record<string, DayHabitRecord>;
}

export interface StudySubject {
  id: string;
  name: string;
  pass?: number;
  max?: number;
  stages?: number;
}

export interface StudySession {
  id?: string;
  subjectId?: string;
  date?: string;
  hours?: number | string;
  topic?: string;
}

export interface StudyEvent {
  id?: string;
  title?: string;
  type?: 'prova' | 'trabalho' | 'outro' | string;
  subjectId?: string;
  date?: string;
  desc?: string;
}

export interface StudyData {
  subjects?: StudySubject[];
  studies?: StudySession[];
  events?: StudyEvent[];
}

// ── Notificações ──────────────────────────────────────────────────────────────
export type NotificationKind = 'gasto' | 'mes_fechado' | 'mes_pago' | 'familia_entrada' | 'vencimento' | string;

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  data?: {
    total?: number;
    teste?: boolean;
    fatura_id?: string;
    due?: string;
    dias?: number;
    [key: string]: unknown;
  } | null;
  dedupe_key?: string | null;
  read_at?: string | null;
  created_at: string;
}

export type PushStatus =
  | 'ligado'
  | 'desligado'
  | 'bloqueado'
  | 'nao-configurado'
  | 'ios-instalar'
  | 'sem-suporte';

// ── Declarações globais do navegador / React 18 ───────────────────────────────
declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: '' | boolean;
  }
}

declare global {
  interface Window {
    FinanceFormulas?: FinanceFormulasApi;
    __LIFEPLAN_SUPABASE__?: {
      url: string;
      anonKey: string;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number }) => void;
            error_callback?: () => void;
          }): {
            requestAccessToken(overrideConfig?: { prompt?: string }): void;
          };
        };
      };
    };
  }

  interface Navigator {
    standalone?: boolean;
  }
}
