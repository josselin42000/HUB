
-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

-- Storage policies
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

-- Add file columns to cvs
ALTER TABLE public.cvs ADD COLUMN cv_file_url TEXT;
ALTER TABLE public.cvs ADD COLUMN motivation_file_url TEXT;

-- Add file columns to bon_plans
ALTER TABLE public.bon_plans ADD COLUMN file_url TEXT;
ALTER TABLE public.bon_plans ADD COLUMN target_commerçant TEXT;

-- Add file columns to informations
ALTER TABLE public.informations ADD COLUMN file_url TEXT;

-- Motivational quotes table
CREATE TABLE public.motivational_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.motivational_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quotes" ON public.motivational_quotes FOR SELECT USING (true);
CREATE POLICY "Gestionnaire can manage quotes" ON public.motivational_quotes FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can update quotes" ON public.motivational_quotes FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can delete quotes" ON public.motivational_quotes FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- Insert default quotes
INSERT INTO public.motivational_quotes (text) VALUES
  ('Ensemble, faisons de ce coordinateur un lieu d''exception ! 🌟'),
  ('Chaque jour est une nouvelle opportunité de briller ✨'),
  ('Votre sourire est notre meilleure vitrine 😊'),
  ('La réussite est un effort collectif 💪'),
  ('Bonne journée à toute l''équipe ! ☀️');

-- Events table
CREATE TABLE public.upcoming_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.upcoming_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.upcoming_events FOR SELECT USING (true);
CREATE POLICY "Gestionnaire can manage events" ON public.upcoming_events FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can update events" ON public.upcoming_events FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can delete events" ON public.upcoming_events FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- Banner config table
CREATE TABLE public.banner_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.banner_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read banner" ON public.banner_config FOR SELECT USING (true);
CREATE POLICY "Gestionnaire can manage banner" ON public.banner_config FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can update banner" ON public.banner_config FOR UPDATE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
CREATE POLICY "Gestionnaire can delete banner" ON public.banner_config FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- Insert default banner
INSERT INTO public.banner_config (content, is_active) VALUES
  ('Améliorez la visibilité de votre commerçant : donnez 5 étoiles sur nos réseaux ! ⭐', true);
