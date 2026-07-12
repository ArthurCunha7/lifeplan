import { createClient } from '@supabase/supabase-js';

// ── Configuração ─────────────────────────────────────────────────────────────
// Crie um projeto gratuito em https://supabase.com, depois em
// "Project Settings > API" copie a URL e a chave "anon public".
// Cole aqui embaixo OU crie um arquivo .env na raiz do projeto com:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'COLE_SUA_URL_AQUI';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'COLE_SUA_CHAVE_ANON_AQUI';

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Autenticação ─────────────────────────────────────────────────────────────
export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const userId = data.user?.id;
  if (userId) {
    // Cria a linha inicial de perfil (tabela "profiles" — ver README/SQL)
    await supabase.from('profiles').upsert({ id: userId, name: name || '' });
  }
  return data;
}

export async function signIn({ email, password }) {
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Plano (nutrição + treino) ────────────────────────────────────────────────
// O App.jsx guarda o array de 7 dias espalhado como chaves numéricas dentro
// de plan_data (junto com "shopping" e "workoutProfiles"), então aqui a gente
// reconstrói o array na leitura e preserva os outros campos na escrita.
export async function loadUserPlan(userId) {
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.plan_data) return null;
  const pd = data.plan_data;
  const days = Object.keys(pd)
    .filter(k => /^\d+$/.test(k))
    .sort((a, b) => a - b)
    .map(k => pd[k]);
  return days.length ? days : null;
}

export async function saveUserPlan(userId, plan) {
  // Preserva QUALQUER campo extra já salvo em plan_data (shopping,
  // workoutProfiles, workoutGoalPerWeek, workoutLog, etc.) e apenas
  // sobrescreve os índices numéricos (os 7 dias do plano). Antes este
  // merge só preservava "shopping" e "workoutProfiles" manualmente, o que
  // apagava silenciosamente qualquer novo campo adicionado depois.
  const { data: existing } = await supabase
    .from('user_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .maybeSingle();
  const plan_data = { ...(existing?.plan_data || {}), ...plan };
  const { error } = await supabase
    .from('user_plans')
    .upsert({ user_id: userId, plan_data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
