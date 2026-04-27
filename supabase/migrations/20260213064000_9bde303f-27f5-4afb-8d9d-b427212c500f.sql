
-- Add new columns for the laisser-passer multi-step form
ALTER TABLE public.access_requests
  ADD COLUMN IF NOT EXISTS request_code text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS responsible_phone text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS date_start date,
  ADD COLUMN IF NOT EXISTS date_end date,
  ADD COLUMN IF NOT EXISTS time_start text,
  ADD COLUMN IF NOT EXISTS time_end text,
  ADD COLUMN IF NOT EXISTS location_detail text,
  ADD COLUMN IF NOT EXISTS intervention_detail text,
  ADD COLUMN IF NOT EXISTS intervenant_1 text,
  ADD COLUMN IF NOT EXISTS intervenant_2 text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS risk_height boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_height_detail text,
  ADD COLUMN IF NOT EXISTS risk_fire boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_fire_detail text,
  ADD COLUMN IF NOT EXISTS risk_electric boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_electric_detail text,
  ADD COLUMN IF NOT EXISTS confirm_hours boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_waste boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_parking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_final boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signature_date date;

-- Create unique index on request_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_code ON public.access_requests(request_code) WHERE request_code IS NOT NULL;
