import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns true when the current user must enter their CA for the current month
 * AND the active reminder window has started (today >= day_of_month).
 * Only relevant for boutique managers.
 */
export function useCAReminderStatus() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (!user || user.role !== "commerçant" || !user.isManager) {
      setPending(false);
      return;
    }
    (async () => {
      const mois = getCurrentMonth();
      const today = new Date().getDate();

      const [{ data: setting }, { data: ca }] = await Promise.all([
        supabase
          .from("ca_reminder_settings")
          .select("day_of_month, is_active")
          .eq("centre_id", user.centreId ?? null as any)
          .maybeSingle(),
        supabase
          .from("ca_collecte")
          .select("id")
          .eq("user_id", user.id)
          .eq("mois", mois)
          .maybeSingle(),
      ]);

      if (cancel) return;
      const dayOfMonth = (setting as any)?.day_of_month ?? 5;
      const active = (setting as any)?.is_active ?? true;
      const windowOpen = active && today >= dayOfMonth;
      const notSubmitted = !ca;
      setPending(windowOpen && notSubmitted);
    })();

    return () => { cancel = true; };
  }, [user?.id, user?.role, user?.isManager, user?.centreId]);

  return pending;
}
