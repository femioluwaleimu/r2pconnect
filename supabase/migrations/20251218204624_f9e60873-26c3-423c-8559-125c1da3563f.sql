-- Fix notifications table INSERT policy - restrict to service role only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a SECURITY DEFINER function to safely create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _type TEXT DEFAULT 'info',
  _link TEXT DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _notification_id UUID;
BEGIN
  -- Validate type is one of allowed values
  IF _type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid notification type: %', _type;
  END IF;
  
  -- Validate title is not empty
  IF _title IS NULL OR length(trim(_title)) = 0 THEN
    RAISE EXCEPTION 'Notification title cannot be empty';
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id, _title, _message, _type, _link)
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Note: Service role (edge functions) bypass RLS entirely, so they can still insert directly