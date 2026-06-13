
CREATE POLICY "Admins can update all activations"
ON public.ipn_activations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
