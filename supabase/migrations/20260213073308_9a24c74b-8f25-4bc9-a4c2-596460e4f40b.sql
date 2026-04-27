
-- Add columns to signalements for photo, plan position, and workflow tracking
ALTER TABLE public.signalements
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS plan_x numeric,
ADD COLUMN IF NOT EXISTS plan_y numeric,
ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS acknowledged_by uuid,
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by uuid;

-- Create signalement_messages table for workflow communication
CREATE TABLE public.signalement_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signalement_id uuid NOT NULL REFERENCES public.signalements(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.signalement_messages ENABLE ROW LEVEL SECURITY;

-- Anyone involved can read messages
CREATE POLICY "Messages select" ON public.signalement_messages
FOR SELECT USING (
  has_role(auth.uid(), 'gestionnaire'::app_role)
  OR has_role(auth.uid(), 'securite'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.signalements s
    WHERE s.id = signalement_id AND s.created_by = auth.uid()
  )
);

-- Gestionnaire/Securite can insert messages, and the creator too
CREATE POLICY "Messages insert" ON public.signalement_messages
FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND (
    has_role(auth.uid(), 'gestionnaire'::app_role)
    OR has_role(auth.uid(), 'securite'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.signalements s
      WHERE s.id = signalement_id AND s.created_by = auth.uid()
    )
  )
);

-- Gestionnaire can delete messages
CREATE POLICY "Messages delete" ON public.signalement_messages
FOR DELETE USING (has_role(auth.uid(), 'gestionnaire'::app_role));
