-- Match PostgREST's ON CONFLICT (idempotency_key) target. A normal unique
-- index retains idempotency while also allowing the unqualified conflict
-- target used by notification_deliveries.upsert().
DROP INDEX IF EXISTS public.notification_deliveries_idempotency_key_idx;

CREATE UNIQUE INDEX notification_deliveries_idempotency_key_idx
ON public.notification_deliveries (idempotency_key);
