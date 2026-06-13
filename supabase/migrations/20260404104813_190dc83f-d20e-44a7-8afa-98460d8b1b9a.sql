-- Create ipn_activations table
CREATE TABLE public.ipn_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  id_document_url TEXT,
  payment_reference TEXT,
  payment_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_id',
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ipn_activations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "IPN users can view own activation"
ON public.ipn_activations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "IPN users can create own activation"
ON public.ipn_activations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "IPN users can update own activation"
ON public.ipn_activations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activations"
ON public.ipn_activations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_ipn_activations_updated_at
BEFORE UPDATE ON public.ipn_activations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add state column to ipn_companies
ALTER TABLE public.ipn_companies ADD COLUMN IF NOT EXISTS state TEXT;

-- Create storage bucket for IPN documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ipn-documents', 'ipn-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ipn-documents
CREATE POLICY "IPN users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ipn-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "IPN users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ipn-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all ipn documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ipn-documents' AND public.has_role(auth.uid(), 'admin'));

-- Add default activation fee setting
INSERT INTO public.platform_settings (key, value, type)
VALUES ('ipn_activation_fee_ngn', '5000', 'number')
ON CONFLICT (key) DO NOTHING;