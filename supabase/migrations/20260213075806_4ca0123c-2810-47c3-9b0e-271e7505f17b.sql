
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Gestionnaire can insert settings" ON public.app_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can update settings" ON public.app_settings FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can delete settings" ON public.app_settings FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
