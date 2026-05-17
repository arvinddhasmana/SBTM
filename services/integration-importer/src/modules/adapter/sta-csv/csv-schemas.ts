import { z } from 'zod';

const Bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v.toLowerCase() === 'true'));

const NullableStr = z
  .union([z.string(), z.literal(''), z.null(), z.undefined()])
  .transform((v) => (v === '' || v == null ? null : String(v)));

const NullableNum = z
  .union([z.string(), z.number(), z.literal(''), z.null(), z.undefined()])
  .transform((v) => (v === '' || v == null ? null : typeof v === 'number' ? v : Number(v)));

export const BoardSchoolRowSchema = z.object({
  sta_short_code: z.string().min(2),
  board_code: z.string().min(1),
  board_name: z.string().min(1),
  school_code: z.string().min(1),
  school_name: z.string().min(1),
  address: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  bell_schedule_code: z.string(),
  alerts_enabled: Bool,
});

export const OperatorsRowSchema = z.object({
  operator_code: z.string().min(1),
  legal_name: z.string().min(1),
  legal_entity_id: NullableStr,
  contact_email: NullableStr,
  contact_phone: NullableStr,
});

export const VehiclesRowSchema = z.object({
  vehicle_code: z.string().min(1),
  operator_code: z.string().min(1),
  license_plate: NullableStr,
  capacity_seated: z.coerce.number().int().positive(),
  capacity_wheelchair: z.coerce.number().int().nonnegative(),
  equipment_json: NullableStr,
});

export const RoutesRowSchema = z.object({
  sta_route_number: z.string().min(1),
  description: z.string(),
  board_code: z.string().min(1),
  school_code: z.string().min(1),
  direction: z.enum(['AM', 'PM', 'MIDDAY']),
  operator_code: z.string().min(1),
  effective_from: z.string(),
  effective_to: z.string(),
});

export const StopsRowSchema = z.object({
  sta_stop_id: z.string().min(1),
  name: z.string().min(1),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  stop_kind: z.enum(['pickup', 'dropoff', 'school', 'depot']),
  hazard_zone: Bool,
});

export const ShapesRowSchema = z.object({
  shape_id: z.string().min(1),
  shape_pt_lat: z.coerce.number(),
  shape_pt_lon: z.coerce.number(),
  shape_pt_sequence: z.coerce.number().int().nonnegative(),
  shape_dist_traveled: NullableNum,
});

export const TripsRowSchema = z.object({
  sta_trip_id: z.string().min(1),
  sta_route_number: z.string().min(1),
  service_id: z.string().min(1),
  direction_id: z.coerce.number().int().min(0).max(1),
  shape_id: NullableStr,
  headsign: NullableStr,
  block_id: NullableStr,
});

export const StopTimesRowSchema = z.object({
  sta_route_number: z.string().min(1),
  sta_trip_id: z.string().min(1),
  sta_stop_id: z.string().min(1),
  sequence: z.coerce.number().int().nonnegative(),
  scheduled_arrival: z.string().min(1),
  scheduled_departure: z.string().min(1),
  dwell_seconds: z.coerce.number().int().nonnegative().default(0),
});

export const StudentsRowSchema = z.object({
  board_student_number: z.string().min(1),
  oen: NullableStr,
  legal_name: z.string().min(1),
  preferred_name: NullableStr,
  grade: z.string().min(1),
  date_of_birth: z.string(),
  school_code: z.string().min(1),
  home_address: z.string(),
  home_lat: z.coerce.number(),
  home_lon: z.coerce.number(),
  eligibility_kind: z.enum(['mandatory', 'courtesy', 'paid']),
  medical_flags_json: NullableStr,
  transport_flags_json: NullableStr,
});

export const GuardiansRowSchema = z.object({
  guardian_code: z.string().min(1),
  legal_name: z.string().min(1),
  email: NullableStr,
  phone: NullableStr,
  preferred_language: z.string().default('en'),
});

export const StudentGuardiansRowSchema = z.object({
  board_student_number: z.string().min(1),
  guardian_code: z.string().min(1),
  relationship: z.string().min(1),
  is_primary_pickup: Bool,
  effective_from: z.string(),
});

export const RidershipRowSchema = z.object({
  board_student_number: z.string().min(1),
  sta_route_number: z.string().min(1),
  sta_stop_id: z.string().min(1),
  direction: z.coerce.number().int().min(0).max(1),
  effective_from: z.string(),
  effective_to: NullableStr,
});

export const FILE_SCHEMAS = {
  'board-school.csv': BoardSchoolRowSchema,
  'sta-operators.csv': OperatorsRowSchema,
  'sta-vehicles.csv': VehiclesRowSchema,
  'sta-routes.csv': RoutesRowSchema,
  'sta-stops.csv': StopsRowSchema,
  'sta-shapes.csv': ShapesRowSchema,
  'sta-trips.csv': TripsRowSchema,
  'sta-stop-times.csv': StopTimesRowSchema,
  'students.csv': StudentsRowSchema,
  'guardians.csv': GuardiansRowSchema,
  'student-guardians.csv': StudentGuardiansRowSchema,
  'ridership.csv': RidershipRowSchema,
} as const;

export type FileName = keyof typeof FILE_SCHEMAS;

export const FILE_ORDER: FileName[] = [
  'board-school.csv',
  'sta-operators.csv',
  'sta-vehicles.csv',
  'sta-routes.csv',
  'sta-stops.csv',
  'sta-shapes.csv',
  'sta-trips.csv',
  'sta-stop-times.csv',
  'students.csv',
  'guardians.csv',
  'student-guardians.csv',
  'ridership.csv',
];
