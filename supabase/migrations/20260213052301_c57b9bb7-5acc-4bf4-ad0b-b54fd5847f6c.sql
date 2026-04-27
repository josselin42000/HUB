
-- =============================================
-- 1. SOS: add "prise en compte" step
-- =============================================
ALTER TABLE public.sos_alerts 
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid;

-- =============================================
-- 2. CA: star-based satisfaction per criteria
-- =============================================
ALTER TABLE public.ca_collecte
  ADD COLUMN IF NOT EXISTS satisfaction_activite integer CHECK (satisfaction_activite BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS satisfaction_frequentation integer CHECK (satisfaction_frequentation BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS satisfaction_reseau integer CHECK (satisfaction_reseau BETWEEN 0 AND 5);

-- =============================================
-- 3. Commerçant groups & manager status
-- =============================================
CREATE TABLE IF NOT EXISTS public.commerçant_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commerçant_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups select" ON public.commerçant_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Groups insert" ON public.commerçant_groups FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Groups update" ON public.commerçant_groups FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Groups delete" ON public.commerçant_groups FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commerçant_group_id uuid REFERENCES public.commerçant_groups(id);

-- =============================================
-- 4. CV interests (marques d'intérêt)
-- =============================================
CREATE TABLE IF NOT EXISTS public.cv_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  commerçant_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cv_id, user_id)
);
ALTER TABLE public.cv_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interest insert" ON public.cv_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Interest select" ON public.cv_interests FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'commerçant'::app_role)
);
CREATE POLICY "Interest delete" ON public.cv_interests FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. Bon Plans
-- =============================================
CREATE TABLE IF NOT EXISTS public.bon_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL,
  commerçant_name text,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz
);
ALTER TABLE public.bon_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bon plans select" ON public.bon_plans FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  (status = 'published' AND (has_role(auth.uid(), 'commerçant'::app_role) OR has_role(auth.uid(), 'securite'::app_role))) OR
  (auth.uid() = created_by)
);
CREATE POLICY "Bon plans insert" ON public.bon_plans FOR INSERT WITH CHECK (
  auth.uid() = created_by
);
CREATE POLICY "Bon plans update" ON public.bon_plans FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR (auth.uid() = created_by AND status = 'proposed')
);
CREATE POLICY "Bon plans delete" ON public.bon_plans FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- =============================================
-- 6. Informations
-- =============================================
CREATE TABLE IF NOT EXISTS public.informations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  info_type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.informations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Info select" ON public.informations FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'securite'::app_role) OR
  (status = 'published' AND has_role(auth.uid(), 'commerçant'::app_role))
);
CREATE POLICY "Info insert" ON public.informations FOR INSERT WITH CHECK (
  auth.uid() = created_by AND (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'securite'::app_role))
);
CREATE POLICY "Info update" ON public.informations FOR UPDATE USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'securite'::app_role)
);
CREATE POLICY "Info delete" ON public.informations FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- =============================================
-- 7. Sondages (création par foncière)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sondages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
ALTER TABLE public.sondages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sondages select" ON public.sondages FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR (status = 'published' AND has_role(auth.uid(), 'commerçant'::app_role))
);
CREATE POLICY "Sondages insert" ON public.sondages FOR INSERT WITH CHECK (
  auth.uid() = created_by AND has_role(auth.uid(), 'gestionnaire'::app_role)
);
CREATE POLICY "Sondages update" ON public.sondages FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Sondages delete" ON public.sondages FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE TABLE IF NOT EXISTS public.sondage_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sondage_id uuid NOT NULL REFERENCES public.sondages(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating',
  options jsonb,
  sort_order integer DEFAULT 0
);
ALTER TABLE public.sondage_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions select" ON public.sondage_questions FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'commerçant'::app_role)
);
CREATE POLICY "Questions manage" ON public.sondage_questions FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Questions update" ON public.sondage_questions FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Questions delete" ON public.sondage_questions FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- Link sondage_responses to specific sondages
ALTER TABLE public.sondage_responses
  ADD COLUMN IF NOT EXISTS sondage_id uuid REFERENCES public.sondages(id);

-- =============================================
-- 8. Realtime for new tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.cv_interests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bon_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.informations;
