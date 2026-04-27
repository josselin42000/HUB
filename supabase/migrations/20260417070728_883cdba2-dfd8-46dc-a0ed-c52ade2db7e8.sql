DROP FUNCTION IF EXISTS public.get_contacts_by_token(text);
DROP FUNCTION IF EXISTS public.upsert_contacts_by_token(text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_contacts_by_token(_token text)
 RETURNS TABLE(
   boutique_group_id uuid, boutique_name text, centre_id uuid,
   responsable_nom text, responsable_prenom text, responsable_tel_fixe text, responsable_tel_mobile text, responsable_email text,
   adjoint_nom text, adjoint_prenom text, adjoint_tel_fixe text, adjoint_tel_mobile text, adjoint_email text,
   site_internet text, numero_local text, telephone_boutique text,
   notes text
 )
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _bg uuid; _cid uuid;
BEGIN
  SELECT t.boutique_group_id, t.centre_id INTO _bg, _cid
  FROM public.boutique_update_tokens t
  WHERE t.token = _token AND t.is_active = true;
  IF _bg IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT bg.id, bg.name, bg.centre_id,
         c.responsable_nom, c.responsable_prenom, c.responsable_tel_fixe, c.responsable_tel_mobile, c.responsable_email,
         c.adjoint_nom, c.adjoint_prenom, c.adjoint_tel_fixe, c.adjoint_tel_mobile, c.adjoint_email,
         c.site_internet, c.numero_local, c.telephone_boutique,
         c.notes
  FROM public.boutique_groups bg
  LEFT JOIN public.boutique_contacts c ON c.boutique_group_id = bg.id
  WHERE bg.id = _bg;
END $function$;

CREATE OR REPLACE FUNCTION public.upsert_contacts_by_token(
  _token text,
  _responsable_nom text, _responsable_prenom text, _responsable_tel_fixe text, _responsable_tel_mobile text, _responsable_email text,
  _adjoint_nom text, _adjoint_prenom text, _adjoint_tel_fixe text, _adjoint_tel_mobile text, _adjoint_email text,
  _site_internet text, _numero_local text, _telephone_boutique text,
  _notes text
) RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _bg uuid; _cid uuid;
BEGIN
  SELECT t.boutique_group_id, t.centre_id INTO _bg, _cid
  FROM public.boutique_update_tokens t
  WHERE t.token = _token AND t.is_active = true;
  IF _bg IS NULL THEN RETURN false; END IF;

  INSERT INTO public.boutique_contacts (
    boutique_group_id, centre_id,
    responsable_nom, responsable_prenom, responsable_tel_fixe, responsable_tel_mobile, responsable_email,
    adjoint_nom, adjoint_prenom, adjoint_tel_fixe, adjoint_tel_mobile, adjoint_email,
    site_internet, numero_local, telephone_boutique,
    notes, updated_via_token
  ) VALUES (
    _bg, _cid,
    _responsable_nom, _responsable_prenom, _responsable_tel_fixe, _responsable_tel_mobile, _responsable_email,
    _adjoint_nom, _adjoint_prenom, _adjoint_tel_fixe, _adjoint_tel_mobile, _adjoint_email,
    _site_internet, _numero_local, _telephone_boutique,
    _notes, true
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
    site_internet = EXCLUDED.site_internet,
    numero_local = EXCLUDED.numero_local,
    telephone_boutique = EXCLUDED.telephone_boutique,
    notes = EXCLUDED.notes,
    updated_at = now(),
    updated_via_token = true;

  UPDATE public.boutique_update_tokens SET last_used_at = now() WHERE token = _token;
  RETURN true;
END $function$;