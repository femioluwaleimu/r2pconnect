CREATE POLICY "Admins can view all payment history"
ON public.payment_history
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));