
-- Create departments table for department-level onboarding
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  onboarding_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id, name)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Anyone can view active departments
CREATE POLICY "Anyone can view active departments"
ON public.departments FOR SELECT
USING (is_active = true);

-- Institution admins can manage departments
CREATE POLICY "Institution admins can manage departments"
ON public.departments FOR ALL
USING (EXISTS (
  SELECT 1 FROM institutions
  WHERE institutions.id = departments.institution_id
  AND institutions.admin_user_id = auth.uid()
));

-- Admins can manage all departments
CREATE POLICY "Admins can manage all departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add onboarding_type to institutions
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS onboarding_type TEXT DEFAULT 'full_institution';

-- Create trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
