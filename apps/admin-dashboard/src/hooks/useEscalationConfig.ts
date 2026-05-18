import { useQuery } from '@tanstack/react-query';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { EscalationConfig } from '../types/alert-config';

/**
 * Default escalation timings used when the configuration API is unreachable
 * (initial load, auth failure, or transient outage).
 *
 * These match the seeded defaults in
 * `services/emergency-alerts/src/migrations/001-create-alert-config-tables.sql`
 * for tier1-default. They exist so the UI never displays a hardcoded value
 * that conflicts with the configured one — if the API responds, those values
 * always win.
 */
export const DEFAULT_ESCALATION_TIMING: Required<
  Pick<EscalationConfig, 'confirmationTimeoutMs' | 'boardEscalationMs' | 'staEscalationMs'>
> = {
  confirmationTimeoutMs: 120_000,
  boardEscalationMs: 300_000,
  staEscalationMs: 900_000,
};

/**
 * Fetch the escalation timing configuration for a single tier.
 *
 * The result drives all client-side timers (e.g. AlertDetail / AlertConfirmationModal
 * countdowns) so they stay aligned with the values the backend uses to schedule
 * BullMQ escalation jobs (`AlertsService.getEscalationTiming`).
 *
 * The query stays valid for 1 minute and is shared across components via React
 * Query so multiple alert overlays don't re-fetch.
 */
export function useEscalationConfig(tier: string | null | undefined) {
  return useQuery({
    queryKey: ['alertConfig', 'escalationConfig', tier],
    queryFn: () => alertConfigApi.getEscalationConfig(tier as string),
    enabled: Boolean(tier),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Returns the effective confirmation-timeout window (ms) for the given tier,
 * falling back to the seeded default if the API has not yet responded or the
 * tier is unknown. Always returns a positive number.
 */
export function useConfirmationTimeoutMs(tier: string | null | undefined): number {
  const { data } = useEscalationConfig(tier);
  const value = data?.confirmationTimeoutMs;
  if (typeof value === 'number' && value > 0) return value;
  return DEFAULT_ESCALATION_TIMING.confirmationTimeoutMs;
}
