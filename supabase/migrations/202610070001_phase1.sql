-- Fase 1: executar uma vez, pelo Supabase CLI ou SQL Editor, como administrador.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default '' check (length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id, organization_id);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(btrim(name)) between 2 and 120),
  contact_name text not null default '' check (length(contact_name) <= 120),
  contact_email text not null default '' check (length(contact_email) <= 254),
  description text not null default '' check (length(description) <= 2000),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index clients_org_created_idx on public.clients(organization_id, created_at desc, id);
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_id uuid not null,
  name text not null check (length(btrim(name)) between 2 and 120),
  description text not null default '' check (length(description) <= 2000),
  category text not null check (category in ('customer_service','sales','hr','support','finance','other')),
  environment text not null check (environment in ('demo','staging','production')),
  connection_type text not null default 'demo' check (connection_type = 'demo'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict
);
create index agents_org_created_idx on public.agents(organization_id, created_at desc, id);
create index agents_client_idx on public.agents(organization_id, client_id);
create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  agent_id uuid not null,
  label text not null check (length(btrim(label)) between 1 and 80),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (agent_id, label),
  foreign key (organization_id, agent_id) references public.agents(organization_id, id) on delete restrict
);
create index agent_versions_agent_idx on public.agent_versions(organization_id, agent_id, created_at desc);

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger organizations_updated before update on public.organizations for each row execute function private.touch_updated_at();
create trigger clients_updated before update on public.clients for each row execute function private.touch_updated_at();
create trigger agents_updated before update on public.agents for each row execute function private.touch_updated_at();

-- Helpers em schema não exposto evitam recursão da política de membership.
create function private.is_member(org_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = (select auth.uid()));
$$;
create function private.is_owner(org_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;
revoke all on function private.is_member(uuid), private.is_owner(uuid) from public;
grant execute on function private.is_member(uuid), private.is_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy organizations_read on public.organizations for select to authenticated using (private.is_member(id));
create policy organizations_update on public.organizations for update to authenticated using (private.is_owner(id)) with check (private.is_owner(id));
create policy members_read on public.organization_members for select to authenticated using (private.is_member(organization_id));
create policy clients_read on public.clients for select to authenticated using (private.is_member(organization_id));
create policy clients_insert on public.clients for insert to authenticated with check (private.is_owner(organization_id));
create policy clients_update on public.clients for update to authenticated using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));
create policy agents_read on public.agents for select to authenticated using (private.is_member(organization_id));
create policy agents_insert on public.agents for insert to authenticated with check (private.is_owner(organization_id));
create policy agents_update on public.agents for update to authenticated using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));
create policy versions_read on public.agent_versions for select to authenticated using (private.is_member(organization_id));
create policy versions_insert on public.agent_versions for insert to authenticated with check (private.is_owner(organization_id));

-- Revogar grants padrão: nenhum DELETE nem alteração de IDs, tenants ou história.
revoke all on public.profiles, public.organizations, public.organization_members, public.clients, public.agents, public.agent_versions from anon, authenticated;
grant select on public.profiles, public.organizations, public.organization_members, public.clients, public.agents, public.agent_versions to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (name) on public.organizations to authenticated;
grant insert (organization_id, name, contact_name, contact_email, description, status) on public.clients to authenticated;
grant update (name, contact_name, contact_email, description, status) on public.clients to authenticated;
grant insert (organization_id, client_id, name, description, category, environment, connection_type, status) on public.agents to authenticated;
grant update (client_id, name, description, category, environment, status) on public.agents to authenticated;
grant insert (organization_id, agent_id, label, notes) on public.agent_versions to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 100));
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
insert into public.profiles(id, display_name) select id, left(coalesce(raw_user_meta_data->>'display_name', ''), 100) from auth.users on conflict (id) do nothing;

-- RPC mínimo e atômico: caller identificado pelo JWT, não por um ID no formulário.
create function public.create_organization(organization_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); new_org uuid;
begin
  if caller is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if length(btrim(organization_name)) not between 2 and 120 or organization_name is null then raise exception 'invalid organization name' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  if (select count(*) from public.organizations where created_by = caller) >= 5 then raise exception 'organization limit reached' using errcode = '22023'; end if;
  insert into public.organizations(name, created_by) values (btrim(organization_name), caller) returning id into new_org;
  insert into public.organization_members(organization_id, user_id, role) values (new_org, caller, 'owner');
  return new_org;
end;
$$;
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

-- Cadastro do chatbot e da primeira versão em uma única transação.
create function public.create_agent(org_id uuid, linked_client uuid, agent_name text, agent_description text, agent_category text, agent_environment text, version_label text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare new_agent uuid;
begin
  insert into public.agents(organization_id, client_id, name, description, category, environment, connection_type, status)
  values (org_id, linked_client, agent_name, agent_description, agent_category, agent_environment, 'demo', 'active') returning id into new_agent;
  insert into public.agent_versions(organization_id, agent_id, label, notes) values (org_id, new_agent, version_label, 'Versão inicial');
  return new_agent;
end;
$$;
revoke all on function public.create_agent(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.create_agent(uuid, uuid, text, text, text, text, text) to authenticated;

-- Marcador público sem dados: permite verificar instalação sem contornar RLS.
create function public.phase1_health() returns text language sql stable set search_path = '' as $$ select 'phase1-v1'::text; $$;
revoke all on function public.phase1_health() from public;
grant execute on function public.phase1_health() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
