-- Rode isso no SQL Editor do seu projeto Supabase (Supabase > SQL Editor > New query)

-- Tabela de perfil (dados físicos usados no cálculo de calorias)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  weight numeric,
  height numeric,
  age int,
  sex text,
  activity text,
  goal text
);

alter table profiles enable row level security;

create policy "Usuário vê o próprio perfil"
  on profiles for select using (auth.uid() = id);
create policy "Usuário edita o próprio perfil"
  on profiles for update using (auth.uid() = id);
create policy "Usuário cria o próprio perfil"
  on profiles for insert with check (auth.uid() = id);

-- Tabela do plano (nutrição, compras e perfis de treino)
create table if not exists user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_plans enable row level security;

create policy "Usuário vê o próprio plano"
  on user_plans for select using (auth.uid() = user_id);
create policy "Usuário edita o próprio plano"
  on user_plans for update using (auth.uid() = user_id);
create policy "Usuário cria o próprio plano"
  on user_plans for insert with check (auth.uid() = user_id);

-- Tabelas usadas pelo my-fit-era.html (aba Treinos), rodando no MESMO projeto
-- Supabase para compartilhar a sessão de login com o app principal.
create table if not exists app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table app_data enable row level security;

create policy "Usuário vê seus próprios dados (my fit era)"
  on app_data for select using (auth.uid() = user_id);
create policy "Usuário edita seus próprios dados (my fit era)"
  on app_data for update using (auth.uid() = user_id);
create policy "Usuário cria seus próprios dados (my fit era)"
  on app_data for insert with check (auth.uid() = user_id);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at date not null,
  weight_kg numeric,
  muscle_pct numeric,
  fat_pct numeric,
  notes text,
  unique(user_id, recorded_at)
);

alter table body_metrics enable row level security;

create policy "Usuário vê suas próprias medições"
  on body_metrics for select using (auth.uid() = user_id);
create policy "Usuário edita suas próprias medições"
  on body_metrics for update using (auth.uid() = user_id);
create policy "Usuário cria suas próprias medições"
  on body_metrics for insert with check (auth.uid() = user_id);
create policy "Usuário apaga suas próprias medições"
  on body_metrics for delete using (auth.uid() = user_id);
