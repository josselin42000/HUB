import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LifeBuoy, Trash2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Profile { id: string; user_id: string; name: string; email: string; }
interface Perm {
  user_id: string;
  can_view_stats: boolean;
  can_view_sondages: boolean;
  can_view_informations: boolean;
  can_view_collecte: boolean;
}

const KEYS: { key: keyof Omit<Perm, "user_id">; label: string }[] = [
  { key: "can_view_stats", label: "Statistiques" },
  { key: "can_view_sondages", label: "Sondages" },
  { key: "can_view_informations", label: "Infos" },
  { key: "can_view_collecte", label: "Collecte CA" },
];

export default function SupportTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [perms, setPerms] = useState<Record<string, Perm>>({});
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    const [{ data: profs }, { data: pp }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, name, email").order("name"),
      supabase.from("support_permissions" as any).select("*"),
    ]);
    if (profs) setProfiles(profs as Profile[]);
    if (pp) {
      const map: Record<string, Perm> = {};
      (pp as any[]).forEach(p => { map[p.user_id] = p; });
      setPerms(map);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const enableSupport = async (userId: string) => {
    const { error } = await supabase.from("support_permissions" as any).insert({
      user_id: userId, granted_by: user?.id,
      can_view_stats: false, can_view_sondages: false,
      can_view_informations: false, can_view_collecte: false,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Compte support activé" });
    fetchAll();
  };

  const removeSupport = async (userId: string) => {
    await supabase.from("support_permissions" as any).delete().eq("user_id", userId);
    toast({ title: "Compte support retiré" });
    fetchAll();
  };

  const togglePerm = async (userId: string, key: keyof Omit<Perm, "user_id">, value: boolean) => {
    const { error } = await supabase.from("support_permissions" as any)
      .update({ [key]: value, updated_at: new Date().toISOString() } as any)
      .eq("user_id", userId);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setPerms(prev => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }));
  };

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="glass-subtle rounded-xl p-3">
        <div className="flex items-start gap-2">
          <LifeBuoy className="w-4 h-4 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Un compte <strong>Fonction Support</strong> a un accès admin restreint : seules les fonctionnalités cochées sont visibles dans son menu.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" />
      </div>

      {filtered.map(p => {
        const perm = perms[p.user_id];
        return (
          <div key={p.id} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet text-white text-xs font-display">
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-display">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              </div>
              {perm ? (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSupport(p.user_id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={() => enableSupport(p.user_id)}>
                  <UserPlus className="w-3 h-3 mr-1" /> Activer
                </Button>
              )}
            </div>

            {perm && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                {KEYS.map(k => (
                  <div key={k.key} className="flex items-center justify-between glass-subtle rounded-xl px-3 py-2">
                    <span className="text-xs">{k.label}</span>
                    <Switch checked={!!perm[k.key]} onCheckedChange={(v) => togglePerm(p.user_id, k.key, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
