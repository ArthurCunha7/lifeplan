// src/planDataQueue.ts — Fila central de salvamento (user_plans.plan_data) e isolamento de cache local por conta
import { supabase, saveUserPlan, invalidateUserPlanCache } from './supabaseClient';
import type { MealPlanDay } from './types';

// Todas as partes do app que gravam em user_plans (plano, compras, treinos,
// água, agenda manual, quadro de horários, treino-feito) passam por AQUI,
// em vez de cada uma fazer sua própria leitura-mescla-escrita. Isso elimina
// de vez a corrida entre gravações concorrentes: nunca duas escritas ao
// mesmo tempo, e cada escrita sempre usa o valor mais atual de cada campo
// (via "getters" que leem refs sempre atualizadas), nunca uma cópia presa
// de quando foi agendada.
interface PlanDataQueueState {
  pending: boolean;
  dirty: boolean;
  userId: string | null;
  getters: Record<string, () => unknown>;
  inFlight: Promise<void> | null;
}

export const planDataQueue: PlanDataQueueState = {
  pending: false,
  dirty: false,
  userId: null,
  getters: {},
  inFlight: null,
};

// Chaves de cache/tokens da conta logada neste aparelho — apagadas ao sair da
// conta, ao errar o PIN demais ou ao entrar com outra conta no mesmo navegador
// (mantendo preferências do aparelho como tema claro/escuro e hideValues).
export const USER_LOCAL_KEYS: readonly string[] = [
  'cf_state', 'cf_state_uid',
  'studyApp', 'studyApp_uid',
  'habitsAppV4', 'habitsAppV4_uid', 'habitsAppV3', 'habitsAppV2', 'habitsAppV1',
  'water_v1', 'water_v1_uid',
  'agenda_manual', 'agenda_manual_uid',
  'timetable_v2', 'timetable_v2_uid',
  'gcal_token', 'gcal_token_expiry',
  'lifeplan_last_uid',
];

export function clearUserLocalData(): void {
  planDataQueue.userId = null;
  planDataQueue.dirty = false;
  invalidateUserPlanCache();
  try { USER_LOCAL_KEYS.forEach(k => localStorage.removeItem(k)); } catch { /* ignora */ }
  try { sessionStorage.removeItem('cf_cloud_synced'); sessionStorage.removeItem('lifeplan_screen'); } catch { /* ignora */ }
}

export function ensureUserLocalScope(uid?: string | null): void {
  if (!uid) return;
  try {
    const prev = localStorage.getItem('lifeplan_last_uid');
    if (prev && prev !== uid) clearUserLocalData();
    localStorage.setItem('lifeplan_last_uid', uid);
  } catch { /* ignora */ }
}

export function readScopedLocal<T = unknown>(key: string, userId?: string | null): T | null {
  try {
    const owner = localStorage.getItem(key + '_uid') || localStorage.getItem('lifeplan_last_uid');
    if (userId && owner && owner !== userId) return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function registerPlanDataField(key: string, getter: () => unknown): () => void {
  planDataQueue.getters[key] = getter;
  return () => {
    if (planDataQueue.getters[key] === getter) delete planDataQueue.getters[key];
  };
}

export function requestPlanDataSave(userId?: string | null): void {
  if (!userId) return;
  planDataQueue.userId = userId;
  planDataQueue.dirty = true;
  if (planDataQueue.pending) return; // já tem uma gravação em andamento — ela pega essa mudança na próxima volta
  planDataQueue.inFlight = runPlanDataQueue();
}

// Espera qualquer gravação pendente da fila terminar antes de salvar o plano
// gerado em Perfil, evitando corrida entre a saída da aba anterior e o novo plano.
export async function flushAndSaveUserPlan(userId: string, plan: MealPlanDay[]): Promise<void> {
  if (planDataQueue.inFlight) {
    try { await planDataQueue.inFlight; } catch { /* ignora */ }
  }
  await saveUserPlan(userId, plan);
}

export async function runPlanDataQueue(): Promise<void> {
  if (!planDataQueue.userId || planDataQueue.pending) return;
  planDataQueue.pending = true;
  try {
    while (planDataQueue.dirty) {
      planDataQueue.dirty = false;
      const userId = planDataQueue.userId;
      if (!userId) break;
      try {
        const { data: existing, error: readErr } = await supabase
          .from('user_plans')
          .select('plan_data')
          .eq('user_id', userId)
          .maybeSingle();
        if (readErr) throw readErr;
        const patch: Record<string, unknown> = {};
        for (const [key, getter] of Object.entries(planDataQueue.getters)) {
          const val = getter();
          if (val === undefined) continue;
          if (key === 'plan') Object.assign(patch, (val as MealPlanDay[] | null) || []); // plano é array -> vira chaves numéricas 0-6
          else patch[key] = val;
        }
        const plan_data = { ...((existing?.plan_data as Record<string, unknown> | null) || {}), ...patch };
        const { error: writeErr } = await supabase
          .from('user_plans')
          .upsert({ user_id: userId, plan_data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (writeErr) throw writeErr;
        invalidateUserPlanCache();
      } catch (e) {
        console.error('Erro ao salvar dados do LifePlan:', e);
      }
    }
  } finally {
    planDataQueue.pending = false;
    planDataQueue.inFlight = null;
  }
}
