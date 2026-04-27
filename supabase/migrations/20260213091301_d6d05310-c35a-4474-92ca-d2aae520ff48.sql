
-- Allow anonymous users to read coordinateurs (needed for signup form)
CREATE POLICY "Anyone can read coordinateurs"
ON public.coordinateurs FOR SELECT
USING (true);
