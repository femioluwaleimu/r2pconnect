
-- Create FAQ table
CREATE TABLE public.faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  display_location TEXT NOT NULL DEFAULT 'full_page',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

-- Public can read active FAQs
CREATE POLICY "Anyone can view active FAQs"
ON public.faq
FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all FAQs"
ON public.faq
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_faq_updated_at
BEFORE UPDATE ON public.faq
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
