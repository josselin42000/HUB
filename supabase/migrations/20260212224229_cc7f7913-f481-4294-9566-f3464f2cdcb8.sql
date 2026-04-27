
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('commerçant', 'gestionnaire', 'securite');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  commerçant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. SOS Alerts
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  alert_type TEXT NOT NULL DEFAULT 'urgence',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- 6. Signalements
CREATE TABLE public.signalements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;

-- 7. Access Requests
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  person_name TEXT NOT NULL,
  person_company TEXT,
  reason TEXT NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- 8. Sondage Responses
CREATE TABLE public.sondage_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  satisfaction_emoji INTEGER,
  note INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sondage_responses ENABLE ROW LEVEL SECURITY;

-- 9. CA Collecte
CREATE TABLE public.ca_collecte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  ca_ht NUMERIC NOT NULL,
  objectif NUMERIC,
  taux_transformation NUMERIC,
  panier_moyen NUMERIC,
  satisfaction INTEGER,
  mois TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ca_collecte ENABLE ROW LEVEL SECURITY;

-- 10. CVs
CREATE TABLE public.cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commerçant_name TEXT,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  poste TEXT NOT NULL,
  secteur TEXT,
  experience TEXT,
  competences TEXT[],
  status TEXT NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies

-- profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestionnaire'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestionnaire'));

-- user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestionnaire'));
CREATE POLICY "Gestionnaire can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'gestionnaire'));
CREATE POLICY "Gestionnaire can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'gestionnaire'));
CREATE POLICY "Gestionnaire can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- sos_alerts
CREATE POLICY "SOS select" ON public.sos_alerts FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = created_by)
);
CREATE POLICY "SOS insert" ON public.sos_alerts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "SOS update" ON public.sos_alerts FOR UPDATE USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR auth.uid() = created_by
);
CREATE POLICY "SOS delete" ON public.sos_alerts FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- signalements
CREATE POLICY "Signalement select" ON public.signalements FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = created_by)
);
CREATE POLICY "Signalement insert" ON public.signalements FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Signalement update" ON public.signalements FOR UPDATE USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR auth.uid() = created_by
);
CREATE POLICY "Signalement delete" ON public.signalements FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- access_requests
CREATE POLICY "Access select" ON public.access_requests FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = created_by)
);
CREATE POLICY "Access insert" ON public.access_requests FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Access update" ON public.access_requests FOR UPDATE USING (
  public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'securite') OR auth.uid() = created_by
);
CREATE POLICY "Access delete" ON public.access_requests FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- sondage_responses
CREATE POLICY "Sondage select" ON public.sondage_responses FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = user_id)
);
CREATE POLICY "Sondage insert" ON public.sondage_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sondage delete" ON public.sondage_responses FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- ca_collecte
CREATE POLICY "CA select" ON public.ca_collecte FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = user_id)
);
CREATE POLICY "CA insert" ON public.ca_collecte FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "CA update" ON public.ca_collecte FOR UPDATE USING (public.has_role(auth.uid(), 'gestionnaire'));
CREATE POLICY "CA delete" ON public.ca_collecte FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- cvs
CREATE POLICY "CV select" ON public.cvs FOR SELECT USING (
  public.has_role(auth.uid(), 'gestionnaire') OR (public.has_role(auth.uid(), 'commerçant') AND auth.uid() = created_by)
);
CREATE POLICY "CV insert" ON public.cvs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "CV update" ON public.cvs FOR UPDATE USING (public.has_role(auth.uid(), 'gestionnaire') OR auth.uid() = created_by);
CREATE POLICY "CV delete" ON public.cvs FOR DELETE USING (public.has_role(auth.uid(), 'gestionnaire'));

-- 12. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, commerçant_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'commerçant_name'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'commerçant')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signalements;

-- 14. Allow initial role insert during signup (the trigger does it)
CREATE POLICY "Trigger can insert roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestionnaire'));
