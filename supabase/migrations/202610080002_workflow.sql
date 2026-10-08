-- Fases 3–5: políticas privadas, CSV, revisão humana e relatórios.
begin;
alter table public.findings add constraint findings_scope_unique unique(organization_id,id);
create table public.policy_documents (
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
 name text not null check(length(name) between 1 and 180), storage_path text not null,
 content text not null check(length(content) between 1 and 50000),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(organization_id,id), check(storage_path=organization_id::text||'/'||id::text)
);
create table public.custom_scenarios (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 rule_key uuid not null, version integer not null check(version>0), definition jsonb not null,
 state text not null check(state in ('draft','approved')), document_id uuid,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(organization_id,id), unique(organization_id,rule_key,version),
 foreign key(organization_id,document_id) references public.policy_documents(organization_id,id) on delete restrict
);
create table public.finding_reviews (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null,
 finding_id uuid not null, verdict text not null check(verdict in ('confirmed','dismissed','needs_review')),
 reason text not null check(length(btrim(reason)) between 10 and 2000),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,finding_id) references public.findings(organization_id,id) on delete restrict
);
create table public.release_decisions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, audit_run_id uuid not null,
 decision text not null check(decision in ('released','blocked','needs_review')),
 reason text not null check(length(btrim(reason)) between 10 and 2000),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,audit_run_id) references public.audit_runs(organization_id,id) on delete restrict
);
create table public.audit_reports (
 id uuid primary key, organization_id uuid not null, audit_run_id uuid not null,
 storage_path text not null, snapshot jsonb not null,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,audit_run_id) references public.audit_runs(organization_id,id) on delete restrict,
 check(storage_path=organization_id::text||'/'||id::text)
);
alter table public.policy_documents enable row level security;
alter table public.custom_scenarios enable row level security;
alter table public.finding_reviews enable row level security;
alter table public.release_decisions enable row level security;
alter table public.audit_reports enable row level security;
create policy documents_read on public.policy_documents for select to authenticated using(private.is_member(organization_id));
create policy scenarios_read on public.custom_scenarios for select to authenticated using(private.is_member(organization_id));
create policy reviews_read on public.finding_reviews for select to authenticated using(private.is_member(organization_id));
create policy decisions_read on public.release_decisions for select to authenticated using(private.is_member(organization_id));
create policy reports_read on public.audit_reports for select to authenticated using(private.is_member(organization_id));
create policy documents_insert on public.policy_documents for insert to authenticated with check(private.is_owner(organization_id) and created_by=auth.uid());
create policy reviews_insert on public.finding_reviews for insert to authenticated with check(private.is_owner(organization_id));
create function private.can_release(org_id uuid,run_id uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.audit_runs r where r.id=run_id and r.organization_id=org_id and r.status='completed')
 and not exists(select 1 from public.test_executions e where e.audit_run_id=run_id and e.organization_id=org_id and e.verdict in ('ERROR','INCONCLUSIVE'))
 and not exists(select 1 from public.findings f where f.audit_run_id=run_id and f.organization_id=org_id
 and coalesce((select v.verdict from public.finding_reviews v where v.finding_id=f.id and v.organization_id=org_id order by v.created_at desc,v.id desc limit 1),'needs_review')<>'dismissed');
$$;
revoke all on function private.can_release(uuid,uuid) from public,anon;
grant execute on function private.can_release(uuid,uuid) to authenticated;
create policy decisions_insert on public.release_decisions for insert to authenticated with check(private.is_owner(organization_id) and exists(select 1 from public.audit_runs r where r.id=audit_run_id and r.organization_id=release_decisions.organization_id and r.status='completed') and (decision<>'released' or private.can_release(organization_id,audit_run_id)));
create policy reports_insert on public.audit_reports for insert to authenticated with check(private.is_owner(organization_id));
revoke all on public.policy_documents,public.custom_scenarios,public.finding_reviews,public.release_decisions,public.audit_reports from public,anon,authenticated;
grant select on public.policy_documents,public.custom_scenarios,public.finding_reviews,public.release_decisions,public.audit_reports to authenticated;
grant insert(id,organization_id,name,storage_path,content,created_by) on public.policy_documents to authenticated;
grant insert(organization_id,finding_id,verdict,reason) on public.finding_reviews to authenticated;
grant insert(organization_id,audit_run_id,decision,reason) on public.release_decisions to authenticated;
grant insert(id,organization_id,audit_run_id,storage_path,snapshot) on public.audit_reports to authenticated;

-- Cenários privados são preservados no snapshot, sem colocar dados no catálogo global.
alter table public.test_executions drop constraint test_executions_test_case_id_fkey;
create function private.execution_snapshot_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.audit_runs r where r.id=new.audit_run_id and r.organization_id=new.organization_id
   and exists(select 1 from jsonb_array_elements(r.criteria_snapshot->'cases') c where c->>'id'=new.test_case_id::text))
 then raise exception 'case outside snapshot' using errcode='23503'; end if;
 return new;
end; $$;
revoke all on function private.execution_snapshot_guard() from public,anon,authenticated;
create trigger execution_snapshot_guard before insert on public.test_executions for each row execute function private.execution_snapshot_guard();
alter table public.audit_runs drop constraint audit_runs_source_check;
alter table public.audit_runs add constraint audit_runs_source_check check(source in ('demo','http','csv'));
alter table public.usage_records drop constraint usage_records_kind_check;
alter table public.usage_records add constraint usage_records_kind_check check(kind in ('audit_demo','audit_http','audit_csv'));

create function public.save_custom_scenario(org_id uuid, scenario jsonb, approved boolean, previous_key uuid default null, linked_document uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare scenario_id uuid:=gen_random_uuid(); stable_key uuid:=coalesce(previous_key,gen_random_uuid()); next_version integer;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 if linked_document is not null and not exists(select 1 from public.policy_documents where id=linked_document and organization_id=org_id) then raise exception 'document outside org'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,2));
 if previous_key is not null and not exists(select 1 from public.custom_scenarios where organization_id=org_id and rule_key=previous_key) then raise exception 'rule outside org'; end if;
 select coalesce(max(version),0)+1 into next_version from public.custom_scenarios where organization_id=org_id and rule_key=stable_key;
 if jsonb_typeof(scenario) is distinct from 'object' or coalesce(length(scenario->>'name'),0) not between 1 and 150 or coalesce(length(scenario->>'question'),0) not between 1 and 2000 or coalesce(length(scenario->'policy'->>'description'),0) not between 1 and 2000 or coalesce(length(scenario->'policy'->>'title'),0) not between 1 and 150 or scenario->'evaluation'->>'kind' is distinct from 'semantic' or coalesce(scenario->>'category','') not in ('policy','hallucination','privacy','bias','injection') or coalesce(scenario->>'severity','') not in ('critical','high','medium','low') or coalesce(length(scenario->>'expectedBehavior'),0) not between 1 and 2000 or coalesce(length(scenario->>'recommendation'),0) not between 1 and 2000 then raise exception 'invalid scenario'; end if;
 scenario:=scenario||jsonb_build_object('id',scenario_id,'key',stable_key::text,'version',next_version);
 scenario:=jsonb_set(scenario,'{policy}',(scenario->'policy')||jsonb_build_object('key',stable_key::text,'version',next_version));
 insert into public.custom_scenarios(organization_id,rule_key,id,version,definition,state,document_id,created_by)
 values(org_id,stable_key,scenario_id,next_version,scenario,case when approved then 'approved' else 'draft' end,linked_document,auth.uid());
 return scenario_id;
end; $$;
revoke all on function public.save_custom_scenario(uuid,jsonb,boolean,uuid,uuid) from public,anon;
grant execute on function public.save_custom_scenario(uuid,jsonb,boolean,uuid,uuid) to authenticated;

create function public.create_workflow_audit(org_id uuid, selected_agent uuid, selected_version uuid, case_ids uuid[], idempotency_key uuid, selected_source text, imported jsonb, selected_model text, authorized boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare agent_record public.agents; version_record public.agent_versions; connection_record public.agent_connections;
 existing public.audit_runs; criteria jsonb; selected_ids uuid[]; cases jsonb; conditions jsonb; new_run uuid; semantic boolean;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 if authorized is distinct from true or idempotency_key is null or selected_source not in ('http','csv') then raise exception 'authorization required'; end if;
 if coalesce(cardinality(case_ids),0) not between 1 and 10 or (select count(distinct x) from unnest(case_ids) x)<>cardinality(case_ids) then raise exception 'invalid cases'; end if;
 select array_agg(x order by x) into selected_ids from unnest(case_ids) x;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,1));
 select * into existing from public.audit_runs where organization_id=org_id and request_key=idempotency_key;
 if found then
  if existing.agent_id<>selected_agent or existing.agent_version_id<>selected_version or existing.selected_case_ids<>selected_ids or existing.source<>selected_source or (selected_source='csv' and existing.conditions_snapshot->'connector'->'responses' is distinct from imported) then raise exception 'idempotency mismatch'; end if;
  return existing.id;
 end if;
 select * into agent_record from public.agents where id=selected_agent and organization_id=org_id and status='active';
 if not found then raise exception 'agent outside org'; end if;
 select * into version_record from public.agent_versions where id=selected_version and organization_id=org_id and agent_id=selected_agent;
 if not found then raise exception 'version outside agent'; end if;
 if exists(select 1 from public.audit_runs where organization_id=org_id and status in ('pending','running')) then raise exception 'active audit exists'; end if;
 if (select count(*) from public.audit_runs where organization_id=org_id and created_at>=date_trunc('month',now()))>=100 then raise exception 'monthly limit'; end if;
 select jsonb_agg(definition order by definition->>'key') into cases from (
  select definition from public.test_cases where id=any(selected_ids)
  union all select definition from public.custom_scenarios where id=any(selected_ids) and organization_id=org_id and state='approved'
 ) available;
 if coalesce(jsonb_array_length(cases),0)<>cardinality(selected_ids) then raise exception 'unavailable cases'; end if;
 select exists(select 1 from jsonb_array_elements(cases) c where c->'evaluation'->>'kind'='semantic') into semantic;
 if semantic and (selected_model is null or selected_model !~ '^[A-Za-z0-9._:-]{1,100}$') then raise exception 'model required'; end if;
 criteria:=jsonb_build_object('catalogVersion',1,'evaluator',case when semantic then jsonb_build_object('name','semantic','version','1.0.0','model',selected_model) else jsonb_build_object('name','deterministic','version','1.0.0') end,'cases',cases);
 conditions:=jsonb_build_object('agent',to_jsonb(agent_record),'version',to_jsonb(version_record),'client',(select jsonb_build_object('id',id,'name',name) from public.clients where id=agent_record.client_id and organization_id=org_id));
 if selected_source='http' then
  if agent_record.environment='demo' then raise exception 'HTTP environment required'; end if;
  select * into connection_record from public.agent_connections where organization_id=org_id and agent_id=selected_agent and agent_version_id=selected_version;
  if not found then raise exception 'connection required'; end if;
  conditions:=conditions||jsonb_build_object('connector',jsonb_build_object('type','http','connectionId',connection_record.id,'endpoint',connection_record.endpoint,'contract',connection_record.contract));
 else
  if jsonb_typeof(imported)<>'object' or (select count(*) from jsonb_object_keys(imported))<>cardinality(selected_ids) then raise exception 'invalid import'; end if;
  if exists(select 1 from unnest(selected_ids) x where not imported ? x::text or jsonb_typeof(imported->x::text)<>'string' or length(imported->>x::text) not between 1 and 10000) then raise exception 'invalid imported response'; end if;
  conditions:=conditions||jsonb_build_object('connector',jsonb_build_object('type','csv','responses',imported));
 end if;
 insert into public.audit_runs(organization_id,agent_id,agent_version_id,created_by,request_key,source,total_tests,selected_case_ids,criteria_snapshot,conditions_snapshot,criteria_fingerprint)
 values(org_id,selected_agent,selected_version,auth.uid(),idempotency_key,selected_source,cardinality(selected_ids),selected_ids,criteria,conditions,md5(criteria::text)) returning id into new_run;
 insert into public.usage_records(organization_id,audit_run_id,kind,estimated_cost) values(org_id,new_run,case when selected_source='http' then 'audit_http' else 'audit_csv' end,null);
 return new_run;
end; $$;
revoke all on function public.create_workflow_audit(uuid,uuid,uuid,uuid[],uuid,text,jsonb,text,boolean) from public,anon;
grant execute on function public.create_workflow_audit(uuid,uuid,uuid,uuid[],uuid,text,jsonb,text,boolean) to authenticated;

-- Storage privado; no PGlite os testes criam o contrato mínimo de storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('policy-documents','policy-documents',false,1048576,array['application/pdf','text/plain']),('audit-reports','audit-reports',false,2097152,array['application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy audit_files_read on storage.objects for select to authenticated using(bucket_id in ('policy-documents','audit-reports') and exists(select 1 from public.organization_members m where m.user_id=auth.uid() and m.organization_id::text=split_part(name,'/',1)));
create policy audit_files_insert on storage.objects for insert to authenticated with check(bucket_id in ('policy-documents','audit-reports') and exists(select 1 from public.organization_members m where m.user_id=auth.uid() and m.role='owner' and m.organization_id::text=split_part(name,'/',1)));
create function public.phase4_health() returns text language sql stable set search_path='' as $$ select 'workflow-v1'::text; $$;
revoke all on function public.phase4_health() from public;
grant execute on function public.phase4_health() to anon,authenticated;
notify pgrst,'reload schema';
commit;
