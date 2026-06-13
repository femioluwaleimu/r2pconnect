
CREATE TABLE public.admin_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'NGN',
  category text DEFAULT 'general',
  expense_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all expenses"
ON public.admin_expenses
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
