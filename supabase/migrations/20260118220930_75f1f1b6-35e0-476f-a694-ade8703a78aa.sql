-- Add RLS policy to allow supervisors to view research papers assigned to them
CREATE POLICY "Supervisors can view assigned research papers" 
ON public.research_papers 
FOR SELECT 
USING (
  auth.uid() = supervisor_id OR auth.uid() = co_supervisor_id
);

-- Add RLS policy to allow supervisors to update research papers assigned to them (for approval actions)
CREATE POLICY "Supervisors can update assigned research papers" 
ON public.research_papers 
FOR UPDATE 
USING (
  auth.uid() = supervisor_id OR auth.uid() = co_supervisor_id
);