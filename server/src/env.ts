import type { HouseholdDO } from './household';

export interface Env {
  HOUSEHOLD: DurableObjectNamespace<HouseholdDO>;
  /** Comma-separated list of browser origins allowed to call the API. */
  ALLOWED_ORIGINS: string;
  // Web Push (Phase 3) — set as Worker secrets at deploy time.
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}
