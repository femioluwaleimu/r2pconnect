-- Tighten institution_commissions insert policy to service role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'institution_commissions'
      AND policyname = 'Service role can insert commissions'
  ) THEN
    EXECUTE 'DROP POLICY "Service role can insert commissions" ON public.institution_commissions';
  END IF;
END $$;

CREATE POLICY "Service role can insert commissions"
ON public.institution_commissions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');