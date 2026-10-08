begin;
create table public.evaluation_usage (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,test_execution_id uuid not null unique,
 model text not null check(length(model) between 1 and 100),
 input_tokens integer not null check(input_tokens between 0 and 1000000),output_tokens integer not null check(output_tokens between 0 and 100000),
 estimated_cost numeric(12,6) check(estimated_cost between 0 and 1000),created_at timestamptz not null default now(),
 foreign key(organization_id,test_execution_id) references public.test_executions(organization_id,id) on delete restrict
);
alter table public.evaluation_usage enable row level security;
create policy evaluation_usage_read on public.evaluation_usage for select to authenticated using(private.is_member(organization_id));
revoke all on public.evaluation_usage from public,anon,authenticated;
grant select on public.evaluation_usage to authenticated;
create function public.append_evaluated_execution(run_id uuid,case_id uuid,result_verdict text,result_response text,result_reason text,result_evidence text,result_recommendation text,result_latency integer,usage_model text default null,input_tokens integer default 0,output_tokens integer default 0,estimated_cost numeric default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result_id uuid; execution public.test_executions;
begin
 result_id:=public.append_demo_execution(run_id,case_id,result_verdict,result_response,result_reason,result_evidence,result_recommendation,result_latency);
 if usage_model is not null then
  select * into execution from public.test_executions where audit_run_id=run_id and test_case_id=case_id;
  if found then insert into public.evaluation_usage(organization_id,test_execution_id,model,input_tokens,output_tokens,estimated_cost)
   values(execution.organization_id,execution.id,usage_model,input_tokens,output_tokens,estimated_cost) on conflict(test_execution_id) do nothing; end if;
 end if;
 return result_id;
end; $$;
revoke all on function public.append_evaluated_execution(uuid,uuid,text,text,text,text,text,integer,text,integer,integer,numeric) from public,anon;
grant execute on function public.append_evaluated_execution(uuid,uuid,text,text,text,text,text,integer,text,integer,integer,numeric) to authenticated;
create function public.audit_statistics(org_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('PASS',count(*) filter(where e.verdict='PASS'),'FAIL',count(*) filter(where e.verdict='FAIL'),
 'INCONCLUSIVE',count(*) filter(where e.verdict='INCONCLUSIVE'),'ERROR',count(*) filter(where e.verdict='ERROR'))
 from public.test_executions e join public.audit_runs r on r.id=e.audit_run_id and r.organization_id=e.organization_id
 where e.organization_id=org_id and r.status='completed';
$$;
revoke all on function public.audit_statistics(uuid) from public,anon;
grant execute on function public.audit_statistics(uuid) to authenticated;
create function public.phase6_health() returns text language sql stable set search_path='' as $$ select 'usage-v1'::text; $$;
revoke all on function public.phase6_health() from public;
grant execute on function public.phase6_health() to anon,authenticated;
notify pgrst,'reload schema';
commit;
