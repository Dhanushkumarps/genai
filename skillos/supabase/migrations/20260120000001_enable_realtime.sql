-- Enable Realtime for system_stats
begin;
  -- Add table to publication
  alter publication supabase_realtime add table system_stats;
commit;
