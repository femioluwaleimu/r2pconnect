-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('researcher', 'institution', 'industry', 'investor', 'admin');

-- Create enum for research status
CREATE TYPE public.research_status AS ENUM ('draft', 'under_review', 'revision_requested', 'approved', 'published', 'rejected');

-- Create enum for subscription tier
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  institution_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'researcher',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Institutions table
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key to profiles for institution
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_institution 
FOREIGN KEY (institution_id) REFERENCES public.institutions(id);

-- Research papers table
CREATE TABLE public.research_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  abstract TEXT,
  ai_summary TEXT,
  keywords TEXT[],
  industry_tags TEXT[],
  file_url TEXT,
  file_name TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES public.institutions(id),
  status research_status NOT NULL DEFAULT 'draft',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_comments TEXT,
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Credits/wallet table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_withdrawn DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI credits tracking (daily limit)
CREATE TABLE public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 3,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reset_date)
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  paystack_customer_id TEXT,
  paystack_subscription_code TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT true,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Industry challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_amount DECIMAL(10,2),
  reward_currency TEXT DEFAULT 'NGN',
  industry_id UUID REFERENCES auth.users(id) NOT NULL,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles RLS
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Institutions RLS
CREATE POLICY "Anyone can view verified institutions" ON public.institutions FOR SELECT USING (is_verified = true OR admin_user_id = auth.uid());
CREATE POLICY "Institution admins can update" ON public.institutions FOR UPDATE USING (admin_user_id = auth.uid());
CREATE POLICY "Admins can insert institutions" ON public.institutions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'institution'));

-- Research papers RLS
CREATE POLICY "Anyone can view published papers" ON public.research_papers FOR SELECT USING (status = 'published' OR author_id = auth.uid() OR reviewer_id = auth.uid());
CREATE POLICY "Authors can insert papers" ON public.research_papers FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own papers" ON public.research_papers FOR UPDATE USING (auth.uid() = author_id OR auth.uid() = reviewer_id);
CREATE POLICY "Authors can delete own draft papers" ON public.research_papers FOR DELETE USING (auth.uid() = author_id AND status = 'draft');

-- User credits RLS
CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert credits" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI credits RLS
CREATE POLICY "Users can view own ai credits" ON public.ai_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai credits" ON public.ai_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai credits" ON public.ai_credits FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions RLS
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Challenges RLS
CREATE POLICY "Anyone can view active challenges" ON public.challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Industry users can insert challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = industry_id AND public.has_role(auth.uid(), 'industry'));
CREATE POLICY "Industry users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = industry_id);

-- Trigger to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
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
  
  -- Insert default subscription
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON public.research_papers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON public.user_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for research papers
INSERT INTO storage.buckets (id, name, public) VALUES ('research-papers', 'research-papers', false);

-- Storage policies
CREATE POLICY "Users can upload own papers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own papers" ON storage.objects FOR SELECT USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own papers" ON storage.objects FOR UPDATE USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own papers" ON storage.objects FOR DELETE USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);