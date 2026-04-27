import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SupportPermissions {
  isSupport: boolean;
  can_view_stats: boolean;
  can_view_sondages: boolean;
  can_view_informations: boolean;
  can_view_collecte: boolean;
  loading: boolean;
}

const DEFAULT: SupportPermissions = {
  isSupport: false,
  can_view_stats: false,
  can_view_sondages: false,
  can_view_informations: false,
  can_view_collecte: false,
  loading: true,
};

/**
 * Returns the support-mode permissions for the current user.
 * If a row exists in `support_permissions`, the user is a "Fonction Support":
 * they only see modules whose toggle is enabled.
 */
export function useSupportPermissions(): SupportPermissions {
  const { user } = useAuth();
  const [perms, setPerms] = useState<SupportPermissions>(DEFAULT);

  useEffect(() => {
    if (!user) { setPerms({ ...DEFAULT, loading: false }); return; }
    supabase
      .from("support_permissions" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setPerms({
            isSupport: true,
            can_view_stats: !!data.can_view_stats,
            can_view_sondages: !!data.can_view_sondages,
            can_view_informations: !!data.can_view_informations,
            can_view_collecte: !!data.can_view_collecte,
            loading: false,
          });
        } else {
          setPerms({ ...DEFAULT, loading: false });
        }
      });
  }, [user?.id]);

  return perms;
}
