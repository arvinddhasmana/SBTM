import { Inject, Injectable, Logger } from '@nestjs/common';
import { CanonicalRecord, CanonicalRecordKind } from '../adapter/types/canonical-record';
import { PG_POOL, type PgQueryable } from './pg-pool.provider';

export interface OpenSessionInput {
  source: string;
  staShortCode: string;
  exportId: string;
  exportAt: string;
  manifest: unknown;
}

export type StageCounts = Record<CanonicalRecordKind, number>;

const ZERO_COUNTS: StageCounts = {
  board: 0,
  school: 0,
  operator: 0,
  vehicle: 0,
  route: 0,
  stop: 0,
  shape: 0,
  trip: 0,
  stopTime: 0,
  student: 0,
  guardian: 0,
  studentGuardian: 0,
  ridership: 0,
};

/**
 * Slice 2a: drains a CanonicalRecord stream into the stage_* tables keyed by
 * import_session_id. Slice 2b (deferred — needs live Postgres with v2 schema)
 * will read from these tables and upsert into the canonical v2 entities.
 */
@Injectable()
export class StagingWriter {
  private readonly logger = new Logger(StagingWriter.name);

  constructor(@Inject(PG_POOL) private readonly pg: PgQueryable) {}

  async openSession(input: OpenSessionInput): Promise<string> {
    const result = await this.pg.query(
      `INSERT INTO import_sessions
         (source, sta_short_code, export_id, export_at, manifest_json, status)
       VALUES ($1, $2, $3, $4, $5, 'validating')
       ON CONFLICT (sta_short_code, export_id)
         DO UPDATE SET status = 'validating', updated_at = now()
       RETURNING id`,
      [input.source, input.staShortCode, input.exportId, input.exportAt, input.manifest],
    );
    const row = result.rows[0] as { id: string };
    return row.id;
  }

  async markStatus(
    sessionId: string,
    status: 'validated' | 'failed' | 'aborted',
    counts?: { errors?: number; warnings?: number },
  ): Promise<void> {
    await this.pg.query(
      `UPDATE import_sessions
         SET status = $2,
             error_count = COALESCE($3, error_count),
             warning_count = COALESCE($4, warning_count),
             updated_at = now()
       WHERE id = $1`,
      [sessionId, status, counts?.errors ?? null, counts?.warnings ?? null],
    );
  }

  /**
   * Streams records into the matching stage_* table. Returns counts per kind.
   * Caller owns the transaction boundary (this writer is happy to run inside
   * one when the pool client is a transactional client).
   */
  async drain(sessionId: string, records: AsyncIterable<CanonicalRecord>): Promise<StageCounts> {
    const counts: StageCounts = { ...ZERO_COUNTS };
    let row = 0;
    for await (const rec of records) {
      row += 1;
      await this.writeOne(sessionId, row, rec);
      counts[rec.kind] += 1;
    }
    return counts;
  }

  private async writeOne(sessionId: string, row: number, r: CanonicalRecord): Promise<void> {
    switch (r.kind) {
      case 'board':
        await this.pg.query(
          `INSERT INTO stage_board_school
             (import_session_id, row_number, sta_short_code, board_code, school_code, payload)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staShortCode, r.boardCode, '', r],
        );
        return;
      case 'school':
        await this.pg.query(
          `INSERT INTO stage_board_school
             (import_session_id, row_number, sta_short_code, board_code, school_code, payload)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staShortCode, r.boardCode, r.schoolCode, r],
        );
        return;
      case 'operator':
        await this.pg.query(
          `INSERT INTO stage_operators
             (import_session_id, row_number, operator_code, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.operatorCode, r],
        );
        return;
      case 'vehicle':
        await this.pg.query(
          `INSERT INTO stage_vehicles
             (import_session_id, row_number, vehicle_code, operator_code, payload)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.vehicleCode, r.operatorCode, r],
        );
        return;
      case 'route':
        await this.pg.query(
          `INSERT INTO stage_routes
             (import_session_id, row_number, sta_route_number, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staRouteNumber, r],
        );
        return;
      case 'stop':
        await this.pg.query(
          `INSERT INTO stage_stops
             (import_session_id, row_number, sta_stop_id, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staStopId, r],
        );
        return;
      case 'shape':
        await this.pg.query(
          `INSERT INTO stage_shapes
             (import_session_id, row_number, shape_id, shape_pt_sequence, payload)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.shapeId, r.sequence, r],
        );
        return;
      case 'trip':
        await this.pg.query(
          `INSERT INTO stage_trips
             (import_session_id, row_number, sta_trip_id, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staTripId, r],
        );
        return;
      case 'stopTime':
        await this.pg.query(
          `INSERT INTO stage_stop_times
             (import_session_id, row_number, sta_trip_id, sequence, payload)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.staTripId, r.sequence, r],
        );
        return;
      case 'student':
        await this.pg.query(
          `INSERT INTO stage_students
             (import_session_id, row_number, board_student_number, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.boardStudentNumber, r],
        );
        return;
      case 'guardian':
        await this.pg.query(
          `INSERT INTO stage_guardians
             (import_session_id, row_number, guardian_code, payload)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.guardianCode, r],
        );
        return;
      case 'studentGuardian':
        await this.pg.query(
          `INSERT INTO stage_student_guardians
             (import_session_id, row_number, board_student_number, guardian_code, payload)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.boardStudentNumber, r.guardianCode, r],
        );
        return;
      case 'ridership':
        await this.pg.query(
          `INSERT INTO stage_ridership
             (import_session_id, row_number, board_student_number, sta_route_number,
              sta_stop_id, direction_id, payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [sessionId, row, r.boardStudentNumber, r.staRouteNumber, r.staStopId, r.directionId, r],
        );
        return;
    }
  }
}
