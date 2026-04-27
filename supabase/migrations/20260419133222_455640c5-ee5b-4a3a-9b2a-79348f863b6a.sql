
CREATE TABLE public.ca_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  day_of_month integer NOT NULL DEFAULT 5 CHECK (day_of_month BETWEEN 1 AND 28),
  skip_weekend boolean NOT NULL DEFAULT true,
  delay_relance_1 integer NOT NULL DEFAULT 3 CHECK (delay_relance_1 >= 1),
  delay_relance_2 integer NOT NULL DEFAULT 3 CHECK (delay_relance_2 >= 1),
  delay_email_final integer NOT NULL DEFAULT 4 CHECK (delay_email_final >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (centre_id)
);

ALTER TABLE public.ca_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reminder settings select"
ON public.ca_reminder_settings FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE POLICY "Reminder settings insert"
ON public.ca_reminder_settings FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE POLICY "Reminder settings update"
ON public.ca_reminder_settings FOR UPDATE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE POLICY "Reminder settings delete"
ON public.ca_reminder_settings FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE TRIGGER trg_touch_ca_reminder_settings
BEFORE UPDATE ON public.ca_reminder_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_boutique_contacts();

-- Log des envois
CREATE TABLE public.ca_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mois text NOT NULL,
  step text NOT NULL CHECK (step IN ('initial','relance_1','relance_2','email_final')),
  channel text NOT NULL CHECK (channel IN ('push','email')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT true,
  error_message text,
  UNIQUE (user_id, mois, step)
);

CREATE INDEX idx_ca_reminder_log_centre_mois ON public.ca_reminder_log(centre_id, mois);

ALTER TABLE public.ca_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reminder log select"
ON public.ca_reminder_log FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE POLICY "Reminder log insert service"
ON public.ca_reminder_log FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);
