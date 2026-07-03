-- Rodar no SQL Editor do Supabase (projeto Mano Italiano)
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text not null,
  user_name text not null,
  user_role text not null,
  action text not null,
  resource text not null,
  resource_id text,
  details jsonb,
  ip text
);

alter table admin_audit_logs enable row level security;
create policy "no public access" on admin_audit_logs for all using (false);
