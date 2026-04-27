
-- Table des contacts d'annuaire par boutique
CREATE TABLE public.boutique_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_group_id uuid NOT NULL REFERENCES public.boutique_groups(id) ON DELETE CASCADE,
  centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  responsable_nom text,
  responsable_prenom text,
  responsable_tel_fixe text,
  responsable_tel_mobile text,
  responsable_email text,
  adjoint_nom text,
  adjoint_prenom text,
  adjoint_tel_fixe text,
  adjoint_tel_mobile text,
  adjoint_email text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_via_token boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boutique_group_id)
);

ALTER TABLE public.boutique_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts select"
ON public.boutique_contacts FOR SELECT
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND centre_id = get_user_centre_id(auth.uid()))
  OR (has_role(auth.uid(), 'boutique'::app_role) AND boutique_group_id = (SELECT boutique_group_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Contacts insert"
ON public.boutique_contacts FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
  OR (has_role(auth.uid(), 'boutique'::app_role) AND boutique_group_id = (SELECT boutique_group_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Contacts update"
ON public.boutique_contacts FOR UPDATE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
  OR (has_role(auth.uid(), 'boutique'::app_role) AND boutique_group_id = (SELECT boutique_group_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Contacts delete"
ON public.boutique_contacts FOR DELETE
USING (
  has_role(auth.uid(), 'fonciere'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR can_access_centre(auth.uid(), centre_id)
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_boutique_contacts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_touch_boutique_contacts
BEFORE UPDATE ON public.boutique_contacts
FOR EACH ROW EXECUTE FUNCTION public.touch_boutique_contacts();

-- Table des jetons publics de mise à jour
CREATE TABLE public.boutique_update_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_group_id uuid NOT NULL REFERENCES public.boutique_groups(id) ON DELETE CASCADE,
  centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  last_used_at timestamptz,
  UNIQUE (boutique_group_id)
);

ALTER TABLE public.boutique_update_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens admin all"
ON public.boutique_update_tokens FOR ALL
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

-- Fonctions publiques sécurisées (utilisées par la page publique sans auth)
CREATE OR REPLACE FUNCTION public.get_contacts_by_token(_token text)
RETURNS TABLE (
  boutique_group_id uuid,
  boutique_name text,
  centre_id uuid,
  responsable_nom text,
  responsable_prenom text,
  responsable_tel_fixe text,
  responsable_tel_mobile text,
  responsable_email text,
  adjoint_nom text,
  adjoint_prenom text,
  adjoint_tel_fixe text,
  adjoint_tel_mobile text,
  adjoint_email text,
  notes text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bg uuid; _cid uuid;
BEGIN
  SELECT t.boutique_group_id, t.centre_id INTO _bg, _cid
  FROM public.boutique_update_tokens t
  WHERE t.token = _token AND t.is_active = true;
  IF _bg IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT bg.id, bg.name, bg.centre_id,
         c.responsable_nom, c.responsable_prenom, c.responsable_tel_fixe, c.responsable_tel_mobile, c.responsable_email,
         c.adjoint_nom, c.adjoint_prenom, c.adjoint_tel_fixe, c.adjoint_tel_mobile, c.adjoint_email, c.notes
  FROM public.boutique_groups bg
  LEFT JOIN public.boutique_contacts c ON c.boutique_group_id = bg.id
  WHERE bg.id = _bg;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_contacts_by_token(
  _token text,
  _responsable_nom text, _responsable_prenom text, _responsable_tel_fixe text, _responsable_tel_mobile text, _responsable_email text,
  _adjoint_nom text, _adjoint_prenom text, _adjoint_tel_fixe text, _adjoint_tel_mobile text, _adjoint_email text,
  _notes text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bg uuid; _cid uuid;
BEGIN
  SELECT t.boutique_group_id, t.centre_id INTO _bg, _cid
  FROM public.boutique_update_tokens t
  WHERE t.token = _token AND t.is_active = true;
  IF _bg IS NULL THEN RETURN false; END IF;

  INSERT INTO public.boutique_contacts (
    boutique_group_id, centre_id,
    responsable_nom, responsable_prenom, responsable_tel_fixe, responsable_tel_mobile, responsable_email,
    adjoint_nom, adjoint_prenom, adjoint_tel_fixe, adjoint_tel_mobile, adjoint_email, notes,
    updated_via_token
  ) VALUES (
    _bg, _cid,
    _responsable_nom, _responsable_prenom, _responsable_tel_fixe, _responsable_tel_mobile, _responsable_email,
    _adjoint_nom, _adjoint_prenom, _adjoint_tel_fixe, _adjoint_tel_mobile, _adjoint_email, _notes,
    true
  )
  ON CONFLICT (boutique_group_id) DO UPDATE SET
    responsable_nom = EXCLUDED.responsable_nom,
    responsable_prenom = EXCLUDED.responsable_prenom,
    responsable_tel_fixe = EXCLUDED.responsable_tel_fixe,
    responsable_tel_mobile = EXCLUDED.responsable_tel_mobile,
    responsable_email = EXCLUDED.responsable_email,
    adjoint_nom = EXCLUDED.adjoint_nom,
    adjoint_prenom = EXCLUDED.adjoint_prenom,
    adjoint_tel_fixe = EXCLUDED.adjoint_tel_fixe,
    adjoint_tel_mobile = EXCLUDED.adjoint_tel_mobile,
    adjoint_email = EXCLUDED.adjoint_email,
    notes = EXCLUDED.notes,
    updated_at = now(),
    updated_via_token = true;

  UPDATE public.boutique_update_tokens SET last_used_at = now() WHERE token = _token;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.get_contacts_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_contacts_by_token(text, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
