-- ============================================================================
-- LifePlan — Esquema completo do banco de dados Supabase (idempotente)
-- Rode no SQL Editor do seu projeto Supabase (Supabase > SQL Editor > New query)
-- ============================================================================

-- ── 1. Perfil físico (cálculo TDEE / metas nutricionais) ────────────────────
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

drop policy if exists "Usuário vê o próprio perfil" on profiles;
create policy "Usuário vê o próprio perfil"
  on profiles for select using (auth.uid() = id);
drop policy if exists "Usuário edita o próprio perfil" on profiles;
create policy "Usuário edita o próprio perfil"
  on profiles for update using (auth.uid() = id);
drop policy if exists "Usuário cria o próprio perfil" on profiles;
create policy "Usuário cria o próprio perfil"
  on profiles for insert with check (auth.uid() = id);
drop policy if exists "Usuário apaga o próprio perfil" on profiles;
create policy "Usuário apaga o próprio perfil"
  on profiles for delete using (auth.uid() = id);

-- ── 2. Plano semanal, compras, treinos, água, agenda e grade ────────────────
create table if not exists user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_plans enable row level security;

drop policy if exists "Usuário vê o próprio plano" on user_plans;
create policy "Usuário vê o próprio plano"
  on user_plans for select using (auth.uid() = user_id);
drop policy if exists "Usuário edita o próprio plano" on user_plans;
create policy "Usuário edita o próprio plano"
  on user_plans for update using (auth.uid() = user_id);
drop policy if exists "Usuário cria o próprio plano" on user_plans;
create policy "Usuário cria o próprio plano"
  on user_plans for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário apaga o próprio plano" on user_plans;
create policy "Usuário apaga o próprio plano"
  on user_plans for delete using (auth.uid() = user_id);

-- ── 3. Hábitos, dieta e medições corporais (my-fit-era.html) ────────────────
create table if not exists app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table app_data enable row level security;

drop policy if exists "Usuário vê seus próprios dados (my fit era)" on app_data;
create policy "Usuário vê seus próprios dados (my fit era)"
  on app_data for select using (auth.uid() = user_id);
drop policy if exists "Usuário edita seus próprios dados (my fit era)" on app_data;
create policy "Usuário edita seus próprios dados (my fit era)"
  on app_data for update using (auth.uid() = user_id);
drop policy if exists "Usuário cria seus próprios dados (my fit era)" on app_data;
create policy "Usuário cria seus próprios dados (my fit era)"
  on app_data for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário apaga seus próprios dados (my fit era)" on app_data;
create policy "Usuário apaga seus próprios dados (my fit era)"
  on app_data for delete using (auth.uid() = user_id);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at date not null,
  weight_kg numeric,
  muscle_pct numeric,
  fat_pct numeric,
  notes text,
  photo_path text,
  unique(user_id, recorded_at)
);

alter table body_metrics add column if not exists photo_path text;
alter table body_metrics enable row level security;

drop policy if exists "Usuário vê suas próprias medições" on body_metrics;
create policy "Usuário vê suas próprias medições"
  on body_metrics for select using (auth.uid() = user_id);
drop policy if exists "Usuário edita suas próprias medições" on body_metrics;
create policy "Usuário edita suas próprias medições"
  on body_metrics for update using (auth.uid() = user_id);
drop policy if exists "Usuário cria suas próprias medições" on body_metrics;
create policy "Usuário cria suas próprias medições"
  on body_metrics for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário apaga suas próprias medições" on body_metrics;
create policy "Usuário apaga suas próprias medições"
  on body_metrics for delete using (auth.uid() = user_id);

-- ── 4. Estudos (estudos.html) ───────────────────────────────────────────────
create table if not exists study_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table study_data enable row level security;

drop policy if exists "Usuário vê seus próprios estudos" on study_data;
create policy "Usuário vê seus próprios estudos"
  on study_data for select using (auth.uid() = user_id);
drop policy if exists "Usuário edita seus próprios estudos" on study_data;
create policy "Usuário edita seus próprios estudos"
  on study_data for update using (auth.uid() = user_id);
drop policy if exists "Usuário cria seus próprios estudos" on study_data;
create policy "Usuário cria seus próprios estudos"
  on study_data for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário apaga seus próprios estudos" on study_data;
create policy "Usuário apaga seus próprios estudos"
  on study_data for delete using (auth.uid() = user_id);

-- ── 5. Finanças pessoais (controle-financeiro.html) ─────────────────────────
create table if not exists finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table finance_data enable row level security;

drop policy if exists "Usuário vê suas próprias finanças" on finance_data;
create policy "Usuário vê suas próprias finanças"
  on finance_data for select using (auth.uid() = user_id);
drop policy if exists "Usuário edita suas próprias finanças" on finance_data;
create policy "Usuário edita suas próprias finanças"
  on finance_data for update using (auth.uid() = user_id);
drop policy if exists "Usuário cria suas próprias finanças" on finance_data;
create policy "Usuário cria suas próprias finanças"
  on finance_data for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário apaga suas próprias finanças" on finance_data;
create policy "Usuário apaga suas próprias finanças"
  on finance_data for delete using (auth.uid() = user_id);

-- ── 6. Modo Família (compartilhamento de gastos no cartão do líder) ─────────
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Minha Família',
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz default now()
);

create table if not exists family_members (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

create table if not exists family_charges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  leader_label text,
  fatura_name text,
  description text,
  category text,
  parcelas text,
  value numeric not null default 0,
  date date,
  created_at timestamptz default now(),
  unique (leader_id, source_id)
);

create table if not exists family_closings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  cutoff date not null,
  label text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table families enable row level security;
alter table family_members enable row level security;
alter table family_charges enable row level security;
alter table family_closings enable row level security;

drop policy if exists "Membros veem a família" on families;
create policy "Membros veem a família"
  on families for select using (
    owner_id = auth.uid()
    or exists (select 1 from family_members fm where fm.family_id = families.id and fm.user_id = auth.uid())
  );

drop policy if exists "Usuário vê a própria participação na família" on family_members;
create policy "Usuário vê a própria participação na família"
  on family_members for select using (
    user_id = auth.uid()
    or exists (select 1 from families f where f.id = family_members.family_id and f.owner_id = auth.uid())
  );

drop policy if exists "Líder e membro veem os gastos compartilhados" on family_charges;
create policy "Líder e membro veem os gastos compartilhados"
  on family_charges for select using (auth.uid() = leader_id or auth.uid() = member_id);
drop policy if exists "Líder cria gastos para membros" on family_charges;
create policy "Líder cria gastos para membros"
  on family_charges for insert with check (auth.uid() = leader_id);
drop policy if exists "Líder atualiza gastos para membros" on family_charges;
create policy "Líder atualiza gastos para membros"
  on family_charges for update using (auth.uid() = leader_id);
drop policy if exists "Líder remove gastos para membros" on family_charges;
create policy "Líder remove gastos para membros"
  on family_charges for delete using (auth.uid() = leader_id);

drop policy if exists "Líder e membro veem os fechamentos" on family_closings;
create policy "Líder e membro veem os fechamentos"
  on family_closings for select using (auth.uid() = leader_id or auth.uid() = member_id);
drop policy if exists "Líder cria fechamentos" on family_closings;
create policy "Líder cria fechamentos"
  on family_closings for insert with check (auth.uid() = leader_id);
drop policy if exists "Líder atualiza fechamentos" on family_closings;
create policy "Líder atualiza fechamentos"
  on family_closings for update using (auth.uid() = leader_id);
drop policy if exists "Líder apaga fechamentos" on family_closings;
create policy "Líder apaga fechamentos"
  on family_closings for delete using (auth.uid() = leader_id);

-- ── 7. Avisos (sino do Início) e inscrições Web Push ────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, dedupe_key)
);

alter table notifications enable row level security;

drop policy if exists "Usuário vê seus avisos" on notifications;
create policy "Usuário vê seus avisos"
  on notifications for select using (auth.uid() = user_id);
drop policy if exists "Usuário cria seus avisos" on notifications;
create policy "Usuário cria seus avisos"
  on notifications for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário marca seus avisos como lidos" on notifications;
create policy "Usuário marca seus avisos como lidos"
  on notifications for update using (auth.uid() = user_id);
drop policy if exists "Usuário limpa avisos antigos" on notifications;
create policy "Usuário limpa avisos antigos"
  on notifications for delete using (auth.uid() = user_id);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Usuário vê suas inscrições de push" on push_subscriptions;
create policy "Usuário vê suas inscrições de push"
  on push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "Usuário cadastra aparelho no push" on push_subscriptions;
create policy "Usuário cadastra aparelho no push"
  on push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "Usuário atualiza aparelho no push" on push_subscriptions;
create policy "Usuário atualiza aparelho no push"
  on push_subscriptions for update using (auth.uid() = user_id);
drop policy if exists "Usuário remove aparelho do push" on push_subscriptions;
create policy "Usuário remove aparelho do push"
  on push_subscriptions for delete using (auth.uid() = user_id);

-- Publicação em tempo real para o sino de avisos (ignora se já adicionada)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ── 8. Funções RPC (Modo Família + Exclusão LGPD) ───────────────────────────
create or replace function create_family(new_name text default 'Minha Família')
returns setof families
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text;
  fam families;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  code := 'FAM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into families (name, owner_id, invite_code)
  values (coalesce(nullif(trim(new_name), ''), 'Minha Família'), uid, code)
  returning * into fam;

  insert into family_members (family_id, user_id)
  values (fam.id, uid)
  on conflict do nothing;

  return next fam;
end;
$$;

create or replace function join_family_by_code(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fam families;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  select * into fam from families where upper(invite_code) = upper(trim(code)) limit 1;
  if fam.id is null then raise exception 'Código de convite inválido'; end if;

  insert into family_members (family_id, user_id)
  values (fam.id, uid)
  on conflict do nothing;

  if uid <> fam.owner_id then
    insert into notifications (user_id, kind, title, body, dedupe_key)
    values (fam.owner_id, 'familia_entrada', 'Novo membro na família', 'Uma pessoa entrou no seu modo família.', 'fam_in:' || fam.id || ':' || uid)
    on conflict (user_id, dedupe_key) do nothing;
  end if;
end;
$$;

create or replace function family_members_overview()
returns table (user_id uuid, email text, is_leader boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  oid uuid;
begin
  if uid is null then return; end if;
  select f.id, f.owner_id into fid, oid
  from families f
  where f.owner_id = uid
  limit 1;
  if fid is null then return; end if;

  return query
  select fm.user_id, u.email::text, (fm.user_id = oid) as is_leader
  from family_members fm
  join auth.users u on u.id = fm.user_id
  where fm.family_id = fid;
end;
$$;

create or replace function delete_my_account(confirmacao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if upper(trim(coalesce(confirmacao, ''))) <> 'EXCLUIR' then
    raise exception 'Confirmação inválida';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- ── 9. Gatilhos de avisos automáticos do Modo Família (sem valores no texto) ─
create or replace function notify_family_charge_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, kind, title, body, data, dedupe_key)
  values (
    new.member_id,
    'gasto',
    'Novo lançamento de ' || coalesce(nullif(new.leader_label, ''), 'família'),
    coalesce(nullif(new.description, ''), 'Gasto registrado') || ' · Confira em Finanças.',
    jsonb_build_object('total', new.value, 'charge_id', new.id),
    'charge:' || new.leader_id || ':' || new.source_id
  )
  on conflict (user_id, dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_notify_family_charge on family_charges;
create trigger trg_notify_family_charge
  after insert on family_charges
  for each row execute function notify_family_charge_insert();

create or replace function notify_family_closing_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tot numeric;
begin
  if tg_op = 'INSERT' then
    select coalesce(sum(c.value), 0) into tot
    from family_charges c
    where c.leader_id = new.leader_id and c.member_id = new.member_id and c.date is not null and c.date <= new.cutoff;

    insert into notifications (user_id, kind, title, body, data, dedupe_key)
    values (
      new.member_id,
      'mes_fechado',
      'Fechamento ' || coalesce(nullif(new.label, ''), 'do mês'),
      'Seu mês foi fechado no modo família. Confira em Finanças.',
      jsonb_build_object('total', tot, 'closing_id', new.id),
      'close:' || new.id
    )
    on conflict (user_id, dedupe_key) do nothing;
  elsif tg_op = 'UPDATE' and old.paid_at is null and new.paid_at is not null then
    insert into notifications (user_id, kind, title, body, data, dedupe_key)
    values (
      new.member_id,
      'mes_pago',
      'Fechamento marcado como pago',
      coalesce(nullif(new.label, ''), 'Mês fechado') || ' foi quitado.',
      jsonb_build_object('closing_id', new.id),
      'paid:' || new.id || ':' || extract(epoch from new.paid_at)::bigint
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_family_closing on family_closings;
create trigger trg_notify_family_closing
  after insert or update on family_closings
  for each row execute function notify_family_closing_change();

-- ── 10. Buckets privados do Storage (fotos de progresso e recibos) ──────────
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false),
       ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Usuário lê suas próprias fotos" on storage.objects;
create policy "Usuário lê suas próprias fotos"
  on storage.objects for select
  using (bucket_id in ('progress-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuário envia suas próprias fotos" on storage.objects;
create policy "Usuário envia suas próprias fotos"
  on storage.objects for insert
  with check (bucket_id in ('progress-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuário atualiza suas próprias fotos" on storage.objects;
create policy "Usuário atualiza suas próprias fotos"
  on storage.objects for update
  using (bucket_id in ('progress-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuário apaga suas próprias fotos" on storage.objects;
create policy "Usuário apaga suas próprias fotos"
  on storage.objects for delete
  using (bucket_id in ('progress-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);
