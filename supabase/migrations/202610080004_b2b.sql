-- Alinhamento B2B: aditivo, sem apagar ou reatribuir dados existentes.
begin;
alter table public.clients add column is_organization boolean not null default false;
create unique index clients_organization_internal on public.clients(organization_id) where is_organization;
-- Registro de compatibilidade conserva client_id/FKs/snapshots do modelo anterior.
insert into public.clients(organization_id,name,is_organization)
 select id,name,true from public.organizations;
create function private.company_client() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.clients(organization_id,name,is_organization) values(new.id,new.name,true);
 return new;
end; $$;
revoke all on function private.company_client() from public,anon,authenticated;
create trigger organization_company_client after insert on public.organizations for each row execute function private.company_client();
create function public.company_client_id(org_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 select id into result from public.clients where organization_id=org_id and is_organization;
 if result is null then raise exception 'company setup required'; end if;
 return result;
end; $$;
create function public.create_company_agent(org_id uuid,agent_name text,agent_description text,agent_category text,agent_environment text,version_label text,linked_client uuid default null) returns uuid
language plpgsql security invoker set search_path='' as $$
begin
 return public.create_agent(org_id,coalesce(linked_client,public.company_client_id(org_id)),agent_name,agent_description,agent_category,agent_environment,version_label);
end; $$;
revoke all on function public.company_client_id(uuid), public.create_company_agent(uuid,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.company_client_id(uuid), public.create_company_agent(uuid,text,text,text,text,text,uuid) to authenticated;

alter table public.agent_connections add column encrypted_config text check(length(encrypted_config) between 1 and 65000);
alter table public.agent_connections drop constraint agent_connections_contract_check;
alter table public.agent_connections add constraint agent_connections_contract_check check(contract in ('message-text-v1','http-json-v1'));
alter table public.agent_connections add constraint generic_config_required check((contract='http-json-v1')=(encrypted_config is not null));
grant insert(contract,encrypted_config) on public.agent_connections to authenticated;

alter table public.test_executions drop constraint test_executions_category_check;
alter table public.test_executions add constraint test_executions_category_check check(category in ('policy','hallucination','privacy','bias','injection','scope'));
create or replace function public.save_custom_scenario(org_id uuid, scenario jsonb, approved boolean, previous_key uuid default null, linked_document uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare scenario_id uuid:=gen_random_uuid(); stable_key uuid:=coalesce(previous_key,gen_random_uuid()); next_version integer;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 if linked_document is not null and not exists(select 1 from public.policy_documents where id=linked_document and organization_id=org_id) then raise exception 'document outside org'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,2));
 if previous_key is not null and not exists(select 1 from public.custom_scenarios where organization_id=org_id and rule_key=previous_key) then raise exception 'rule outside org'; end if;
 select coalesce(max(version),0)+1 into next_version from public.custom_scenarios where organization_id=org_id and rule_key=stable_key;
 if jsonb_typeof(scenario) is distinct from 'object' or coalesce(length(scenario->>'name'),0) not between 1 and 150 or coalesce(length(scenario->>'question'),0) not between 1 and 2000 or coalesce(length(scenario->'policy'->>'description'),0) not between 1 and 2000 or coalesce(length(scenario->'policy'->>'title'),0) not between 1 and 150 or scenario->'evaluation'->>'kind' is distinct from 'semantic' or coalesce(scenario->>'category','') not in ('policy','hallucination','privacy','bias','injection','scope') or coalesce(scenario->>'severity','') not in ('critical','high','medium','low') or coalesce(length(scenario->>'expectedBehavior'),0) not between 1 and 2000 or coalesce(length(scenario->>'recommendation'),0) not between 1 and 2000 then raise exception 'invalid scenario'; end if;
 scenario:=scenario||jsonb_build_object('id',scenario_id,'key',stable_key::text,'version',next_version);
 scenario:=jsonb_set(scenario,'{policy}',(scenario->'policy')||jsonb_build_object('key',stable_key::text,'version',next_version));
 insert into public.custom_scenarios(organization_id,rule_key,id,version,definition,state,document_id,created_by)
 values(org_id,stable_key,scenario_id,next_version,scenario,case when approved then 'approved' else 'draft' end,linked_document,auth.uid());
 return scenario_id;
end; $$;

-- Novo fluxo usa apenas critérios privados aprovados. RPCs antigos ficam preservados.
create function public.create_company_audit(org_id uuid,selected_agent uuid,selected_version uuid,case_ids uuid[],idempotency_key uuid,selected_model text,authorized boolean) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 if coalesce(cardinality(case_ids),0) not between 1 and 10 or (select count(*) from public.custom_scenarios where organization_id=org_id and state='approved' and id=any(case_ids))<>cardinality(case_ids) then raise exception 'approved company policies required'; end if;
 return public.create_workflow_audit(org_id,selected_agent,selected_version,case_ids,idempotency_key,'http','{}',selected_model,authorized);
end; $$;
revoke all on function public.create_company_audit(uuid,uuid,uuid,uuid[],uuid,text,boolean) from public,anon;
grant execute on function public.create_company_audit(uuid,uuid,uuid,uuid[],uuid,text,boolean) to authenticated;

alter table public.audit_runs add column retest_of uuid;
alter table public.audit_runs add constraint audit_retest_scope foreign key(organization_id,retest_of) references public.audit_runs(organization_id,id) on delete restrict;
create function public.retest_audit(org_id uuid,previous_run uuid,selected_version uuid,idempotency_key uuid,authorized boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.audit_runs; result uuid; current_run public.audit_runs;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 if authorized is distinct from true or idempotency_key is null then raise exception 'authorization required'; end if;
 select * into previous from public.audit_runs where id=previous_run and organization_id=org_id and status='completed';
 if not found or previous.source='csv' then raise exception 'completed executed audit required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,1));
 select * into current_run from public.audit_runs where organization_id=org_id and request_key=idempotency_key;
 if found then
  if current_run.retest_of is distinct from previous_run or current_run.agent_version_id<>selected_version then raise exception 'idempotency mismatch'; end if;
  return current_run.id;
 end if;
 if previous.source='demo' then
  result:=public.create_demo_audit(org_id,previous.agent_id,selected_version,previous.selected_case_ids,idempotency_key,authorized);
 else
  result:=public.create_workflow_audit(org_id,previous.agent_id,selected_version,previous.selected_case_ids,idempotency_key,'http','{}',previous.criteria_snapshot->'evaluator'->>'model',authorized);
 end if;
 select * into current_run from public.audit_runs where id=result for update;
 if current_run.processed_count=0 and current_run.status='pending' then
  update public.audit_runs set criteria_snapshot=previous.criteria_snapshot,criteria_fingerprint=previous.criteria_fingerprint,retest_of=previous_run where id=result;
 elsif current_run.criteria_snapshot is distinct from previous.criteria_snapshot then raise exception 'retest criteria mismatch'; end if;
 return result;
end; $$;
revoke all on function public.retest_audit(uuid,uuid,uuid,uuid,boolean) from public,anon;
grant execute on function public.retest_audit(uuid,uuid,uuid,uuid,boolean) to authenticated;

create function public.company_dashboard(org_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 with results as (
  select e.* from public.test_executions e join public.audit_runs r on r.id=e.audit_run_id and r.organization_id=e.organization_id
  where e.organization_id=org_id and r.source='http' and r.status='completed'
 ), counts as (
  select count(*) total,count(*) filter(where verdict='PASS') pass,count(*) filter(where verdict='FAIL') fail,
   count(*) filter(where verdict='ERROR') error,count(*) filter(where verdict='INCONCLUSIVE') inconclusive,
   count(*) filter(where verdict='FAIL' and severity='critical') critical from results
 ), categories as (select category,count(*) total from results where verdict='FAIL' group by category), history as (
  select r.id,r.agent_id,r.criteria_fingerprint,r.conditions_snapshot->'agent'->>'name' agent,r.conditions_snapshot->'version'->>'label' version,r.created_at,
   count(e.id) filter(where e.verdict='PASS') pass,count(e.id) filter(where e.verdict='FAIL') fail
  from public.audit_runs r join public.test_executions e on e.audit_run_id=r.id and e.organization_id=r.organization_id
  where r.organization_id=org_id and r.source='http' and r.status='completed'
  group by r.id order by r.created_at desc,r.id desc limit 12
 )
 select jsonb_build_object('counts',(select to_jsonb(c) from counts c),
 'audits',(select count(*) from public.audit_runs where organization_id=org_id and source='http' and status='completed'),
 'demonstrations',(select count(*) from public.audit_runs where organization_id=org_id and source='demo'),
 'categories',coalesce((select jsonb_object_agg(category,total) from categories),'{}'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc,h.id desc) from history h),'[]'::jsonb));
$$;
revoke all on function public.company_dashboard(uuid) from public,anon;
grant execute on function public.company_dashboard(uuid) to authenticated;
create function public.b2b_health() returns text language sql stable set search_path='' as $$ select 'b2b-v1'::text; $$;
revoke all on function public.b2b_health() from public;
grant execute on function public.b2b_health() to anon,authenticated;
notify pgrst,'reload schema';
commit;
