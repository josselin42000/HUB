import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Store, MapPin } from "lucide-react";

interface PendingProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  boutique_name: string | null;
  centre_id: string | null;
  created_at: string;
  centre_name?: string;
}

export default function PendingAccountsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const { data: centres } = await supabase.from("centres").select("id, name");
    const centreMap = Object.fromEntries((centres ?? []).map(c => [c.id, c.name]));

    setPending(profiles.map((p: any) => ({
      ...p,
      centre_name: p.centre_id ? centreMap[p.centre_id] ?? "—" : "—",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const approve = async (profile: PendingProfile) => {
    await supabase.from("profiles")
      .update({ status: "active" })
      .eq("user_id", profile.user_id);
    toast({ title: `✅ ${profile.name} approuvé` });
    fetchPending();
  };

  const reject = async (profile: PendingProfile) => {
    // Désactiver le compte auth + supprimer profil
    await supabase.from("profiles").delete().eq("user_id", profile.user_id);
    await supabase.from("user_roles").delete().eq("user_id", profile.user_id);
    // Note: suppression auth user nécessite service role — on met juste le status
    await supabase.from("profiles")
      .update({ status: "rejected" })
      .eq("user_id", profile.user_id)
      .then(() => {}); // best effort
    toast({ title: `❌ ${profile.name} refusé`, variant: "destructive" });
    fetchPending();
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>;

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun compte en attente de validation</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{pending.length} compte{pending.length > 1 ? "s" : ""} en attente</p>
          {pending.map(p => (
            <div key={p.user_id} className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold font-display text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <Badge className="bg-orange/20 text-orange border-orange/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> En attente
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {p.boutique_name && (
                  <span className="flex items-center gap-1">
                    <Store className="w-3 h-3" /> {p.boutique_name}
                  </span>
                )}
                {p.centre_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {p.centre_name}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Demande le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 rounded-xl gap-1 text-xs"
                  onClick={() => approve(p)}
                >
                  <CheckCircle className="w-3 h-3" /> Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl gap-1 text-xs"
                  onClick={() => reject(p)}
                >
                  <XCircle className="w-3 h-3" /> Refuser
                </Button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
