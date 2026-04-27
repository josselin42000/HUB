-- 1. Slug centres (sans unaccent : remplacement manuel des accents courants)
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS slug text UNIQUE;
UPDATE public.centres SET slug = lower(
  regexp_replace(
    translate(name, 'àâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ ''', 'aaaeeeeiioouuuycaaaeeeeiioouuuyc--'),
    '[^a-zA-Z0-9-]+', '-', 'g'
  )
) WHERE slug IS NULL;

-- 2. CVs
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS submission_source text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS complement_request text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS job_offer_id uuid;

ALTER TABLE public.cvs ALTER COLUMN created_by DROP NOT NULL;

DROP POLICY IF EXISTS "CV insert" ON public.cvs;
CREATE POLICY "CV insert authenticated" ON public.cvs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "CV insert public" ON public.cvs FOR INSERT TO anon WITH CHECK (
  submission_source = 'public' AND validation_status = 'pending'
);

-- 3. job_offers
CREATE TABLE IF NOT EXISTS public.job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  boutique_group_id uuid REFERENCES public.boutique_groups(id) ON DELETE SET NULL,
  boutique_name text,
  created_by uuid NOT NULL,
  created_by_name text,
  title text NOT NULL,
  description text NOT NULL,
  contract_type text,
  work_time text,
  status text NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  rejection_reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job offers public read" ON public.job_offers FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "Job offers admin all" ON public.job_offers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fonciere'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role) OR can_access_centre(auth.uid(), centre_id))
  WITH CHECK (has_role(auth.uid(), 'fonciere'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role) OR can_access_centre(auth.uid(), centre_id));
CREATE POLICY "Job offers manager insert" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by 
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_manager = true)
  );
CREATE POLICY "Job offers manager update own" ON public.job_offers FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND status = 'pending');
CREATE POLICY "Job offers manager select own" ON public.job_offers FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_job_offers_updated ON public.job_offers;
CREATE TRIGGER trg_job_offers_updated BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cvs DROP CONSTRAINT IF EXISTS cvs_job_offer_fk;
ALTER TABLE public.cvs ADD CONSTRAINT cvs_job_offer_fk FOREIGN KEY (job_offer_id) REFERENCES public.job_offers(id) ON DELETE SET NULL;

-- 4. cv_interests
ALTER TABLE public.cv_interests
  ADD COLUMN IF NOT EXISTS retained boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retained_at timestamptz;

-- 5. Bucket public-cvs
INSERT INTO storage.buckets (id, name, public) VALUES ('public-cvs', 'public-cvs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public CV upload" ON storage.objects;
DROP POLICY IF EXISTS "Public CV read" ON storage.objects;
DROP POLICY IF EXISTS "Public CV admin delete" ON storage.objects;
CREATE POLICY "Public CV upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'public-cvs');
CREATE POLICY "Public CV read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-cvs');
CREATE POLICY "Public CV admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-cvs' AND (has_role(auth.uid(), 'fonciere'::app_role) OR has_role(auth.uid(), 'centre'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role)));

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_cvs_validation_status ON public.cvs(validation_status);
CREATE INDEX IF NOT EXISTS idx_cvs_expires_at ON public.cvs(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON public.job_offers(status);
CREATE INDEX IF NOT EXISTS idx_centres_slug ON public.centres(slug);

-- 7. RPC publique pour récupérer un centre par slug (anon)
CREATE OR REPLACE FUNCTION public.get_centre_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, slug FROM public.centres WHERE slug = _slug LIMIT 1;
$$;

-- 8. RPC pour offres publiées par centre (anon)
CREATE OR REPLACE FUNCTION public.get_published_offers_by_centre(_centre_id uuid)
RETURNS TABLE(id uuid, title text, description text, contract_type text, work_time text, boutique_name text, published_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, description, contract_type, work_time, boutique_name, published_at
  FROM public.job_offers WHERE centre_id = _centre_id AND status = 'published'
  ORDER BY published_at DESC;
$$;