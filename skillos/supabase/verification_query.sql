-- Verify all tables exist
select table_name 
from information_schema.tables 
where table_schema = 'public' 
and table_name in ('users', 'tasks', 'learning_logs', 'system_stats', 'brain_dumps');

-- Verify RLS is enabled on all tables
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
and tablename in ('users', 'tasks', 'learning_logs', 'system_stats', 'brain_dumps');

-- Verify indexes
select indexname, indexdef 
from pg_indexes 
where schemaname = 'public' 
and tablename in ('tasks', 'learning_logs', 'system_stats');
