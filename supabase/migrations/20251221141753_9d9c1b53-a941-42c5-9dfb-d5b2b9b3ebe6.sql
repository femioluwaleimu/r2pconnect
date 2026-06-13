-- Create subscription_plans table for admin-managed plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  amount_usd numeric NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'month',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_challenges integer NOT NULL DEFAULT 1,
  ai_matches_per_challenge integer NOT NULL DEFAULT 3,
  ai_credits_per_day integer NOT NULL DEFAULT 3,
  max_research_uploads integer NOT NULL DEFAULT 1,
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  user_type text NOT NULL DEFAULT 'researcher',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Admins can manage all plans
CREATE POLICY "Admins can insert subscription plans"
ON public.subscription_plans
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscription plans"
ON public.subscription_plans
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscription plans"
ON public.subscription_plans
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans for researchers
INSERT INTO public.subscription_plans (plan_id, name, description, amount_usd, period, features, max_challenges, ai_matches_per_challenge, ai_credits_per_day, max_research_uploads, is_popular, user_type, sort_order) VALUES
('researcher_free', 'Free', 'Get started with basic features', 0, 'forever', '["3 AI credits/day", "1 research upload", "Basic analytics", "Community support"]', 0, 0, 3, 1, false, 'researcher', 1),
('researcher_basic', 'Basic', 'For active researchers', 5, 'month', '["10 AI credits/day", "5 research uploads", "Enhanced analytics", "Email support", "Priority review"]', 0, 0, 10, 5, false, 'researcher', 2),
('researcher_pro', 'Pro', 'For serious researchers', 15, 'month', '["50 AI credits/day", "Unlimited uploads", "Advanced analytics", "Priority support", "Industry matching", "EduTV feature eligibility"]', 0, 0, 50, -1, true, 'researcher', 3),
('researcher_enterprise', 'Enterprise', 'For institutions', 50, 'month', '["Unlimited AI credits", "Unlimited uploads", "Custom analytics", "Dedicated support", "API access", "Custom branding", "Team management"]', 0, 0, -1, -1, false, 'researcher', 4);

-- Insert default plans for industry
INSERT INTO public.subscription_plans (plan_id, name, description, amount_usd, period, features, max_challenges, ai_matches_per_challenge, ai_credits_per_day, max_research_uploads, is_popular, user_type, sort_order) VALUES
('industry_free', 'Starter', 'Get started with challenges', 0, 'forever', '["1 challenge/month", "3 AI matches per challenge", "Basic analytics"]', 1, 3, 0, 0, false, 'industry', 1),
('industry_basic', 'Growth', 'For growing companies', 25, 'month', '["5 challenges/month", "10 AI matches per challenge", "Enhanced analytics", "Email support"]', 5, 10, 0, 0, false, 'industry', 2),
('industry_pro', 'Professional', 'For established businesses', 75, 'month', '["20 challenges/month", "25 AI matches per challenge", "Advanced analytics", "Priority support", "Featured challenges"]', 20, 25, 0, 0, true, 'industry', 3),
('industry_enterprise', 'Enterprise', 'For large organizations', 200, 'month', '["Unlimited challenges", "100 AI matches per challenge", "Custom analytics", "Dedicated support", "API access"]', 999, 100, 0, 0, false, 'industry', 4);