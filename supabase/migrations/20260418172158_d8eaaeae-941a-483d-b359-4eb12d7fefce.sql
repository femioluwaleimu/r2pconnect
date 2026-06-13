ALTER TABLE public.coupon_codes
ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
ADD COLUMN plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_coupon_codes_institution_id ON public.coupon_codes(institution_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_plan_id ON public.coupon_codes(plan_id);