
-- Allow coordinateur and gestionnaire admins to delete profiles
CREATE POLICY "Delete profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'gestionnaire'::app_role)
  OR (
    has_role(auth.uid(), 'coordinateur'::app_role)
    AND coordinateur_id = get_user_coordinateur_id(auth.uid())
  )
);

-- Allow coordinateur and gestionnaire admins to delete user_roles
-- (already exists but let's ensure it covers the case)
