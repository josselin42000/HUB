CREATE TABLE public.boutique_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_group_id uuid NOT NULL,
  centre_id uuid,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_boutique_notes_boutique ON public.boutique_notes(boutique_group_id);

ALTER TABLE public.boutique_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes select"
ON public.boutique_notes FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

CREATE POLICY "Notes insert"
ON public.boutique_notes FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND (
    has_role(auth.uid(), 'fonciere'::app_role)
    OR has_role(auth.uid(), 'proprietaire'::app_role)
    OR can_access_centre(auth.uid(), centre_id)
  )
);

CREATE POLICY "Notes delete"
ON public.boutique_notes FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
  OR auth.uid() = author_id
);