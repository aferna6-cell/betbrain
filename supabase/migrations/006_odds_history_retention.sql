-- Retention policy for odds_history.
-- Deletes rows older than 30 days to prevent unbounded growth.
-- Should be called via cron (pg_cron or external scheduler).

create or replace function cleanup_old_odds_history()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from odds_history
  where fetched_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;

  raise notice 'odds_history cleanup: deleted % rows older than 30 days', deleted_count;
  return deleted_count;
end;
$$;

comment on function cleanup_old_odds_history() is
  'Deletes odds_history rows older than 30 days. Call via cron or manual invocation. Returns number of rows deleted.';

-- If pg_cron is available, uncomment this to auto-run daily at 4 AM UTC:
-- select cron.schedule(
--   'cleanup-odds-history',
--   '0 4 * * *',
--   $$select cleanup_old_odds_history()$$
-- );
