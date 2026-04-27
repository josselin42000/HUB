
-- Add commerçant identity fields to commerçant_groups table
ALTER TABLE public.commerçant_groups
  ADD COLUMN IF NOT EXISTS loyer numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS surface numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_depot_dat date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_validation_dat date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_livraison_coque date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_ouverture date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fermeture date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_position_x numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_position_y numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_image_url text DEFAULT NULL;
