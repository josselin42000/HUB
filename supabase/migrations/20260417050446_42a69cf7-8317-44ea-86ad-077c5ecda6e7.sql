-- Table des permissions "support" par utilisateur (toggles fins activés par l'admin)
CREATE TABLE IF NOT EXISTS public.support_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_view_stats boolean NOT NULL DEFAULT false,
  can_view_sondages boolean NOT NULL DEFAULT false,
  can_view_informations boolean NOT NULL DEFAULT false,
  can_view_collecte boolean NOT NULL DEFAULT false,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support perms read own"
  ON public.support_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'fonciere') OR has_role(auth.uid(),'centre') OR has_role(auth.uid(),'proprietaire'));

CREATE POLICY "Support perms manage by admins"
  ON public.support_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'fonciere') OR has_role(auth.uid(),'centre') OR has_role(auth.uid(),'proprietaire'))
  WITH CHECK (has_role(auth.uid(),'fonciere') OR has_role(auth.uid(),'centre') OR has_role(auth.uid(),'proprietaire'));

-- Note: titre/logo d'accueil par centre stockés via app_settings existant (clés: home_title, home_logo_url) — pas de schéma à modifier.
