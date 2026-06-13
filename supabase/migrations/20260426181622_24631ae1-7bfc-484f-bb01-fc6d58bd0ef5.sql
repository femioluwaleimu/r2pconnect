ALTER TABLE public.coupon_usages
ADD COLUMN IF NOT EXISTS activation_month DATE;

UPDATE public.coupon_usages
SET activation_month = date_trunc('month', used_at AT TIME ZONE 'UTC')::date
WHERE activation_month IS NULL;

ALTER TABLE public.coupon_usages
ALTER COLUMN activation_month SET DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC')::date;

ALTER TABLE public.coupon_usages
ALTER COLUMN activation_month SET NOT NULL;

ALTER TABLE public.coupon_usages
DROP CONSTRAINT IF EXISTS coupon_usages_coupon_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usages_coupon_user_activation_month
ON public.coupon_usages (coupon_id, user_id, activation_month);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_admin_audit
ON public.coupon_usages (used_at DESC, coupon_id, user_id);