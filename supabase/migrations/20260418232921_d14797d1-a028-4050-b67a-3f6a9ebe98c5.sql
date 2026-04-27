CREATE OR REPLACE FUNCTION public.is_notif_sender(_notif_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.notifications WHERE id = _notif_id AND created_by = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_notif_recipient(_notif_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.notification_recipients WHERE notification_id = _notif_id AND user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Notif select by sender or recipient" ON public.notifications;
CREATE POLICY "Notif select by sender or recipient" ON public.notifications FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR auth.uid() = created_by
  OR public.is_notif_recipient(id, auth.uid())
);

DROP POLICY IF EXISTS "Recipients select own or admin" ON public.notification_recipients;
CREATE POLICY "Recipients select own or admin" ON public.notification_recipients FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR public.is_notif_sender(notification_id, auth.uid())
);

DROP POLICY IF EXISTS "Recipients delete by sender or admin" ON public.notification_recipients;
CREATE POLICY "Recipients delete by sender or admin" ON public.notification_recipients FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR public.is_notif_sender(notification_id, auth.uid())
);

DROP POLICY IF EXISTS "Recipients insert by notif sender" ON public.notification_recipients;
CREATE POLICY "Recipients insert by notif sender" ON public.notification_recipients FOR INSERT
WITH CHECK (public.is_notif_sender(notification_id, auth.uid()));