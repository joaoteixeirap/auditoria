-- Convites sem e-mail automático: administrador compartilha código por conta própria.
begin;
create table public.organization_invitations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 email text not null check(length(email) between 3 and 254 and email=lower(btrim(email))),
 role text not null check(role in ('owner','member')),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',used_at timestamptz
);
create index invitations_org_idx on public.organization_invitations(organization_id,created_at desc);
alter table public.organization_invitations enable row level security;
create policy invitations_owner_read on public.organization_invitations for select to authenticated using(private.is_owner(organization_id));
revoke all on public.organization_invitations from public,anon,authenticated;
grant select(id,organization_id,email,role,created_at,expires_at,used_at) on public.organization_invitations to authenticated;
create function public.create_membership_invitation(org_id uuid,target_email text,target_role text,invite_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,3));
 if target_email is null or length(target_email)>254 or position('@' in target_email)<2 or invite_hash is null or target_role not in ('owner','member') then raise exception 'invalid invitation'; end if;
 if (select count(*) from public.organization_invitations where organization_id=org_id and used_at is null and expires_at>now())>=50 then raise exception 'invitation limit'; end if;
 insert into public.organization_invitations(organization_id,email,role,token_hash,created_by)
 values(org_id,lower(btrim(target_email)),target_role,invite_hash,auth.uid()) returning id into result;
 return result;
end; $$;
create function public.accept_membership_invitation(invite_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.organization_invitations; recipient text;
begin
 if auth.uid() is null then raise exception 'login required' using errcode='42501'; end if;
 select lower(email) into recipient from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into invitation from public.organization_invitations where token_hash=invite_hash and used_at is null and expires_at>now() for update;
 if not found or recipient is null or recipient is distinct from invitation.email then raise exception 'invitation unavailable' using errcode='42501'; end if;
 -- Um convite novo não altera nem promove uma membership existente.
 insert into public.organization_members(organization_id,user_id,role) values(invitation.organization_id,auth.uid(),invitation.role)
 on conflict(organization_id,user_id) do nothing;
 update public.organization_invitations set used_at=now() where id=invitation.id;
 return invitation.organization_id;
end; $$;
create function public.revoke_membership_invitation(org_id uuid,invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_owner(org_id) then raise exception 'owner required' using errcode='42501'; end if;
 update public.organization_invitations set used_at=now() where id=invitation_id and organization_id=org_id and used_at is null;
end; $$;
revoke all on function public.create_membership_invitation(uuid,text,text,text),public.accept_membership_invitation(text),public.revoke_membership_invitation(uuid,uuid) from public,anon;
grant execute on function public.create_membership_invitation(uuid,text,text,text),public.accept_membership_invitation(text),public.revoke_membership_invitation(uuid,uuid) to authenticated;
create function public.memberships_health() returns text language sql stable set search_path='' as $$ select 'memberships-v1'::text; $$;
create function public.company_members(org_id uuid) returns table(user_id uuid,display_name text,role text,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_member(org_id) then raise exception 'membership required' using errcode='42501'; end if;
 return query select m.user_id,p.display_name,m.role,m.created_at from public.organization_members m join public.profiles p on p.id=m.user_id where m.organization_id=org_id order by m.created_at,m.user_id limit 100;
end; $$;
revoke all on function public.company_members(uuid) from public,anon;
grant execute on function public.company_members(uuid) to authenticated;
revoke all on function public.memberships_health() from public;
grant execute on function public.memberships_health() to anon,authenticated;
notify pgrst,'reload schema';
commit;
