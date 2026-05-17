import { CanonicalRecord } from './types/canonical-record';
import { SourceFiles } from './types/source-files';
import { ValidationReport } from './types/validation-report';

/**
 * Contract every transport-data source adapter implements. The pipeline calls
 * `validate()` first (cheap, no DB writes) and only proceeds to `toCanonical()`
 * on `ok: true`. The async iterable streams records in dependency order so the
 * staging writer can drain it without buffering the entire bundle.
 *
 * See `docs/Design/Integrations-STA.md` §4.1 for the design rationale.
 */
export interface TransportDataAdapter {
  readonly source: string;
  validate(input: SourceFiles): Promise<ValidationReport>;
  toCanonical(input: SourceFiles): AsyncIterable<CanonicalRecord>;
}

export const TRANSPORT_DATA_ADAPTERS = Symbol('TRANSPORT_DATA_ADAPTERS');
