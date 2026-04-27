
CREATE POLICY "Proprietaire full access" ON public.admin_module_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'proprietaire'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'proprietaire'::app_role));

CREATE POLICY "Proprietaire manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'proprietaire'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'proprietaire'::app_role));

CREATE POLICY "Proprietaire manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'proprietaire'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'proprietaire'::app_role));
