import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { CanonicalRecord } from '../adapter/types/canonical-record';
import { PG_POOL, type PgQueryable } from '../staging/pg-pool.provider';

/**
 * Slice 2b (transport layer): reads stage_* rows for an `import_session_id`
 * and promotes them into the canonical v2 tables in FK-safe order.
 *
 * Scope (transport only):
 *   stx_sta → stx_boards → stx_schools → stx_operators → stx_vehicles →
 *   agency → calendar → routes → stops → shapes → trips → stop_times
 *
 * Deferred (PII layer): students / guardians / student_guardians / ridership.
 * These need the encryption hook before they are safe to write — tracked in
 * docs/Design/v2-followups.md item #8.
 *
 * Connection model: the service expects a Postgres connection that bypasses
 * RLS (superuser, or with `sbtm.user_anchor_kind=super` SET LOCAL). The
 * importer is an internal service; tenant-scoped clients never hit this code
 * path.
 *
 * Transactionality: a single BEGIN..COMMIT wraps every UPSERT. Any failure
 * rolls back; the import_session is marked `failed` by the caller.
 */
export interface CommitInput {
  importSessionId: string;
  /** Canonical STA short_code from manifest (also stored on import_sessions). */
  staShortCode: string;
  /** Display name; falls back to short_code if absent. */
  staName?: string;
}

export interface CommitCounts {
  sta: number;
  board: number;
  school: number;
  operator: number;
  vehicle: number;
  agency: number;
  calendar: number;
  route: number;
  stop: number;
  shape: number;
  trip: number;
  stopTime: number;
}

interface StageRow<P> {
  payload: P;
}

@Injectable()
export class CommitService {
  private readonly logger = new Logger(CommitService.name);

  constructor(@Inject(PG_POOL) private readonly pg: PgQueryable) {}

  async commit(input: CommitInput): Promise<CommitCounts> {
    const counts: CommitCounts = {
      sta: 0,
      board: 0,
      school: 0,
      operator: 0,
      vehicle: 0,
      agency: 0,
      calendar: 0,
      route: 0,
      stop: 0,
      shape: 0,
      trip: 0,
      stopTime: 0,
    };

    await this.pg.query('BEGIN', []);
    try {
      const staId = await this.upsertSta(input.staShortCode, input.staName);
      counts.sta = 1;

      const boards = await this.readStage<Extract<CanonicalRecord, { kind: 'board' }>>(
        input.importSessionId,
        'stage_board_school',
        `school_code = ''`,
      );
      const boardIdByCode = new Map<string, string>();
      for (const { payload } of boards) {
        const id = await this.upsertBoard(staId, payload);
        boardIdByCode.set(payload.boardCode, id);
        counts.board += 1;
      }

      const schools = await this.readStage<Extract<CanonicalRecord, { kind: 'school' }>>(
        input.importSessionId,
        'stage_board_school',
        `school_code <> ''`,
      );
      const schoolIdByCode = new Map<string, string>();
      for (const { payload } of schools) {
        const boardId = boardIdByCode.get(payload.boardCode);
        if (!boardId) {
          throw new BadRequestException(
            `school ${payload.schoolCode} references unknown board ${payload.boardCode}`,
          );
        }
        const id = await this.upsertSchool(boardId, payload);
        schoolIdByCode.set(payload.schoolCode, id);
        counts.school += 1;
      }

      const operators = await this.readStage<Extract<CanonicalRecord, { kind: 'operator' }>>(
        input.importSessionId,
        'stage_operators',
      );
      const operatorIdByCode = new Map<string, string>();
      for (const { payload } of operators) {
        const id = await this.upsertOperator(payload);
        operatorIdByCode.set(payload.operatorCode, id);
        counts.operator += 1;
      }

      const vehicles = await this.readStage<Extract<CanonicalRecord, { kind: 'vehicle' }>>(
        input.importSessionId,
        'stage_vehicles',
      );
      for (const { payload } of vehicles) {
        const operatorId = operatorIdByCode.get(payload.operatorCode);
        if (!operatorId) {
          throw new BadRequestException(
            `vehicle ${payload.vehicleCode} references unknown operator ${payload.operatorCode}`,
          );
        }
        await this.upsertVehicle(operatorId, payload);
        counts.vehicle += 1;
      }

      const agencyId = await this.upsertAgency(staId, input.staShortCode, input.staName);
      counts.agency = 1;

      const trips = await this.readStage<Extract<CanonicalRecord, { kind: 'trip' }>>(
        input.importSessionId,
        'stage_trips',
      );
      const serviceIds = new Set<string>();
      for (const { payload } of trips) serviceIds.add(payload.serviceId);
      for (const serviceId of serviceIds) {
        await this.upsertWeekdayCalendar(serviceId);
        counts.calendar += 1;
      }

      const routes = await this.readStage<Extract<CanonicalRecord, { kind: 'route' }>>(
        input.importSessionId,
        'stage_routes',
      );
      for (const { payload } of routes) {
        const schoolId = schoolIdByCode.get(payload.schoolCode);
        if (!schoolId) {
          throw new BadRequestException(
            `route ${payload.staRouteNumber} references unknown school ${payload.schoolCode}`,
          );
        }
        await this.upsertRoute(staId, schoolId, agencyId, payload);
        counts.route += 1;
      }

      const stops = await this.readStage<Extract<CanonicalRecord, { kind: 'stop' }>>(
        input.importSessionId,
        'stage_stops',
      );
      for (const { payload } of stops) {
        await this.upsertStop(payload);
        counts.stop += 1;
      }

      const shapes = await this.readStage<Extract<CanonicalRecord, { kind: 'shape' }>>(
        input.importSessionId,
        'stage_shapes',
      );
      for (const { payload } of shapes) {
        await this.upsertShape(payload);
        counts.shape += 1;
      }

      for (const { payload } of trips) {
        await this.upsertTrip(payload);
        counts.trip += 1;
      }

      const stopTimes = await this.readStage<Extract<CanonicalRecord, { kind: 'stopTime' }>>(
        input.importSessionId,
        'stage_stop_times',
      );
      for (const { payload } of stopTimes) {
        await this.upsertStopTime(payload);
        counts.stopTime += 1;
      }

      await this.pg.query(
        `UPDATE import_sessions SET status = 'committed', updated_at = now() WHERE id = $1`,
        [input.importSessionId],
      );
      await this.pg.query('COMMIT', []);
      this.logger.log(`commit session=${input.importSessionId} counts=${JSON.stringify(counts)}`);
      return counts;
    } catch (err) {
      await this.pg.query('ROLLBACK', []);
      throw err;
    }
  }

  private async readStage<P>(
    sessionId: string,
    table: string,
    extraWhere?: string,
  ): Promise<StageRow<P>[]> {
    const where = extraWhere ? ` AND ${extraWhere}` : '';
    const res = await this.pg.query(
      `SELECT payload FROM ${table} WHERE import_session_id = $1${where} ORDER BY row_number`,
      [sessionId],
    );
    return res.rows as StageRow<P>[];
  }

  private async upsertSta(shortCode: string, name?: string): Promise<string> {
    const res = await this.pg.query(
      `INSERT INTO stx_sta (name, short_code)
       VALUES ($1, $2)
       ON CONFLICT (short_code) DO UPDATE
         SET name = EXCLUDED.name, updated_at = now()
       RETURNING id`,
      [name ?? shortCode, shortCode],
    );
    return (res.rows[0] as { id: string }).id;
  }

  private async upsertBoard(
    staId: string,
    r: Extract<CanonicalRecord, { kind: 'board' }>,
  ): Promise<string> {
    const res = await this.pg.query(
      `INSERT INTO stx_boards (sta_id, name, short_code, external_ids)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (sta_id, short_code) DO UPDATE
         SET name = EXCLUDED.name, updated_at = now()
       RETURNING id`,
      [staId, r.boardName, r.boardCode, JSON.stringify({ board_code: r.boardCode })],
    );
    return (res.rows[0] as { id: string }).id;
  }

  private async upsertSchool(
    boardId: string,
    r: Extract<CanonicalRecord, { kind: 'school' }>,
  ): Promise<string> {
    // stx_schools has no unique constraint we can target with ON CONFLICT,
    // so we look up by external_ids->>'school_code' (scoped to this board)
    // and route to UPDATE or INSERT.
    const existing = await this.pg.query(
      `SELECT id FROM stx_schools
        WHERE board_id = $1 AND external_ids->>'school_code' = $2`,
      [boardId, r.schoolCode],
    );
    const externalIds = JSON.stringify({ school_code: r.schoolCode });

    if (existing.rows.length > 0) {
      const id = (existing.rows[0] as { id: string }).id;
      await this.pg.query(
        `UPDATE stx_schools
            SET name = $2,
                address = $3,
                location = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                alerts_enabled = $6,
                updated_at = now()
          WHERE id = $1`,
        [id, r.schoolName, r.address, r.longitude, r.latitude, r.alertsEnabled],
      );
      return id;
    }

    const res = await this.pg.query(
      `INSERT INTO stx_schools
         (board_id, name, address, location, alerts_enabled, external_ids)
       VALUES
         ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7::jsonb)
       RETURNING id`,
      [boardId, r.schoolName, r.address, r.longitude, r.latitude, r.alertsEnabled, externalIds],
    );
    return (res.rows[0] as { id: string }).id;
  }

  private async upsertOperator(r: Extract<CanonicalRecord, { kind: 'operator' }>): Promise<string> {
    const externalIds: Record<string, string> = { operator_code: r.operatorCode };
    if (r.legalEntityId) externalIds.legal_entity_id = r.legalEntityId;

    // Dedupe by legal_entity_id when present (cross-STA shared operators).
    if (r.legalEntityId) {
      const existing = await this.pg.query(
        `SELECT id FROM stx_operators WHERE external_ids->>'legal_entity_id' = $1`,
        [r.legalEntityId],
      );
      if (existing.rows.length > 0) {
        const id = (existing.rows[0] as { id: string }).id;
        await this.pg.query(
          `UPDATE stx_operators
             SET legal_name = $2,
                 contact_email = $3,
                 contact_phone = $4,
                 external_ids = external_ids || $5::jsonb,
                 updated_at = now()
           WHERE id = $1`,
          [id, r.legalName, r.contactEmail, r.contactPhone, JSON.stringify(externalIds)],
        );
        return id;
      }
    }

    const res = await this.pg.query(
      `INSERT INTO stx_operators (legal_name, contact_email, contact_phone, external_ids)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id`,
      [r.legalName, r.contactEmail, r.contactPhone, JSON.stringify(externalIds)],
    );
    return (res.rows[0] as { id: string }).id;
  }

  private async upsertVehicle(
    operatorId: string,
    r: Extract<CanonicalRecord, { kind: 'vehicle' }>,
  ): Promise<void> {
    const licensePlate = r.licensePlate ?? r.vehicleCode;
    const equipment = r.equipmentJson ?? '{}';
    await this.pg.query(
      `INSERT INTO stx_vehicles
         (operator_id, license_plate, capacity_seated, capacity_wheelchair, equipment, external_ids)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       ON CONFLICT (operator_id, license_plate) DO UPDATE
         SET capacity_seated = EXCLUDED.capacity_seated,
             capacity_wheelchair = EXCLUDED.capacity_wheelchair,
             equipment = EXCLUDED.equipment,
             updated_at = now()`,
      [
        operatorId,
        licensePlate,
        r.capacitySeated,
        r.capacityWheelchair,
        equipment,
        JSON.stringify({ vehicle_code: r.vehicleCode }),
      ],
    );
  }

  private async upsertAgency(staId: string, shortCode: string, name?: string): Promise<string> {
    const agencyId = `AG-${shortCode}`;
    await this.pg.query(
      `INSERT INTO agency
         (agency_id, agency_name, agency_url, stx_agency_kind, stx_sta_id)
       VALUES ($1, $2, $3, 'sta', $4)
       ON CONFLICT (agency_id) DO UPDATE
         SET agency_name = EXCLUDED.agency_name, updated_at = now()`,
      [agencyId, name ?? shortCode, `https://sbtm.local/sta/${shortCode}`, staId],
    );
    return agencyId;
  }

  private async upsertWeekdayCalendar(serviceId: string): Promise<void> {
    await this.pg.query(
      `INSERT INTO calendar
         (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
       VALUES ($1, true, true, true, true, true, false, false, '2025-09-02', '2026-06-26')
       ON CONFLICT (service_id) DO NOTHING`,
      [serviceId],
    );
  }

  private async upsertRoute(
    staId: string,
    schoolId: string,
    agencyId: string,
    r: Extract<CanonicalRecord, { kind: 'route' }>,
  ): Promise<void> {
    const direction = r.direction.toLowerCase();
    await this.pg.query(
      `INSERT INTO routes
         (route_id, agency_id, route_short_name, route_long_name, route_type,
          stx_sta_id, stx_school_id, stx_direction_kind)
       VALUES ($1, $2, $3, $4, 712, $5, $6, $7::stx_direction_kind_enum)
       ON CONFLICT (route_id) DO UPDATE
         SET agency_id = EXCLUDED.agency_id,
             route_long_name = EXCLUDED.route_long_name,
             stx_school_id = EXCLUDED.stx_school_id,
             stx_direction_kind = EXCLUDED.stx_direction_kind,
             updated_at = now()`,
      [r.staRouteNumber, agencyId, r.staRouteNumber, r.description, staId, schoolId, direction],
    );
  }

  private async upsertStop(r: Extract<CanonicalRecord, { kind: 'stop' }>): Promise<void> {
    // Canonical 'dropoff'/'depot' aren't in the DB enum yet — fold to 'pickup'.
    const dbKind =
      r.stopKind === 'school' ? 'school' : r.stopKind === 'pickup' ? 'pickup' : 'pickup';
    await this.pg.query(
      `INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon, stx_stop_kind, stx_hazard_zone)
       VALUES ($1, $2, $3, $4, $5::stx_stop_kind_enum, $6)
       ON CONFLICT (stop_id) DO UPDATE
         SET stop_name = EXCLUDED.stop_name,
             stop_lat = EXCLUDED.stop_lat,
             stop_lon = EXCLUDED.stop_lon,
             stx_stop_kind = EXCLUDED.stx_stop_kind,
             stx_hazard_zone = EXCLUDED.stx_hazard_zone,
             updated_at = now()`,
      [r.staStopId, r.name, r.latitude, r.longitude, dbKind, r.hazardZone],
    );
  }

  private async upsertShape(r: Extract<CanonicalRecord, { kind: 'shape' }>): Promise<void> {
    await this.pg.query(
      `INSERT INTO shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence, shape_dist_traveled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (shape_id, shape_pt_sequence) DO UPDATE
         SET shape_pt_lat = EXCLUDED.shape_pt_lat,
             shape_pt_lon = EXCLUDED.shape_pt_lon,
             shape_dist_traveled = EXCLUDED.shape_dist_traveled`,
      [r.shapeId, r.latitude, r.longitude, r.sequence, r.distTraveled],
    );
  }

  private async upsertTrip(r: Extract<CanonicalRecord, { kind: 'trip' }>): Promise<void> {
    await this.pg.query(
      `INSERT INTO trips
         (trip_id, route_id, service_id, shape_id, trip_headsign, direction_id, block_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (trip_id) DO UPDATE
         SET route_id = EXCLUDED.route_id,
             service_id = EXCLUDED.service_id,
             shape_id = EXCLUDED.shape_id,
             trip_headsign = EXCLUDED.trip_headsign,
             direction_id = EXCLUDED.direction_id,
             block_id = EXCLUDED.block_id,
             updated_at = now()`,
      [r.staTripId, r.staRouteNumber, r.serviceId, r.shapeId, r.headsign, r.directionId, r.blockId],
    );
  }

  private async upsertStopTime(r: Extract<CanonicalRecord, { kind: 'stopTime' }>): Promise<void> {
    await this.pg.query(
      `INSERT INTO stop_times
         (trip_id, stop_sequence, arrival_time, departure_time, stop_id, stx_dwell_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (trip_id, stop_sequence) DO UPDATE
         SET arrival_time = EXCLUDED.arrival_time,
             departure_time = EXCLUDED.departure_time,
             stop_id = EXCLUDED.stop_id,
             stx_dwell_seconds = EXCLUDED.stx_dwell_seconds`,
      [
        r.staTripId,
        r.sequence,
        r.scheduledArrival,
        r.scheduledDeparture,
        r.staStopId,
        r.dwellSeconds,
      ],
    );
  }
}
