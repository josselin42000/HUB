ALTER TABLE public.ca_reminder_settings
  ADD COLUMN IF NOT EXISTS channels_initial text[] NOT NULL DEFAULT ARRAY['push']::text[],
  ADD COLUMN IF NOT EXISTS channels_relance_1 text[] NOT NULL DEFAULT ARRAY['push']::text[],
  ADD COLUMN IF NOT EXISTS channels_relance_2 text[] NOT NULL DEFAULT ARRAY['push']::text[],
  ADD COLUMN IF NOT EXISTS channels_email_final text[] NOT NULL DEFAULT ARRAY['email']::text[],
  ADD COLUMN IF NOT EXISTS email_subject text NOT NULL DEFAULT 'Saisie CA en attente',
  ADD COLUMN IF NOT EXISTS email_template text NOT NULL DEFAULT 'Bonjour {{name}},

Votre saisie du chiffre d''affaires pour {{mois}} est toujours en attente.
Merci de la compléter dans l''application dès que possible.

Cordialement,
L''équipe du centre';