import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget Web Push system notification. Never throws. */
export async function sendPush(args: {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  notif_type?: string;
}) {
  if (!args.user_ids?.length) return;
  try {
    const { data, error } = await supabase.functions.invoke("send-push", { body: args });
    if (error) throw error;
    return data as { sent?: number; removed?: number; total?: number } | null;
  } catch (e) {
    console.warn("send-push failed", e);
    return null;
  }
}

/** Récupère les user_ids des boutiques d'un centre (et optionnellement tous les rôles centre/securite). */
export async function getCentreBoutiqueUserIds(centreId: string | null | undefined): Promise<string[]> {
  if (!centreId) return [];
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("centre_id", centreId);
  return (data ?? []).map((p: any) => p.user_id);
}
