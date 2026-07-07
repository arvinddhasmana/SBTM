import type { BoardCode } from './municipal-rules';

/**
 * School registry used by the seed-regen pipeline. Coordinates point to real
 * locations in Ottawa / Pembroke that sit on the Ontario OSRM road network,
 * so OSRM `/nearest` and `/route` always succeed against `infra/osrm-data/
 * ontario.osrm`.
 *
 * The `school_code` and `school_name` columns match the existing seed bundle
 * so we don't have to cascade renames into seed-v2.sql or downstream
 * authentication seeds. Only the latitude/longitude (and via the regen, the
 * surrounding stop/student layouts) change.
 *
 * `serviceRadiusM` is the radius around the school within which pickup stops
 * are generated. Ottawa (urban) uses 3 km — typical OCDSB/OCSB elementary
 * catchment. Pembroke (rural) uses 8 km — RCDSB/RCCDSB serve a much sparser
 * population.
 */
export interface SchoolDef {
  staShortCode: 'OSTA' | 'RCJTC' | 'OCSB';
  boardCode: BoardCode;
  schoolCode: string;
  schoolName: string;
  /** Real Ontario location used for OSRM routing. Documented in
   * `realWorldRef` so future maintainers know what we approximated. */
  lat: number;
  lon: number;
  /** Plain-text address that ships in `board-school.csv` and downstream
   * student records as a placeholder home street. */
  address: string;
  bellScheduleCode: string;
  /** Stop-planning radius around the school, in metres. */
  serviceRadiusM: number;
  /** Human note linking the synthesised name to the real school whose
   * coordinates we use, so future contributors can sanity-check. */
  realWorldRef: string;
}

export const SCHOOLS: SchoolDef[] = [
  {
    staShortCode: 'OCSB',
    boardCode: 'OCSB',
    schoolCode: 'OCSB-S200',
    schoolName: 'St. Bernadette School',
    // Real St. Bernadette School in Stittsville.
    lat: 45.27056296121226,
    lon: -75.8850133153421,
    address: '60 Defence St, Stittsville, ON K2V 0N3',
    bellScheduleCode: 'BELL-0830',
    serviceRadiusM: 3000,
    realWorldRef: 'St. Bernadette School, 60 Defence St, Stittsville',
  },
  {
    staShortCode: 'OSTA',
    boardCode: 'OCDSB',
    schoolCode: 'OCDSB-S100',
    schoolName: 'Maplewood Secondary School',
    // Approximate real OCDSB secondary near downtown Ottawa (Lisgar area).
    lat: 45.4191,
    lon: -75.6932,
    address: '29 Lisgar St, Ottawa ON',
    bellScheduleCode: 'BELL-0905',
    serviceRadiusM: 3000,
    realWorldRef: 'Coords approximate Lisgar Collegiate, downtown Ottawa',
  },
  {
    staShortCode: 'RCJTC',
    boardCode: 'RCDSB',
    schoolCode: 'RCDSB-S400',
    schoolName: 'Pinecrest Public School',
    // Approximate real RCDSB high school in Pembroke (Fellowes HS area).
    lat: 45.8261,
    lon: -77.1043,
    address: '655 Mackay St, Pembroke ON',
    bellScheduleCode: 'BELL-0830',
    serviceRadiusM: 8000,
    realWorldRef: 'Coords approximate Fellowes HS, Pembroke',
  },
  {
    staShortCode: 'RCJTC',
    boardCode: 'RCCDSB',
    schoolCode: 'RCCDSB-S500',
    schoolName: 'Cathedral Catholic School',
    // Approximate real RCCDSB high school in Pembroke (Bishop Smith CHS area).
    lat: 45.8242,
    lon: -77.1117,
    address: '362 Carmody St, Pembroke ON',
    bellScheduleCode: 'BELL-0845',
    serviceRadiusM: 8000,
    realWorldRef: 'Coords approximate Bishop Smith CHS, Pembroke',
  },
];

export function schoolByCode(code: string): SchoolDef {
  const s = SCHOOLS.find((x) => x.schoolCode === code);
  if (!s) throw new Error(`unknown school_code: ${code}`);
  return s;
}
