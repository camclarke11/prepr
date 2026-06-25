import type { HouseholdDO } from './household';

export interface Env {
  HOUSEHOLD: DurableObjectNamespace<HouseholdDO>;
  /** Workers AI binding (recipe import). */
  AI: Ai;
  /** R2 bucket for optional recipe photos. */
  PHOTOS: R2Bucket;
  /** Comma-separated list of browser origins allowed to call the API. */
  ALLOWED_ORIGINS: string;
  // Web Push (Phase 3) — set as Worker secrets at deploy time.
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  /**
   * Serper.dev API key (Google results) — when set, the smart shop resolves each
   * item to a real supermarket product-page URL. Falls back to a name search if
   * unset. Set as a Worker secret: `wrangler secret put SERPER_API_KEY`.
   */
  SERPER_API_KEY?: string;
}
