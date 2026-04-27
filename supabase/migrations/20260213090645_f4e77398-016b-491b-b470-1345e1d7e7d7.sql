
-- Update handle_new_user to use coordinateur_id from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _coordinateur_id uuid;
BEGIN
  -- Use coordinateur_id from metadata if provided, otherwise try to find from commerçant_groups
  _coordinateur_id := (NEW.raw_user_meta_data->>'coordinateur_id')::uuid;
  IF _coordinateur_id IS NULL THEN
    SELECT bg.coordinateur_id INTO _coordinateur_id FROM public.commerçant_groups bg
    WHERE bg.name = NEW.raw_user_meta_data->>'commerçant_name' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, name, commerçant_name, coordinateur_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'commerçant_name', _coordinateur_id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'commerçant'));
  RETURN NEW;
END;
$$;
