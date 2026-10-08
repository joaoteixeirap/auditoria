-- Fase 3: configuração HTTP imutável por versão. Não altera migrations anteriores.
begin;

alter table public.agents drop constraint agents_connection_type_check;
alter table public.agents add constraint agents_connection_type_check check(connection_type in ('demo','http'));
create function private.sync_agent_connection_type() returns trigger language plpgsql set search_path='' as $$
begin
  new.connection_type := case when new.environment='demo' then 'demo' else 'http' end;
  return new;
end;
$$;
revoke all on function private.sync_agent_connection_type() from public,anon,authenticated;
create trigger agents_connection_type before insert or update of environment on public.agents
  for each row execute function private.sync_agent_connection_type();
update public.agents set connection_type='http' where environment in ('staging','production');

create table public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  agent_id uuid not null,
  agent_version_id uuid not null unique,
  endpoint text not null check(length(endpoint) between 1 and 2000 and endpoint ~ '^https://'),
  encrypted_token text check(length(encrypted_token) <= 9000),
  contract text not null default 'message-text-v1' check(contract = 'message-text-v1'),
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  foreign key(organization_id,agent_id,agent_version_id)
    references public.agent_versions(organization_id,agent_id,id) on delete restrict
);
alter table public.agent_connections enable row level security;
create policy connections_owner_read on public.agent_connections for select to authenticated
  using(private.is_owner(organization_id));
create policy connections_owner_insert on public.agent_connections for insert to authenticated
  with check(private.is_owner(organization_id) and exists(
    select 1 from public.agents a where a.id=agent_id and a.organization_id=agent_connections.organization_id
      and a.environment in ('staging','production') and a.status='active'));
revoke all on public.agent_connections from public,anon,authenticated;
grant select on public.agent_connections to authenticated;
grant insert(organization_id,agent_id,agent_version_id,endpoint,encrypted_token) on public.agent_connections to authenticated;

alter table public.audit_runs drop constraint audit_runs_source_check;
alter table public.audit_runs add constraint audit_runs_source_check check(source in ('demo','http'));
alter table public.usage_records drop constraint usage_records_kind_check;
alter table public.usage_records add constraint usage_records_kind_check check(kind in ('audit_demo','audit_http'));
-- Custo HTTP não conhecido; não apresentar zero como custo calculado.
alter table public.usage_records alter column estimated_cost drop not null;
alter table public.usage_records drop constraint usage_records_estimated_cost_check;
alter table public.usage_records add constraint usage_records_estimated_cost_check check(estimated_cost is null or estimated_cost=0);

create function public.create_http_audit(org_id uuid, selected_agent uuid, selected_version uuid, case_ids uuid[], idempotency_key uuid, authorized boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare existing public.audit_runs; agent_record public.agents; version_record public.agent_versions;
  criteria jsonb; selected_ids uuid[]; new_run uuid; connection_record public.agent_connections;
begin
  if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
  if authorized is distinct from true or idempotency_key is null then raise exception 'authorization required' using errcode='22023'; end if;
  if coalesce(cardinality(case_ids),0) not between 1 and 10 or (select count(distinct x) from unnest(case_ids) x) <> cardinality(case_ids) then raise exception 'invalid cases' using errcode='22023'; end if;
  select array_agg(x order by x) into selected_ids from unnest(case_ids) x;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text, 1));
  select * into existing from public.audit_runs where organization_id=org_id and request_key=idempotency_key;
  if found then
    if existing.source <> 'http' or existing.agent_id <> selected_agent or existing.agent_version_id <> selected_version or existing.selected_case_ids <> selected_ids then raise exception 'idempotency mismatch' using errcode='22023'; end if;
    return existing.id;
  end if;
  select * into agent_record from public.agents where organization_id=org_id and id=selected_agent;
  if not found or agent_record.environment not in ('staging','production') or agent_record.status <> 'active' then raise exception 'active HTTP agent required' using errcode='22023'; end if;
  select * into version_record from public.agent_versions where organization_id=org_id and agent_id=selected_agent and id=selected_version;
  if not found then raise exception 'version outside agent' using errcode='42501'; end if;
  select * into connection_record from public.agent_connections where organization_id=org_id and agent_id=selected_agent and agent_version_id=selected_version;
  if not found then raise exception 'HTTP connection required' using errcode='22023'; end if;
  if (select count(*) from public.audit_runs where organization_id=org_id and status in ('pending','running')) > 0 then raise exception 'active audit exists' using errcode='22023'; end if;
  if (select count(*) from public.audit_runs where organization_id=org_id and created_at >= date_trunc('month',now())) >= 100 then raise exception 'monthly demo limit' using errcode='22023'; end if;
  if (select count(*) from public.test_cases where id=any(selected_ids)) <> cardinality(selected_ids) then raise exception 'unknown cases' using errcode='22023'; end if;
  select jsonb_build_object('catalogVersion',1,'evaluator',jsonb_build_object('name','deterministic','version','1.0.0'), 'cases',jsonb_agg(jsonb_set(c.definition,'{policy}',p.definition) order by c.key)) into criteria
    from public.test_cases c join public.policy_rules p on p.key=c.policy_key and p.version=c.policy_version where c.id=any(selected_ids);
  insert into public.audit_runs(organization_id,agent_id,agent_version_id,created_by,request_key,source,total_tests,selected_case_ids,criteria_snapshot,conditions_snapshot,criteria_fingerprint)
    values(org_id,selected_agent,selected_version,auth.uid(),idempotency_key,'http',cardinality(selected_ids),selected_ids,criteria,
      jsonb_build_object('agent',to_jsonb(agent_record),'version',to_jsonb(version_record),'connector',jsonb_build_object('type','http','connectionId',connection_record.id,'endpoint',connection_record.endpoint,'contract',connection_record.contract),
        'client',(select jsonb_build_object('id',id,'name',name) from public.clients where organization_id=org_id and id=agent_record.client_id)),md5(criteria::text)) returning id into new_run;
  insert into public.usage_records(organization_id,audit_run_id,kind,estimated_cost) values(org_id,new_run,'audit_http',null);
  return new_run;
end;
$$;
revoke all on function public.create_http_audit(uuid,uuid,uuid,uuid[],uuid,boolean) from public,anon;
grant execute on function public.create_http_audit(uuid,uuid,uuid,uuid[],uuid,boolean) to authenticated;
create function public.phase3_health() returns text language sql stable set search_path = '' as $$ select 'phase3-http-v1'::text; $$;
revoke all on function public.phase3_health() from public;
grant execute on function public.phase3_health() to anon,authenticated;
notify pgrst, 'reload schema';
commit;
