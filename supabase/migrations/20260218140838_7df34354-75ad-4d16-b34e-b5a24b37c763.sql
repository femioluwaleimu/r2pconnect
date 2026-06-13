
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_researcher_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profile_researcher_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_researcher_type_check CHECK (researcher_type IN ('student', 'lecturer', 'graduate'));
