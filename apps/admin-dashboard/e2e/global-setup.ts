import { execSync } from 'child_process';

/**
 * Playwright global setup for admin-dashboard E2E tests.
 *
 * Seeds a test stx_run for today so the GPS tracking map has data to display.
 * Uses docker exec to insert SQL directly — only runs in the local dev/CI
 * environment where the Postgres container is accessible.
 *
 * Idempotent: ON CONFLICT DO NOTHING on all inserts.
 */
export default async function globalSetup() {
  const RUN_ID = 'e2e00000-0000-0000-0000-000000000002';

  // Use SELECT form: if vehicle (BUS-OSTA-201) or driver (DRV-STBERN-001) are
  // not yet imported the SELECT returns no rows and nothing is inserted
  // (no FK violation). This makes the setup non-fatal for fresh DBs.
  const sql = `
    INSERT INTO stx_runs (id, service_date, trip_ids, vehicle_id, driver_id, status)
    SELECT
      '${RUN_ID}',
      CURRENT_DATE,
      ARRAY['T-OCSB-201-AM'],
      v.id,
      d.id,
      'in_progress'
    FROM stx_vehicles v, stx_drivers d
    WHERE v.external_ids->>'vehicle_code' = 'BUS-OSTA-201'
      AND d.external_ids->>'driver_code' = 'DRV-STBERN-001'
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    execSync(
      `docker exec sbtm-postgres-1 psql -U postgres -d sbms -c "${sql.replace(/\n\s*/g, ' ')}"`,
      { stdio: 'pipe' },
    );
    console.log('[global-setup] E2E run seeded for today');
  } catch (err) {
    // Non-fatal: GPS tests will skip gracefully if no run exists
    console.warn('[global-setup] Could not seed E2E run:', (err as Error).message?.slice(0, 200));
  }
}
