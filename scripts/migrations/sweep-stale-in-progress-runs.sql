-- Active-run projection sweeper
-- Cron: run once a day at ~02:00 local time (after the PM service window closes).
-- Closes any stx_runs row that was started but never marked complete
-- (e.g. driver forgot to "End route"). Without this, stale rows would
-- keep showing as in-progress on the live dashboard.
--
-- See docs/Design/ADR-0001-active-run-projection.md.

UPDATE stx_runs
   SET status     = 'completed',
       updated_at = now()
 WHERE status        = 'in_progress'
   AND service_date  < CURRENT_DATE
   AND deleted_at    IS NULL;
