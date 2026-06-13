-- Add reset_month column to ai_credits for monthly tracking
ALTER TABLE public.ai_credits 
ADD COLUMN IF NOT EXISTS reset_month text;

-- Update existing records to set reset_month to current month
UPDATE public.ai_credits 
SET reset_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE reset_month IS NULL;

-- Make reset_month NOT NULL with default
ALTER TABLE public.ai_credits 
ALTER COLUMN reset_month SET DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_credits_user_month ON public.ai_credits(user_id, reset_month);