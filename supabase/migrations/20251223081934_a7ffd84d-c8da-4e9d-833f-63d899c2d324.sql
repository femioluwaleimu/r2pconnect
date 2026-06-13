-- Add researcher_type to profiles (lecturer or student)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS researcher_type TEXT CHECK (researcher_type IN ('lecturer', 'student'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matric_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_job_type TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_by UUID;

-- Create job_type enum
DO $$ BEGIN
  CREATE TYPE public.job_type AS ENUM ('part_time', 'siwes', 'industrial_training', 'internship');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create application_status enum
DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected', 'hired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create transaction_type enum
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('funding', 'payment', 'withdrawal', 'commission');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create job_postings table
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type job_type NOT NULL,
  institution_id UUID REFERENCES public.institutions(id),
  department TEXT,
  required_level TEXT[],
  duration TEXT,
  payment_amount NUMERIC,
  payment_currency TEXT DEFAULT 'NGN',
  requirements TEXT[],
  responsibilities TEXT[],
  is_active BOOLEAN DEFAULT true,
  slots_available INTEGER DEFAULT 1,
  slots_filled INTEGER DEFAULT 0,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  cover_letter TEXT,
  status application_status DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  hired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, student_id)
);

-- Create hired_students table for task assignments
CREATE TABLE IF NOT EXISTS public.hired_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  industry_id UUID NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
  total_payment NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_tasks table
CREATE TABLE IF NOT EXISTS public.student_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hired_student_id UUID NOT NULL REFERENCES public.hired_students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create industry_wallet table
CREATE TABLE IF NOT EXISTS public.industry_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  total_funded NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_wallet table
CREATE TABLE IF NOT EXISTS public.student_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  reference TEXT,
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_withdrawals table
CREATE TABLE IF NOT EXISTS public.student_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform_settings for logo and other settings
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- Insert default logo setting if not exists
INSERT INTO public.platform_settings (key, value, type)
VALUES ('platform_logo', NULL, 'image')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_settings (key, value, type)
VALUES ('minimum_withdrawal', '5000', 'number')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hired_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_postings
CREATE POLICY "Anyone can view active job postings" ON public.job_postings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Industry can insert own job postings" ON public.job_postings
  FOR INSERT WITH CHECK (auth.uid() = industry_id AND has_role(auth.uid(), 'industry'));

CREATE POLICY "Industry can update own job postings" ON public.job_postings
  FOR UPDATE USING (auth.uid() = industry_id);

CREATE POLICY "Industry can delete own job postings" ON public.job_postings
  FOR DELETE USING (auth.uid() = industry_id);

CREATE POLICY "Admins can manage all job postings" ON public.job_postings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for job_applications
CREATE POLICY "Students can view own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Industry can view applications for their jobs" ON public.job_applications
  FOR SELECT USING (job_id IN (SELECT id FROM public.job_postings WHERE industry_id = auth.uid()));

CREATE POLICY "Students can insert applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Industry can update applications for their jobs" ON public.job_applications
  FOR UPDATE USING (job_id IN (SELECT id FROM public.job_postings WHERE industry_id = auth.uid()));

CREATE POLICY "Admins can manage all applications" ON public.job_applications
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for hired_students
CREATE POLICY "Students can view own hired records" ON public.hired_students
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Industry can view their hired students" ON public.hired_students
  FOR SELECT USING (auth.uid() = industry_id);

CREATE POLICY "Industry can insert hired students" ON public.hired_students
  FOR INSERT WITH CHECK (auth.uid() = industry_id);

CREATE POLICY "Industry can update their hired students" ON public.hired_students
  FOR UPDATE USING (auth.uid() = industry_id);

CREATE POLICY "Admins can manage all hired students" ON public.hired_students
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for student_tasks
CREATE POLICY "Students can view own tasks" ON public.student_tasks
  FOR SELECT USING (hired_student_id IN (SELECT id FROM public.hired_students WHERE student_id = auth.uid()));

CREATE POLICY "Industry can manage tasks for their hired students" ON public.student_tasks
  FOR ALL USING (hired_student_id IN (SELECT id FROM public.hired_students WHERE industry_id = auth.uid()));

CREATE POLICY "Admins can manage all tasks" ON public.student_tasks
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for industry_wallet
CREATE POLICY "Users can view own industry wallet" ON public.industry_wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own industry wallet" ON public.industry_wallet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own industry wallet" ON public.industry_wallet
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all industry wallets" ON public.industry_wallet
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for student_wallet
CREATE POLICY "Users can view own student wallet" ON public.student_wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own student wallet" ON public.student_wallet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own student wallet" ON public.student_wallet
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all student wallets" ON public.student_wallet
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for student_withdrawals
CREATE POLICY "Students can view own withdrawals" ON public.student_withdrawals
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own withdrawals" ON public.student_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all withdrawals" ON public.student_withdrawals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Update triggers for updated_at
CREATE OR REPLACE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_hired_students_updated_at
  BEFORE UPDATE ON public.hired_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_student_tasks_updated_at
  BEFORE UPDATE ON public.student_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_industry_wallet_updated_at
  BEFORE UPDATE ON public.industry_wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_student_wallet_updated_at
  BEFORE UPDATE ON public.student_wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_student_withdrawals_updated_at
  BEFORE UPDATE ON public.student_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();