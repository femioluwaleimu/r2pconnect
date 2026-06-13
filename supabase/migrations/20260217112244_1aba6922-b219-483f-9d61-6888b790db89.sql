
-- Drop the existing foreign key and recreate with ON DELETE SET NULL
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_institution;
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_institution FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
