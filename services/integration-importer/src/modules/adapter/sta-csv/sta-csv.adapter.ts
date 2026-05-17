import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { parse as csvParse } from 'papaparse';
import { ZodError, ZodTypeAny } from 'zod';
import { TransportDataAdapter } from '../transport-data-adapter.interface';
import { CanonicalRecord } from '../types/canonical-record';
import { ManifestSchema, SourceFiles } from '../types/source-files';
import { ValidationIssue, ValidationReport } from '../types/validation-report';
import { FILE_ORDER, FILE_SCHEMAS, FileName } from './csv-schemas';

const PLACEHOLDER_HASH = '<computed-at-export>';

interface ParsedFile<T = unknown> {
  rows: T[];
  errors: ValidationIssue[];
}

@Injectable()
export class StaCsvAdapter implements TransportDataAdapter {
  readonly source = 'sta-csv';

  async validate(input: SourceFiles): Promise<ValidationReport> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const manifestResult = ManifestSchema.safeParse(input.manifest);
    if (!manifestResult.success) {
      for (const issue of manifestResult.error.issues) {
        errors.push({
          file: 'manifest.json',
          message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        });
      }
      return { ok: false, errors, warnings };
    }
    const manifest = manifestResult.data;

    for (const fileName of FILE_ORDER) {
      const buf = input.files.get(fileName);
      const meta = manifest.files[fileName];
      if (!meta) {
        errors.push({
          file: fileName,
          message: `missing from manifest.files`,
        });
        continue;
      }
      if (!buf) {
        errors.push({
          file: fileName,
          message: `bundle is missing file declared in manifest`,
        });
        continue;
      }

      if (meta.sha256 !== PLACEHOLDER_HASH) {
        const actual = createHash('sha256').update(buf).digest('hex');
        if (actual !== meta.sha256) {
          errors.push({
            file: fileName,
            message: `sha256 mismatch: manifest=${meta.sha256} actual=${actual}`,
          });
        }
      } else {
        warnings.push({
          file: fileName,
          message: `sha256 placeholder skipped (synthetic bundle)`,
        });
      }

      const parsed = this.parseFile(fileName, buf, FILE_SCHEMAS[fileName]);
      errors.push(...parsed.errors);
      if (parsed.errors.length === 0 && parsed.rows.length !== meta.row_count) {
        errors.push({
          file: fileName,
          message: `row_count mismatch: manifest=${meta.row_count} actual=${parsed.rows.length}`,
        });
      }
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  async *toCanonical(input: SourceFiles): AsyncIterable<CanonicalRecord> {
    const manifest = ManifestSchema.parse(input.manifest);
    const staShortCode = manifest.sta_short_code;

    // Layer 1 — board/school feeds boards then schools.
    const boardSchoolRows = this.requireRows(input, 'board-school.csv');
    const emittedBoards = new Set<string>();
    for (const row of boardSchoolRows) {
      if (!emittedBoards.has(row.board_code)) {
        emittedBoards.add(row.board_code);
        yield {
          kind: 'board',
          staShortCode: row.sta_short_code,
          boardCode: row.board_code,
          boardName: row.board_name,
        };
      }
    }
    for (const row of boardSchoolRows) {
      yield {
        kind: 'school',
        staShortCode: row.sta_short_code,
        boardCode: row.board_code,
        schoolCode: row.school_code,
        schoolName: row.school_name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        bellScheduleCode: row.bell_schedule_code,
        alertsEnabled: row.alerts_enabled,
      };
    }

    // STA short_code is asserted but currently unused downstream by operator/vehicle.
    void staShortCode;

    for (const row of this.requireRows(input, 'sta-operators.csv')) {
      yield {
        kind: 'operator',
        operatorCode: row.operator_code,
        legalName: row.legal_name,
        legalEntityId: row.legal_entity_id,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
      };
    }

    for (const row of this.requireRows(input, 'sta-vehicles.csv')) {
      yield {
        kind: 'vehicle',
        vehicleCode: row.vehicle_code,
        operatorCode: row.operator_code,
        licensePlate: row.license_plate,
        capacitySeated: row.capacity_seated,
        capacityWheelchair: row.capacity_wheelchair,
        equipmentJson: row.equipment_json,
      };
    }

    for (const row of this.requireRows(input, 'sta-routes.csv')) {
      yield {
        kind: 'route',
        staRouteNumber: row.sta_route_number,
        description: row.description,
        boardCode: row.board_code,
        schoolCode: row.school_code,
        direction: row.direction,
        operatorCode: row.operator_code,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      };
    }

    for (const row of this.requireRows(input, 'sta-stops.csv')) {
      yield {
        kind: 'stop',
        staStopId: row.sta_stop_id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        stopKind: row.stop_kind,
        hazardZone: row.hazard_zone,
      };
    }

    for (const row of this.requireRows(input, 'sta-shapes.csv')) {
      yield {
        kind: 'shape',
        shapeId: row.shape_id,
        sequence: row.shape_pt_sequence,
        latitude: row.shape_pt_lat,
        longitude: row.shape_pt_lon,
        distTraveled: row.shape_dist_traveled,
      };
    }

    for (const row of this.requireRows(input, 'sta-trips.csv')) {
      yield {
        kind: 'trip',
        staTripId: row.sta_trip_id,
        staRouteNumber: row.sta_route_number,
        serviceId: row.service_id,
        directionId: row.direction_id as 0 | 1,
        shapeId: row.shape_id,
        headsign: row.headsign,
        blockId: row.block_id,
      };
    }

    for (const row of this.requireRows(input, 'sta-stop-times.csv')) {
      yield {
        kind: 'stopTime',
        staRouteNumber: row.sta_route_number,
        staTripId: row.sta_trip_id,
        staStopId: row.sta_stop_id,
        sequence: row.sequence,
        scheduledArrival: row.scheduled_arrival,
        scheduledDeparture: row.scheduled_departure,
        dwellSeconds: row.dwell_seconds,
      };
    }

    for (const row of this.requireRows(input, 'students.csv')) {
      yield {
        kind: 'student',
        boardStudentNumber: row.board_student_number,
        oen: row.oen,
        legalName: row.legal_name,
        preferredName: row.preferred_name,
        grade: row.grade,
        dateOfBirth: row.date_of_birth,
        schoolCode: row.school_code,
        homeAddress: row.home_address,
        homeLat: row.home_lat,
        homeLon: row.home_lon,
        eligibilityKind: row.eligibility_kind,
        medicalFlagsJson: row.medical_flags_json,
        transportFlagsJson: row.transport_flags_json,
      };
    }

    for (const row of this.requireRows(input, 'guardians.csv')) {
      yield {
        kind: 'guardian',
        guardianCode: row.guardian_code,
        legalName: row.legal_name,
        email: row.email,
        phone: row.phone,
        preferredLanguage: row.preferred_language,
      };
    }

    for (const row of this.requireRows(input, 'student-guardians.csv')) {
      yield {
        kind: 'studentGuardian',
        boardStudentNumber: row.board_student_number,
        guardianCode: row.guardian_code,
        relationship: row.relationship,
        isPrimaryPickup: row.is_primary_pickup,
        effectiveFrom: row.effective_from,
      };
    }

    for (const row of this.requireRows(input, 'ridership.csv')) {
      yield {
        kind: 'ridership',
        boardStudentNumber: row.board_student_number,
        staRouteNumber: row.sta_route_number,
        staStopId: row.sta_stop_id,
        directionId: row.direction as 0 | 1,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      };
    }
  }

  private requireRows<F extends FileName>(
    input: SourceFiles,
    fileName: F,
  ): Array<ReturnType<(typeof FILE_SCHEMAS)[F]['parse']>> {
    const buf = input.files.get(fileName);
    if (!buf) {
      throw new Error(
        `StaCsvAdapter.toCanonical called before validate() succeeded: ${fileName} missing`,
      );
    }
    const parsed = this.parseFile(fileName, buf, FILE_SCHEMAS[fileName]);
    if (parsed.errors.length > 0) {
      throw new Error(
        `StaCsvAdapter.toCanonical called before validate() succeeded: ${fileName} has ${parsed.errors.length} errors`,
      );
    }
    return parsed.rows as Array<ReturnType<(typeof FILE_SCHEMAS)[F]['parse']>>;
  }

  private parseFile<T = unknown>(fileName: string, buf: Buffer, schema: ZodTypeAny): ParsedFile<T> {
    const errors: ValidationIssue[] = [];
    const rows: T[] = [];

    const text = buf.toString('utf8').replace(/^\uFEFF/, '');
    const result = csvParse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    for (const err of result.errors ?? []) {
      errors.push({
        file: fileName,
        row: err.row,
        message: err.message,
      });
    }

    (result.data ?? []).forEach((raw, idx) => {
      const parsed = schema.safeParse(raw);
      if (parsed.success) {
        rows.push(parsed.data);
      } else {
        for (const issue of (parsed.error as ZodError).issues) {
          errors.push({
            file: fileName,
            row: idx + 2, // 1-based + header row
            column: issue.path.join('.') || undefined,
            message: issue.message,
          });
        }
      }
    });

    return { rows, errors };
  }
}
