import { OsrmClient, StubOsrmClient } from './osrm-client';

export const OSRM_CLIENT = Symbol('OSRM_CLIENT');

/**
 * Default OSRM provider — ships the stub (straight-line passthrough of stop
 * coords). The real HTTP-backed client is wired by overriding this provider in
 * deployments that have an OSRM endpoint configured.
 */
export const osrmClientProvider = {
  provide: OSRM_CLIENT,
  useFactory: (): OsrmClient => new StubOsrmClient(),
};
