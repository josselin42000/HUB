-- Table des événements (boîte noire) par boutique
CREATE TABLE public.boutique_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_group_id uuid NOT NULL REFERENCES public.boutique_groups(id) ON DELETE CASCADE,
  centre_id uuid REFERENCES public.centres(id),
  event_type text NOT NULL,
  event_label text NOT NULL,
  comment text,
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boutique_events_boutique ON public.boutique_events(boutique_group_id, created_at DESC);
CREATE INDEX idx_boutique_events_centre ON public.boutique_events(centre_id);

ALTER TABLE public.boutique_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events select"
ON public.boutique_events FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND centre_id = get_user_centre_id(auth.uid()))
);

CREATE POLICY "Events insert"
ON public.boutique_events FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    has_role(auth.uid(), 'fonciere'::app_role)
    OR has_role(auth.uid(), 'proprietaire'::app_role)
    OR can_access_centre(auth.uid(), centre_id)
    OR (has_role(auth.uid(), 'securite'::app_role) AND centre_id = get_user_centre_id(auth.uid()))
  )
);

CREATE POLICY "Events delete"
ON public.boutique_events FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

-- Table des types de boutons configurables
CREATE TABLE public.boutique_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id),
  type_key text NOT NULL,
  label text NOT NULL,
  icon text,
  color text,
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event types select"
ON public.boutique_event_types FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR centre_id IS NULL
  OR centre_id = get_user_centre_id(auth.uid())
);

CREATE POLICY "Event types manage"
ON public.boutique_event_types FOR ALL
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
)
WITH CHECK (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

-- Types par défaut (globaux, centre_id NULL)
INSERT INTO public.boutique_event_types (type_key, label, icon, color, sort_order) VALUES
  ('fermee', 'Boutique fermée', 'DoorClosed', 'orange', 1),
  ('inventaire', 'Inventaire', 'ClipboardList', 'info', 2),
  ('communication', 'Communication', 'MessageSquare', 'violet', 3);