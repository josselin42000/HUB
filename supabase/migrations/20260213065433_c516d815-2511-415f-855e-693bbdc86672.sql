
ALTER TABLE public.access_requests
ADD COLUMN checked_in_at timestamp with time zone DEFAULT NULL,
ADD COLUMN checked_in_by uuid DEFAULT NULL;
