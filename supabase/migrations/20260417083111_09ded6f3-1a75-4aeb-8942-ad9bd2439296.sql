-- Add secteur to boutique_groups
ALTER TABLE public.boutique_groups ADD COLUMN IF NOT EXISTS secteur text;

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_by_name text,
  title text NOT NULL,
  body text NOT NULL,
  link_url text,
  notif_type text NOT NULL DEFAULT 'info', -- info, alerte, evenement, message
  target_scope text NOT NULL, -- boutique, secteur, centre, global
  target_boutique_group_id uuid REFERENCES public.boutique_groups(id) ON DELETE CASCADE,
  target_secteur text,
  target_centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_centre ON public.notifications(centre_id);
CREATE INDEX idx_notif_created_by ON public.notifications(created_by);

-- Recipients
CREATE TABLE public.notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notif_rec_user ON public.notification_recipients(user_id, read_at);
CREATE INDEX idx_notif_rec_notif ON public.notification_recipients(notification_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Notif insert by admins/securite"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    has_role(auth.uid(), 'fonciere'::app_role)
    OR has_role(auth.uid(), 'proprietaire'::app_role)
    OR (has_role(auth.uid(), 'centre'::app_role) AND centre_id = get_user_centre_id(auth.uid()))
    OR (has_role(auth.uid(), 'securite'::app_role) AND centre_id = get_user_centre_id(auth.uid()))
  )
);

CREATE POLICY "Notif select by sender or recipient"
ON public.notifications FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.notification_recipients r WHERE r.notification_id = notifications.id AND r.user_id = auth.uid())
);

CREATE POLICY "Notif delete by sender or admin"
ON public.notifications FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR auth.uid() = created_by
);

-- Recipients policies
CREATE POLICY "Recipients insert by notif sender"
ON public.notification_recipients FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_id AND n.created_by = auth.uid())
);

CREATE POLICY "Recipients select own or admin"
ON public.notification_recipients FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_id AND n.created_by = auth.uid())
);

CREATE POLICY "Recipients update own read status"
ON public.notification_recipients FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Recipients delete by sender or admin"
ON public.notification_recipients FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_id AND n.created_by = auth.uid())
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_recipients;