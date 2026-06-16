-- Run this in the Supabase SQL Editor to inspect current RLS state for "orders"
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables t
join pg_class c on c.relname = t.tablename
where t.tablename = 'orders';

select policyname, cmd, roles, qual, with_check
from pg_policies
where tablename = 'orders';
