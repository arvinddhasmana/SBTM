import { SeededRng } from './seeded-rng';

describe('SeededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i += 1) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    const aSeq = Array.from({ length: 10 }, () => a.next());
    const bSeq = Array.from({ length: 10 }, () => b.next());
    expect(aSeq).not.toEqual(bSeq);
  });

  it('next() stays in [0, 1)', () => {
    const r = new SeededRng(123);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range(lo, hi) stays in [lo, hi)', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.range(-50, 50);
      expect(v).toBeGreaterThanOrEqual(-50);
      expect(v).toBeLessThan(50);
    }
  });
});
