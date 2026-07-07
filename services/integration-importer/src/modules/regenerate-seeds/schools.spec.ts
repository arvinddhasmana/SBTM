import { BELL_SCHEDULE, MUNICIPAL_RULES } from './municipal-rules';
import { SCHOOLS, schoolByCode } from './schools';

describe('SCHOOLS registry', () => {
  it('has 4 entries spanning both STAs', () => {
    expect(SCHOOLS).toHaveLength(4);
    const osta = SCHOOLS.filter((s) => s.staShortCode === 'OSTA');
    const rcjtc = SCHOOLS.filter((s) => s.staShortCode === 'RCJTC');
    expect(osta).toHaveLength(2);
    expect(rcjtc).toHaveLength(2);
  });

  it('every school has plausible Ontario coordinates', () => {
    for (const s of SCHOOLS) {
      // Rough Ontario bounding box.
      expect(s.lat).toBeGreaterThan(41);
      expect(s.lat).toBeLessThan(57);
      expect(s.lon).toBeGreaterThan(-96);
      expect(s.lon).toBeLessThan(-74);
    }
  });

  it('schoolByCode throws for unknown codes', () => {
    expect(() => schoolByCode('NOPE-S999')).toThrow(/unknown school_code/);
  });

  it('schoolByCode returns the registered entry', () => {
    expect(schoolByCode('OCSB-S200').schoolName).toBe('St. Bernadette School');
  });
});

describe('MUNICIPAL_RULES & BELL_SCHEDULE', () => {
  it('exposes MTO-aligned stop-spacing & walk thresholds', () => {
    expect(MUNICIPAL_RULES.MIN_STOP_SPACING_M).toBe(250);
    expect(MUNICIPAL_RULES.MAX_WALK_DISTANCE_M).toBe(1600);
  });

  it('has a bell window per board', () => {
    for (const code of ['OCDSB', 'OCSB', 'RCDSB', 'RCCDSB'] as const) {
      const b = BELL_SCHEDULE[code];
      expect(b.amArrive).toMatch(/^08:[34]\d:00$/);
      expect(b.pmDepart).toMatch(/^15:[0-3]\d:00$/);
    }
  });
});
