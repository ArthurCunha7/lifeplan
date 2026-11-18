import { createClient } from '@supabase/supabase-js';
import type { MealPlanDay, UserPlanDataBlob } from './types';

// ── Configuração ─────────────────────────────────────────────────────────────
// Crie um projeto gratuito em https://supabase.com, depois em
// "Project Settings > API" copie a URL e a chave "anon public".
// Cole aqui embaixo OU crie um arquivo .env na raiz do projeto com:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // guarda a sessão no localStorage deste dispositivo
    autoRefreshToken: true,     // renova o token sozinho, em segundo plano
    detectSessionInUrl: true,   // necessário pro redirect do login com Google funcionar
    storage: window.localStorage,
  },
});

// Expõe a configuração na janela principal para as páginas do mesmo domínio em
// iframe (Estudos, Finanças, Hábitos), evitando passar chaves na URL (?sbKey=...).
if (typeof window !== 'undefined') {
  window.__LIFEPLAN_SUPABASE__ = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

// ── Autenticação ─────────────────────────────────────────────────────────────
export async function signUp({ email, password, name }: { email: string; password: string; name?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name || '' } },
  });
  if (error) throw error;
  const userId = data.user?.id;
  // Só grava em "profiles" quando já há sessão ativa (sem confirmação de e-mail pendente),
  // pois a RLS exige auth.uid() = id. O nome também fica salvo em user_metadata.
  if (userId && data.session) {
    const { error: profErr } = await supabase.from('profiles').upsert({ id: userId, name: name || '' });
    if (profErr) console.error('Erro ao criar perfil inicial:', profErr);
  }
  return data;
}

export async function signIn({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── Plano (nutrição + treino) ────────────────────────────────────────────────
// Deduplica leituras simultâneas de user_plans.plan_data (ex.: HomeDashboard +
// hooks de água/agenda/horários montando juntos disparam apenas 1 SELECT em vez de 5).
interface PlanCacheEntry {
  userId: string | null;
  at: number;
  promise: Promise<UserPlanDataBlob | null> | null;
  data: UserPlanDataBlob | null;
}

let _planCache: PlanCacheEntry = { userId: null, at: 0, promise: null, data: null };
const PLAN_CACHE_TTL_MS = 2500;

export function invalidateUserPlanCache(): void {
  _planCache = { userId: null, at: 0, promise: null, data: null };
}

export async function fetchUserPlanData(
  userId: string | null | undefined,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<UserPlanDataBlob | null> {
  if (!userId) return null;
  const now = Date.now();
  if (!fresh && _planCache.userId === userId) {
    if (_planCache.promise) return _planCache.promise;
    if (now - _planCache.at < PLAN_CACHE_TTL_MS) return _planCache.data;
  }
  const p: Promise<UserPlanDataBlob | null> = Promise.resolve(
    supabase
      .from('user_plans')
      .select('plan_data')
      .eq('user_id', userId)
      .maybeSingle()
  )
    .then(({ data, error }) => {
      if (error) throw error;
      const pd = (data?.plan_data as UserPlanDataBlob | null) || null;
      if (_planCache.promise === p) {
        _planCache = { userId, at: Date.now(), promise: null, data: pd };
      }
      return pd;
    })
    .catch((err) => {
      if (_planCache.promise === p) invalidateUserPlanCache();
      throw err;
    });
  _planCache = { userId, at: now, promise: p, data: null };
  return p;
}

export function extractPlanDays(pd: UserPlanDataBlob | null | undefined): MealPlanDay[] | null {
  if (!pd) return null;
  const days = Object.keys(pd)
    .filter(k => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b))
    .map(k => pd[k] as MealPlanDay);
  return days.length ? days : null;
}

// O App guarda o array de 7 dias espalhado como chaves numéricas dentro
// de plan_data (junto com "shopping" e "workoutProfiles"), então aqui a gente
// reconstrói o array na leitura e preserva os outros campos na escrita.
export async function loadUserPlan(userId: string | null | undefined): Promise<MealPlanDay[] | null> {
  try {
    const pd = await fetchUserPlanData(userId);
    return extractPlanDays(pd);
  } catch {
    return null;
  }
}

export async function saveUserPlan(userId: string, plan: MealPlanDay[]): Promise<void> {
  // Preserva QUALQUER campo extra já salvo em plan_data (shopping,
  // workoutProfiles, workoutGoalPerWeek, workoutLog, etc.) e apenas
  // sobrescreve os índices numéricos (os 7 dias do plano).
  invalidateUserPlanCache();
  const { data: existing, error: readErr } = await supabase
    .from('user_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .maybeSingle();
  if (readErr) throw readErr;
  const plan_data = { ...(existing?.plan_data || {}), ...plan };
  const { error } = await supabase
    .from('user_plans')
    .upsert({ user_id: userId, plan_data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  invalidateUserPlanCache();
}
