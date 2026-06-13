-- Add ai_credits column to subscriptions table for credit rollover
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS ai_credits_remaining integer DEFAULT 0;

-- Update handle_new_user function to include phone_number in profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile with phone_number
  INSERT INTO public.profiles (user_id, full_name, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  
  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'researcher')
  );
  
  -- Insert default credits
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id);
  
  -- Insert default subscription with initial credits based on free tier
  INSERT INTO public.subscriptions (user_id, ai_credits_remaining)
  VALUES (NEW.id, 3);
  
  -- Insert student wallet for researchers
  IF COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'researcher') = 'researcher' THEN
    INSERT INTO public.student_wallet (user_id)
    VALUES (NEW.id);
  END IF;
  
  -- Insert industry wallet for industry users
  IF (NEW.raw_user_meta_data ->> 'role')::app_role = 'industry' THEN
    INSERT INTO public.industry_wallet (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;