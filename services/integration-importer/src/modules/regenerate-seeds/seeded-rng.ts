/**
 * Deterministic small-state PRNG (mulberry32). The seed-regen pipeline uses
 * it so re-running with the same `--seed=<n>` produces byte-identical CSVs.
 *
 * Don't use this for anything security-relevant — it's only here so the
 * regenerated bundle is reproducible across machines and CI runs.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force into uint32 space.
    this.state = seed >>> 0 || 1;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
}
