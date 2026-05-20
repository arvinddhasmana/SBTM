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
  const DRIVER_ID = 'e2e00000-0000-0000-0000-000000000001';
  const RUN_ID = 'e2e00000-0000-0000-0000-000000000002';
  const OPERATOR_ID = 'ce6f3b50-7e36-4f62-aeba-a4831e798498';
  const VEHICLE_ID = '04869eb6-b146-47fc-90a0-ae4722c9f1da';

  const sql = `
    INSERT INTO stx_drivers (id, operator_id)
    VALUES ('${DRIVER_ID}', '${OPERATOR_ID}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO stx_runs (id, service_date, trip_ids, vehicle_id, driver_id, status)
    VALUES (
      '${RUN_ID}',
      CURRENT_DATE,
      ARRAY['T-OCSB-201-AM'],
      '${VEHICLE_ID}',
      '${DRIVER_ID}',
      'in_progress'
    )
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
