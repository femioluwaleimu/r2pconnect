DROP INDEX IF EXISTS public.idx_coupon_usages_coupon_user_activation_month;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usages_free_coupon_user_activation_month
ON public.coupon_usages (coupon_id, user_id, activation_month)
WHERE final_amount = 0;