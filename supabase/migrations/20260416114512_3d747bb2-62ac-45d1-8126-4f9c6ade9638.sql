
CREATE TABLE IF NOT EXISTS public.admin_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, module)
);

ALTER TABLE public.admin_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own access" ON public.admin_module_access
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Fonciere read all access" ON public.admin_module_access
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'fonciere'::app_role));
