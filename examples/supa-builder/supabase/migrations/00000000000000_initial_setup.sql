-- ============================================================================
-- SupaBuilder Initial Setup
-- Complete database schema for enterprise Supabase project provisioning
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects table: Tracks all child Supabase projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),

  -- Project identification
  project_ref text unique not null,
  project_name text not null,
  organization_id text not null,

  -- Credentials (encrypted)
  anon_key text not null,
  service_role_key_encrypted text not null,

  -- Project configuration
  region text not null,
  status text not null default 'provisioning' check (status in ('provisioning', 'active', 'paused', 'failed', 'deleted')),

  -- Metadata
  purpose text,
  description text,

  -- Ownership and tracking
  creator_id uuid not null,
  creator_email text not null,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Management API metadata
  management_api_response jsonb,

  constraint projects_org_name_unique unique (organization_id, project_name, deleted_at)
);

create index idx_projects_organization on public.projects(organization_id) where deleted_at is null;
create index idx_projects_creator on public.projects(creator_id) where deleted_at is null;
create index idx_projects_status on public.projects(status) where deleted_at is null;
create index idx_projects_created_at on public.projects(created_at desc);

comment on table public.projects is 'Child Supabase projects created through SupaBuilder';

-- User roles table: Manages admin vs builder role assignments
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id text not null,
  role text not null check (role in ('admin', 'builder')),
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  constraint user_roles_unique unique (user_id, organization_id)
);

create index idx_user_roles_user on public.user_roles(user_id);
create index idx_user_roles_org on public.user_roles(organization_id);

comment on table public.user_roles is 'Role assignments for users within organizations';

-- Project audit logs: Immutable audit trail
create table public.project_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  action text not null check (action in ('create', 'pause', 'resume', 'delete', 'update')),
  actor_id uuid not null,
  actor_email text not null,
  organization_id text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_project on public.project_audit_logs(project_id, created_at desc);
create index idx_audit_actor on public.project_audit_logs(actor_id, created_at desc);
create index idx_audit_org on public.project_audit_logs(organization_id, created_at desc);
create index idx_audit_action on public.project_audit_logs(action);

comment on table public.project_audit_logs is 'Immutable audit trail for all project operations';

-- Rate limits: DB-based rate limiting
create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id text not null,
  action text not null,
  created_at timestamptz not null default now(),
  constraint rate_limits_idx unique (user_id, organization_id, action, created_at)
);

create index idx_rate_limits_user_action on public.rate_limits(user_id, action, created_at desc);

comment on table public.rate_limits is 'Rate limiting tracking for user actions';

-- ============================================================================
-- ENCRYPTION FUNCTIONS
-- ============================================================================

create or replace function public.encrypt_service_role_key(
  p_service_role_key text,
  p_encryption_key text
)
returns text
language plpgsql
security definer
as $$
begin
  return encode(
    pgp_sym_encrypt(
      p_service_role_key,
      p_encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
end;
$$;

create or replace function public.decrypt_service_role_key(
  p_encrypted_key text,
  p_encryption_key text
)
returns text
language plpgsql
security definer
as $$
begin
  return pgp_sym_decrypt(
    decode(p_encrypted_key, 'base64'),
    p_encryption_key,
    'cipher-algo=aes256'
  );
end;
$$;

comment on function public.encrypt_service_role_key is 'Encrypt service_role_key using AES-256';
comment on function public.decrypt_service_role_key is 'Decrypt service_role_key (admin only)';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's role in an organization
create or replace function public.get_user_role(
  p_user_id uuid,
  p_organization_id text
)
returns text
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.user_roles
  where user_id = p_user_id
    and organization_id = p_organization_id;

  return coalesce(v_role, 'builder');
end;
$$;

comment on function public.get_user_role is 'Get user role within an organization';

-- Check if user is admin
create or replace function public.is_admin(
  p_user_id uuid,
  p_organization_id text
)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and organization_id = p_organization_id
      and role = 'admin'
  );
end;
$$;

comment on function public.is_admin is 'Check if user has admin role in organization';

-- Rate limiting check
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_organization_id text,
  p_action text,
  p_max_requests integer default 5,
  p_window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_window_start timestamptz;
begin
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;

  select count(*)
  into v_count
  from public.rate_limits
  where user_id = p_user_id
    and organization_id = p_organization_id
    and action = p_action
    and created_at > v_window_start;

  return v_count < p_max_requests;
end;
$$;

comment on function public.check_rate_limit is 'Check if user is within rate limit for an action';

-- Record rate limit event
create or replace function public.record_rate_limit(
  p_user_id uuid,
  p_organization_id text,
  p_action text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.rate_limits (user_id, organization_id, action)
  values (p_user_id, p_organization_id, p_action)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.record_rate_limit is 'Record a rate limit event';

-- Create audit log entry
create or replace function public.create_audit_log(
  p_project_id uuid,
  p_action text,
  p_actor_id uuid,
  p_actor_email text,
  p_organization_id text,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.project_audit_logs (
    project_id,
    action,
    actor_id,
    actor_email,
    organization_id,
    metadata
  )
  values (
    p_project_id,
    p_action,
    p_actor_id,
    p_actor_email,
    p_organization_id,
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.create_audit_log is 'Create an audit log entry';

-- Update project status with audit logging
create or replace function public.update_project_status(
  p_project_id uuid,
  p_new_status text,
  p_actor_id uuid,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_old_status text;
  v_organization_id text;
begin
  if p_new_status not in ('provisioning', 'active', 'paused', 'failed', 'deleted') then
    raise exception 'Invalid status: %', p_new_status;
  end if;

  select status, organization_id
  into v_old_status, v_organization_id
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'Project not found: %', p_project_id;
  end if;

  update public.projects
  set status = p_new_status
  where id = p_project_id;

  perform public.create_audit_log(
    p_project_id,
    'update',
    p_actor_id,
    p_actor_email,
    v_organization_id,
    jsonb_build_object(
      'field', 'status',
      'old_value', v_old_status,
      'new_value', p_new_status
    )
  );

  return true;
end;
$$;

comment on function public.update_project_status is 'Update project status with audit logging';

-- Soft delete project
create or replace function public.soft_delete_project(
  p_project_id uuid,
  p_actor_id uuid,
  p_actor_email text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_organization_id text;
begin
  select organization_id
  into v_organization_id
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'Project not found: %', p_project_id;
  end if;

  update public.projects
  set
    deleted_at = now(),
    status = 'deleted'
  where id = p_project_id
    and deleted_at is null;

  perform public.create_audit_log(
    p_project_id,
    'delete',
    p_actor_id,
    p_actor_email,
    v_organization_id,
    jsonb_build_object('soft_delete', true)
  );

  return true;
end;
$$;

comment on function public.soft_delete_project is 'Soft delete a project with audit logging';

-- Cleanup old rate limits
create or replace function public.cleanup_old_rate_limits(
  p_retention_hours integer default 168
)
returns integer
language plpgsql
security definer
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where created_at < now() - (p_retention_hours || ' hours')::interval;

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

comment on function public.cleanup_old_rate_limits is 'Clean up old rate limit records (7+ days)';

-- Get user projects count
create or replace function public.get_user_projects_count(
  p_user_id uuid,
  p_organization_id text
)
returns integer
language plpgsql
security definer
stable
as $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.projects
  where creator_id = p_user_id
    and organization_id = p_organization_id
    and deleted_at is null
    and status in ('active', 'provisioning', 'paused');

  return v_count;
end;
$$;

comment on function public.get_user_projects_count is 'Get count of active projects for a user';

-- Get organization projects count
create or replace function public.get_org_projects_count(
  p_organization_id text
)
returns integer
language plpgsql
security definer
stable
as $$
declare
  v_count integer;
begin
  select count(*)
  into v_count
  from public.projects
  where organization_id = p_organization_id
    and deleted_at is null
    and status in ('active', 'provisioning', 'paused');

  return v_count;
end;
$$;

comment on function public.get_org_projects_count is 'Get count of all projects in an organization';

-- Assign user role (bypasses RLS)
create or replace function public.assign_user_role(
  p_user_id uuid,
  p_organization_id text,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, organization_id, role)
  values (p_user_id, p_organization_id, p_role)
  on conflict (user_id, organization_id) do nothing;

  return true;
end;
$$;

comment on function public.assign_user_role is 'Assign role to user (bypasses RLS)';

-- Auto-assign first admin
create or replace function public.auto_assign_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id text;
  v_user_count integer;
begin
  v_org_id := coalesce(
    new.raw_user_meta_data->>'organization_id',
    new.raw_user_meta_data->>'org_id',
    new.raw_user_meta_data->>'hd',
    new.raw_app_meta_data->>'organization_id',
    'default_org'
  );

  select count(*)
  into v_user_count
  from public.user_roles
  where organization_id = v_org_id;

  if v_user_count = 0 then
    perform public.assign_user_role(new.id, v_org_id, 'admin');
    raise notice 'Auto-assigned admin role to user % in organization %', new.email, v_org_id;
  else
    perform public.assign_user_role(new.id, v_org_id, 'builder');
    raise notice 'Auto-assigned builder role to user % in organization %', new.email, v_org_id;
  end if;

  return new;
end;
$$;

comment on function public.auto_assign_first_admin is 'Automatically assign admin role to first user per organization, builder to others';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.auto_assign_first_admin();

-- Promote user to admin
create or replace function public.promote_to_admin(
  p_user_email text,
  p_organization_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_caller_role text;
begin
  select role into v_caller_role
  from public.user_roles
  where user_id = auth.uid()
    and organization_id = p_organization_id;

  if v_caller_role != 'admin' then
    raise exception 'Only admins can promote users';
  end if;

  select id into v_user_id
  from auth.users
  where email = p_user_email;

  if v_user_id is null then
    raise exception 'User not found: %', p_user_email;
  end if;

  update public.user_roles
  set role = 'admin',
      assigned_by = auth.uid(),
      assigned_at = now()
  where user_id = v_user_id
    and organization_id = p_organization_id;

  return true;
end;
$$;

comment on function public.promote_to_admin is 'Allow admins to promote other users to admin role';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.projects enable row level security;
alter table public.user_roles enable row level security;
alter table public.project_audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- Projects policies
create policy "Admins can view all organization projects"
  on public.projects
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      creator_id = auth.uid()
      or
      exists (
        select 1
        from public.user_roles
        where user_roles.user_id = auth.uid()
          and user_roles.organization_id = projects.organization_id
          and user_roles.role = 'admin'
      )
    )
  );

create policy "Builders can view their own projects"
  on public.projects
  for select
  to authenticated
  using (
    creator_id = auth.uid()
    and deleted_at is null
  );

create policy "Authenticated users can create projects"
  on public.projects
  for insert
  to authenticated
  with check (creator_id = auth.uid());

create policy "Admins can update organization projects"
  on public.projects
  for update
  to authenticated
  using (
    creator_id = auth.uid()
    or
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.organization_id = projects.organization_id
        and user_roles.role = 'admin'
    )
  )
  with check (
    creator_id = auth.uid()
    or
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.organization_id = projects.organization_id
        and user_roles.role = 'admin'
    )
  );

create policy "Builders can update their own projects"
  on public.projects
  for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- User roles policies (no recursion)
create policy "Authenticated users can view all roles"
  on public.user_roles
  for select
  to authenticated
  using (true);

create policy "No direct role inserts"
  on public.user_roles
  for insert
  to authenticated
  with check (false);

create policy "No direct role updates"
  on public.user_roles
  for update
  to authenticated
  using (false);

create policy "No direct role deletes"
  on public.user_roles
  for delete
  to authenticated
  using (false);

-- Audit logs policies
create policy "Admins can view organization audit logs"
  on public.project_audit_logs
  for select
  to authenticated
  using (
    actor_id = auth.uid()
    or
    exists (
      select 1
      from public.projects
      where projects.id = project_audit_logs.project_id
        and projects.creator_id = auth.uid()
    )
    or
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.organization_id = project_audit_logs.organization_id
        and user_roles.role = 'admin'
    )
  );

create policy "Builders can view their project audit logs"
  on public.project_audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_audit_logs.project_id
        and projects.creator_id = auth.uid()
    )
  );

create policy "Users can create audit logs"
  on public.project_audit_logs
  for insert
  to authenticated
  with check (actor_id = auth.uid());

-- Rate limits policies
create policy "Users can view their own rate limits"
  on public.rate_limits
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create rate limit records"
  on public.rate_limits
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins can view organization rate limits"
  on public.rate_limits
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.organization_id = rate_limits.organization_id
        and user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

grant usage on schema public to authenticated;
grant usage on schema public to anon;

grant select, insert, update on public.projects to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert on public.project_audit_logs to authenticated;
grant select, insert on public.rate_limits to authenticated;

grant execute on function public.get_user_role to authenticated;
grant execute on function public.is_admin to authenticated;
grant execute on function public.check_rate_limit to authenticated;
grant execute on function public.record_rate_limit to authenticated;
grant execute on function public.create_audit_log to authenticated;
grant execute on function public.update_project_status to authenticated;
grant execute on function public.soft_delete_project to authenticated;
grant execute on function public.cleanup_old_rate_limits to authenticated;
grant execute on function public.get_user_projects_count to authenticated;
grant execute on function public.get_org_projects_count to authenticated;
grant execute on function public.assign_user_role to authenticated;
grant execute on function public.promote_to_admin to authenticated;
