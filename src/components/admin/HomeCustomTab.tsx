import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Home, Save } from "lucide-react";

export default function HomeCustomTab({ centreId }: { centreId?: string | null }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings")
        .select("key, value")
        .in("key", ["home_title", "home_subtitle"]) as any;
      if (data) {
        data.forEach((row: any) => {
          if (row.key === "home_title") setTitle(row.value ?? "");
          if (row.key === "home_subtitle") setSubtitle(row.value ?? "");
        });
      }
    })();
  }, []);

  const upsert = async (key: string, value: string | null) => {
    const { data } = await supabase.from("app_settings").select("id").eq("key", key).limit(1) as any;
    if (data && data.length > 0) {
      await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() } as any).eq("id", data[0].id);
    } else {
      await supabase.from("app_settings").insert({ key, value, centre_id: centreId ?? null } as any);
    }
  };

  const save = async () => {
    setSaving(true);
    await Promise.all([
      upsert("home_title", title.trim() || null),
      upsert("home_subtitle", subtitle.trim() || null),
    ]);
    setSaving(false);
    toast({ title: "Page d'accueil mise à jour", description: "Rechargez pour voir l'effet." });
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2"><Home className="w-4 h-4 text-primary" /><h3 className="text-sm font-display font-semibold">Page d'accueil</h3></div>
        <p className="text-[11px] text-muted-foreground">
          Personnalisez le titre affiché en haut de l'accueil. Le logo se règle dans l'onglet Personnalisation.
        </p>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Titre principal</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Steel Mall — Espace pro" className="bg-secondary/50 border-border/50" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sous-titre / fonction (optionnel)</Label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ex : Système de gestion" className="bg-secondary/50 border-border/50" />
        </div>

        <Button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display">
          <Save className="w-4 h-4 mr-1" /> {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
