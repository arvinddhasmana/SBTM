/**
 * Ontario MTO / school-board norms applied when regenerating bus-route seed
 * data. These are also the defaults a future "regen against a live STA bundle"
 * pipeline will enforce when planning replacement stops/shapes.
 *
 * Sources:
 *   - Ontario Ministry of Education / MTO student-transportation policy
 *   - OCDSB, OCSB, RCDSB, RCCDSB published transportation eligibility pages
 *
 * These are intentionally conservative; concrete boards may override.
 */
export const MUNICIPAL_RULES = {
  /** Minimum great-circle distance between two consecutive bus stops on a
   * route. Matches the ~250 m spacing most Ontario boards publish for K–8
   * pickup stops in residential neighbourhoods. */
  MIN_STOP_SPACING_M: 250,

  /** Maximum walking distance from a student's home to their assigned stop.
   * 1.6 km is the Ontario MTO / OSTA eligibility threshold for K–8 students.
   * Students living further away qualify for transportation. */
  MAX_WALK_DISTANCE_M: 1600,

  /** Number of pickup stops generated per route (excluding the school
   * itself, which is always the last stop on AM trips and the first stop on
   * PM trips). 5 is the median for Ottawa-area elementary bus runs. */
  STOPS_PER_ROUTE: 5,

  /** Per-stop dwell while loading/unloading, in seconds. Matches the
   * existing seed data convention and is roughly what Stock Transportation
   * dispatch budgets for residential elementary stops. */
  DWELL_SECONDS: 30,

  /** Inter-stop drive time used when synthesising stop-times. Stops are
   * spaced so that boarding finishes ~3 min apart. Real bell schedules are
   * tighter (60–90 s) in dense urban areas; we use 180 s for headroom. */
  STOP_TRAVEL_SECONDS: 180,
} as const;

/**
 * Bell windows by board (24-h local clock).
 *
 * - `amArrive`: target school-arrival time for AM trips. Pickups are
 *   back-scheduled from this time.
 * - `pmDepart`: school-departure time for PM trips. Dropoffs are
 *   forward-scheduled from this time.
 *
 * Per the prompt: AM arrival window 08:30–08:50, PM departure 15:00–15:30.
 */
export type BoardCode = 'OCDSB' | 'OCSB' | 'RCDSB' | 'RCCDSB';

export interface BellWindow {
  amArrive: string; // HH:MM:SS, before school bell
  pmDepart: string; // HH:MM:SS, after school bell
}

export const BELL_SCHEDULE: Record<BoardCode, BellWindow> = {
  OCDSB: { amArrive: '08:35:00', pmDepart: '15:15:00' },
  OCSB: { amArrive: '08:40:00', pmDepart: '15:20:00' },
  RCDSB: { amArrive: '08:30:00', pmDepart: '15:00:00' },
  RCCDSB: { amArrive: '08:45:00', pmDepart: '15:30:00' },
};
