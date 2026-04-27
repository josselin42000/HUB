
-- 1. Create coordinateurs table
CREATE TABLE public.coordinateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coordinateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionnaire can manage coordinateurs" ON public.coordinateurs FOR ALL USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Authenticated can read coordinateurs" ON public.coordinateurs FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Add coordinateur_id to all tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.commerçant_groups ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.signalements ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.bon_plans ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.ca_collecte ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.informations ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.sondages ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.motivational_quotes ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.upcoming_events ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.banner_config ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS coordinateur_id uuid REFERENCES public.coordinateurs(id);

-- 3. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_coordinateur_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coordinateur_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_coordinateur_or_gestionnaire(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('gestionnaire', 'coordinateur')) $$;

CREATE OR REPLACE FUNCTION public.can_access_coordinateur(_user_id uuid, _coordinateur_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'gestionnaire')
    OR (
      _coordinateur_id IS NOT NULL 
      AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'coordinateur')
      AND (SELECT coordinateur_id FROM public.profiles WHERE user_id = _user_id LIMIT 1) = _coordinateur_id
    )
$$;

-- 4. Create default coordinateur and migrate data
DO $$
DECLARE default_coordinateur_id uuid;
BEGIN
  INSERT INTO public.coordinateurs (name) VALUES ('Coordinateur Principal') RETURNING id INTO default_coordinateur_id;
  UPDATE public.profiles SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.commerçant_groups SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.signalements SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.access_requests SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.bon_plans SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.ca_collecte SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.cvs SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.informations SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.sondages SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.sos_alerts SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.motivational_quotes SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.upcoming_events SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.banner_config SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  UPDATE public.app_settings SET coordinateur_id = default_coordinateur_id WHERE coordinateur_id IS NULL;
  -- Convert existing gestionnaire users to coordinateur role
  UPDATE public.user_roles SET role = 'coordinateur' WHERE role = 'gestionnaire';
END $$;

-- 5. Update all RLS policies

-- signalements
DROP POLICY IF EXISTS "Signalement select" ON public.signalements;
CREATE POLICY "Signalement select" ON public.signalements FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR (has_role(auth.uid(), 'commerçant'::app_role) AND auth.uid() = created_by)
);
DROP POLICY IF EXISTS "Signalement update" ON public.signalements;
CREATE POLICY "Signalement update" ON public.signalements FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "Signalement delete" ON public.signalements;
CREATE POLICY "Signalement delete" ON public.signalements FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- access_requests
DROP POLICY IF EXISTS "Access select" ON public.access_requests;
CREATE POLICY "Access select" ON public.access_requests FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR (has_role(auth.uid(), 'commerçant'::app_role) AND auth.uid() = created_by)
);
DROP POLICY IF EXISTS "Access update" ON public.access_requests;
CREATE POLICY "Access update" ON public.access_requests FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "Access delete" ON public.access_requests;
CREATE POLICY "Access delete" ON public.access_requests FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- bon_plans
DROP POLICY IF EXISTS "Bon plans select" ON public.bon_plans;
CREATE POLICY "Bon plans select" ON public.bon_plans FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR ((status = 'published') AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "Bon plans update" ON public.bon_plans;
CREATE POLICY "Bon plans update" ON public.bon_plans FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (auth.uid() = created_by AND status = 'proposed')
);
DROP POLICY IF EXISTS "Bon plans delete" ON public.bon_plans;
CREATE POLICY "Bon plans delete" ON public.bon_plans FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- ca_collecte
DROP POLICY IF EXISTS "CA select" ON public.ca_collecte;
CREATE POLICY "CA select" ON public.ca_collecte FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'commerçant'::app_role) AND auth.uid() = user_id)
);
DROP POLICY IF EXISTS "CA update" ON public.ca_collecte;
CREATE POLICY "CA update" ON public.ca_collecte FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "CA delete" ON public.ca_collecte;
CREATE POLICY "CA delete" ON public.ca_collecte FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- cvs
DROP POLICY IF EXISTS "CV select" ON public.cvs;
CREATE POLICY "CV select" ON public.cvs FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'commerçant'::app_role) AND auth.uid() = created_by)
);
DROP POLICY IF EXISTS "CV update" ON public.cvs;
CREATE POLICY "CV update" ON public.cvs FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id) OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "CV delete" ON public.cvs;
CREATE POLICY "CV delete" ON public.cvs FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- informations
DROP POLICY IF EXISTS "Info select" ON public.informations;
CREATE POLICY "Info select" ON public.informations FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR (status = 'published' AND has_role(auth.uid(), 'commerçant'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
);
DROP POLICY IF EXISTS "Info insert" ON public.informations;
CREATE POLICY "Info insert" ON public.informations FOR INSERT WITH CHECK (
  auth.uid() = created_by AND (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role) OR has_role(auth.uid(), 'securite'::app_role))
);
DROP POLICY IF EXISTS "Info update" ON public.informations;
CREATE POLICY "Info update" ON public.informations FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
);
DROP POLICY IF EXISTS "Info delete" ON public.informations;
CREATE POLICY "Info delete" ON public.informations FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- sondages
DROP POLICY IF EXISTS "Sondages select" ON public.sondages;
CREATE POLICY "Sondages select" ON public.sondages FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (status = 'published' AND has_role(auth.uid(), 'commerçant'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
);
DROP POLICY IF EXISTS "Sondages insert" ON public.sondages;
CREATE POLICY "Sondages insert" ON public.sondages FOR INSERT WITH CHECK (
  auth.uid() = created_by AND (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role))
);
DROP POLICY IF EXISTS "Sondages update" ON public.sondages;
CREATE POLICY "Sondages update" ON public.sondages FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Sondages delete" ON public.sondages;
CREATE POLICY "Sondages delete" ON public.sondages FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- sos_alerts
DROP POLICY IF EXISTS "SOS select" ON public.sos_alerts;
CREATE POLICY "SOS select" ON public.sos_alerts FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR (has_role(auth.uid(), 'commerçant'::app_role) AND auth.uid() = created_by)
);
DROP POLICY IF EXISTS "SOS update" ON public.sos_alerts;
CREATE POLICY "SOS update" ON public.sos_alerts FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
  OR (has_role(auth.uid(), 'securite'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
  OR auth.uid() = created_by
);
DROP POLICY IF EXISTS "SOS delete" ON public.sos_alerts;
CREATE POLICY "SOS delete" ON public.sos_alerts FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- motivational_quotes
DROP POLICY IF EXISTS "Anyone can read quotes" ON public.motivational_quotes;
CREATE POLICY "Read quotes" ON public.motivational_quotes FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR coordinateur_id = get_user_coordinateur_id(auth.uid())
);
DROP POLICY IF EXISTS "Gestionnaire can manage quotes" ON public.motivational_quotes;
CREATE POLICY "Manage quotes" ON public.motivational_quotes FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can update quotes" ON public.motivational_quotes;
CREATE POLICY "Update quotes" ON public.motivational_quotes FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can delete quotes" ON public.motivational_quotes;
CREATE POLICY "Delete quotes" ON public.motivational_quotes FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- upcoming_events
DROP POLICY IF EXISTS "Anyone can read events" ON public.upcoming_events;
CREATE POLICY "Read events" ON public.upcoming_events FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR coordinateur_id = get_user_coordinateur_id(auth.uid())
);
DROP POLICY IF EXISTS "Gestionnaire can manage events" ON public.upcoming_events;
CREATE POLICY "Manage events" ON public.upcoming_events FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can update events" ON public.upcoming_events;
CREATE POLICY "Update events" ON public.upcoming_events FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can delete events" ON public.upcoming_events;
CREATE POLICY "Delete events" ON public.upcoming_events FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- banner_config
DROP POLICY IF EXISTS "Anyone can read banner" ON public.banner_config;
CREATE POLICY "Read banner" ON public.banner_config FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR coordinateur_id = get_user_coordinateur_id(auth.uid())
);
DROP POLICY IF EXISTS "Gestionnaire can manage banner" ON public.banner_config;
CREATE POLICY "Manage banner" ON public.banner_config FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can update banner" ON public.banner_config;
CREATE POLICY "Update banner" ON public.banner_config FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can delete banner" ON public.banner_config;
CREATE POLICY "Delete banner" ON public.banner_config FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- app_settings
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Read settings" ON public.app_settings FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR coordinateur_id = get_user_coordinateur_id(auth.uid())
);
DROP POLICY IF EXISTS "Gestionnaire can insert settings" ON public.app_settings;
CREATE POLICY "Insert settings" ON public.app_settings FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can update settings" ON public.app_settings;
CREATE POLICY "Update settings" ON public.app_settings FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Gestionnaire can delete settings" ON public.app_settings;
CREATE POLICY "Delete settings" ON public.app_settings FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- commerçant_groups
DROP POLICY IF EXISTS "Groups select" ON public.commerçant_groups;
CREATE POLICY "Groups select" ON public.commerçant_groups FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR coordinateur_id = get_user_coordinateur_id(auth.uid())
);
DROP POLICY IF EXISTS "Groups insert" ON public.commerçant_groups;
CREATE POLICY "Groups insert" ON public.commerçant_groups FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Groups update" ON public.commerçant_groups;
CREATE POLICY "Groups update" ON public.commerçant_groups FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);
DROP POLICY IF EXISTS "Groups delete" ON public.commerçant_groups;
CREATE POLICY "Groups delete" ON public.commerçant_groups FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR can_access_coordinateur(auth.uid(), coordinateur_id)
);

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Read profiles" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'gestionnaire'::app_role)
  OR (has_role(auth.uid(), 'coordinateur'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Update profiles" ON public.profiles FOR UPDATE USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'gestionnaire'::app_role)
  OR (has_role(auth.uid(), 'coordinateur'::app_role) AND coordinateur_id = get_user_coordinateur_id(auth.uid()))
);

-- user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Read roles" ON public.user_roles FOR SELECT USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role)
);
DROP POLICY IF EXISTS "Gestionnaire can manage roles" ON public.user_roles;
CREATE POLICY "Manage roles" ON public.user_roles FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role)
);
DROP POLICY IF EXISTS "Gestionnaire can update roles" ON public.user_roles;
CREATE POLICY "Update roles" ON public.user_roles FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role)
);
DROP POLICY IF EXISTS "Gestionnaire can delete roles" ON public.user_roles;
CREATE POLICY "Delete roles" ON public.user_roles FOR DELETE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'coordinateur'::app_role)
);

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _coordinateur_id uuid;
BEGIN
  SELECT bg.coordinateur_id INTO _coordinateur_id FROM public.commerçant_groups bg
  WHERE bg.name = NEW.raw_user_meta_data->>'commerçant_name' LIMIT 1;
  INSERT INTO public.profiles (user_id, email, name, commerçant_name, coordinateur_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'commerçant_name', _coordinateur_id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'commerçant'));
  RETURN NEW;
END;
$$;
