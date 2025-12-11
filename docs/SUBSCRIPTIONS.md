# Subscriptions and quotas

## Tiers

- **free_trial (3 days):** 50 generations, 15 edits, 50 clarifying calls.
- **basic ($7.99/mo):** 800 generations, 200 edits, 800 clarifying calls.
- **advanced ($12.99/mo):** 1,800 generations (up to 200 finals on `gpt-4.1`), 400 edits, 1,800 clarifying calls.
- **expired:** 0 quotas; prompt users to upgrade.

## Billing cycle

- Usage counters reset every 30 days (`period_start`).
- Trial auto-expires after 3 days; tier changes to `expired`.

## Enforcement

- Server-side guard `assertAndConsumeQuota(userId, kind, opts?)` blocks and increments on each call:
  - `clarifying` → clarifying questions call
  - `generation` → final prompt call (passes `consumePremiumFinal` when using premium model)
  - `edit` → prompt edit call
- On QUOTA_EXCEEDED the UI surfaces an error and stops the flow.
- Model routing:
  - Clarifying + edits: always `gpt-4.1-mini`
  - Final prompt: `gpt-4.1-mini` for free_trial/basic; `gpt-4.1` for advanced (consumes premium_final quota)

## Schema

- Table `user_subscriptions` (PK `user_id`):
  - `subscription_tier`, `trial_expires_at`, `period_start`
  - quotas: `quota_generations`, `quota_edits`, `quota_clarifying`
  - usage: `usage_generations`, `usage_edits`, `usage_clarifying`
  - `updated_at`
- RLS mirrors `user_preferences`: users can CRUD their own row; service role has full access.
