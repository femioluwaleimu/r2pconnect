-- Create a security definer function to get user's institution_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_institution_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles with restrictions" ON public.profiles;

-- Create a simple policy that allows users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow institution admins to view profiles in their institution
CREATE POLICY "Institution admins can view institution profiles"
ON public.profiles
FOR SELECT
USING (
  institution_id IN (
    SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
  )
);

-- Allow users in same institution to view each other
CREATE POLICY "Users can view same institution profiles"
ON public.profiles
FOR SELECT
USING (
  institution_id IS NOT NULL 
  AND institution_id = public.get_user_institution_id(auth.uid())
);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));