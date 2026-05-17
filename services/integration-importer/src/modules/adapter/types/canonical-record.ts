/**
 * Discriminated union of every entity the importer can yield from a source bundle.
 *
 * Each variant maps 1:1 to a v2 SBTM table; the commit phase (slice 2) consumes
 * this stream and writes the corresponding rows. The shape mirrors the CSV column
 * names from `docs/Design/samples/two-sta-bundle/` after normalisation (camelCase,
 * coerced numeric/boolean/date types where applicable).
 *
 * Adapters MUST emit records in dependency order so foreign-key targets exist by
 * the time dependents arrive. The natural order is:
 *   board → school → operator → vehicle → route → stop → shape → trip →
 *   stopTime → student → guardian → studentGuardian → ridership
 */
export type CanonicalRecord =
  | { kind: 'board'; staShortCode: string; boardCode: string; boardName: string }
  | {
      kind: 'school';
      staShortCode: string;
      boardCode: string;
      schoolCode: string;
      schoolName: string;
      address: string;
      latitude: number;
      longitude: number;
      bellScheduleCode: string;
      alertsEnabled: boolean;
    }
  | {
      kind: 'operator';
      operatorCode: string;
      legalName: string;
      legalEntityId: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
    }
  | {
      kind: 'vehicle';
      vehicleCode: string;
      operatorCode: string;
      licensePlate: string | null;
      capacitySeated: number;
      capacityWheelchair: number;
      equipmentJson: string | null;
    }
  | {
      kind: 'route';
      staRouteNumber: string;
      description: string;
      boardCode: string;
      schoolCode: string;
      direction: 'AM' | 'PM' | 'MIDDAY';
      operatorCode: string;
      effectiveFrom: string;
      effectiveTo: string;
    }
  | {
      kind: 'stop';
      staStopId: string;
      name: string;
      latitude: number;
      longitude: number;
      stopKind: 'pickup' | 'dropoff' | 'school' | 'depot';
      hazardZone: boolean;
    }
  | {
      kind: 'shape';
      shapeId: string;
      sequence: number;
      latitude: number;
      longitude: number;
      distTraveled: number | null;
    }
  | {
      kind: 'trip';
      staTripId: string;
      staRouteNumber: string;
      serviceId: string;
      directionId: 0 | 1;
      shapeId: string | null;
      headsign: string | null;
      blockId: string | null;
    }
  | {
      kind: 'stopTime';
      staRouteNumber: string;
      staTripId: string;
      staStopId: string;
      sequence: number;
      scheduledArrival: string;
      scheduledDeparture: string;
      dwellSeconds: number;
    }
  | {
      kind: 'student';
      boardStudentNumber: string;
      oen: string | null;
      legalName: string;
      preferredName: string | null;
      grade: string;
      dateOfBirth: string;
      schoolCode: string;
      homeAddress: string;
      homeLat: number;
      homeLon: number;
      eligibilityKind: 'mandatory' | 'courtesy' | 'paid';
      medicalFlagsJson: string | null;
      transportFlagsJson: string | null;
    }
  | {
      kind: 'guardian';
      guardianCode: string;
      legalName: string;
      email: string | null;
      phone: string | null;
      preferredLanguage: string;
    }
  | {
      kind: 'studentGuardian';
      boardStudentNumber: string;
      guardianCode: string;
      relationship: string;
      isPrimaryPickup: boolean;
      effectiveFrom: string;
    }
  | {
      kind: 'ridership';
      boardStudentNumber: string;
      staRouteNumber: string;
      staStopId: string;
      directionId: 0 | 1;
      effectiveFrom: string;
      effectiveTo: string | null;
    };

export type CanonicalRecordKind = CanonicalRecord['kind'];
