import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus } from "lucide-react";

export default function ManagerJobOffers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", contract_type: "CDI", work_time: "Temps plein" });

  const fetchMine = async () => {
    const { data } = await supabase.from("job_offers").select("*").eq("created_by", user!.id).order("created_at", { ascending: false });
    setMine(data ?? []);
  };

  useEffect(() => { if (user?.id) fetchMine(); }, [user?.id]);

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast({ title: "Titre et description requis", variant: "destructive" }); return; }
    const { error } = await supabase.from("job_offers").insert({
      created_by: user!.id,
      created_by_name: user?.name ?? null,
      centre_id: (user as any)?.centreId ?? null,
      boutique_name: (user as any)?.commerçant ?? user?.name ?? null,
      title: form.title.trim(),
      description: form.description.trim(),
      contract_type: form.contract_type,
      work_time: form.work_time,
      status: "pending",
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Offre soumise pour validation" });
    setForm({ title: "", description: "", contract_type: "CDI", work_time: "Temps plein" });
    setOpen(false); fetchMine();
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-violet" /><h3 className="text-sm font-display font-semibold">Mes offres d'emploi</h3></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="w-3 h-3 mr-1" /> Proposer</Button></DialogTrigger>
          <DialogContent className="glass-card border-border/30">
            <DialogHeader><DialogTitle className="font-display">Nouvelle offre d'emploi</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Vendeur(se), Responsable boutique…" className="bg-secondary/50 border-border/50" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5} className="bg-secondary/50 border-border/50" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Contrat</Label><Input value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
                <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Temps</Label><Input value={form.work_time} onChange={e => setForm({ ...form, work_time: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
              </div>
              <p className="text-[11px] text-muted-foreground">Votre offre sera publiée après validation par l'administration.</p>
              <Button onClick={submit} className="w-full">Soumettre</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {mine.length === 0 && <p className="text-xs text-muted-foreground">Aucune offre proposée.</p>}
      {mine.map(o => (
        <div key={o.id} className="glass-subtle rounded-lg p-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-display font-medium truncate">{o.title}</p>
            <p className="text-[10px] text-muted-foreground">{o.contract_type} • {o.work_time}</p>
          </div>
          <Badge variant="outline" className={`text-[10px] ${o.status === "published" ? "border-success/40 text-success" : o.status === "pending" ? "border-orange/40 text-orange" : "border-destructive/40 text-destructive"}`}>{o.status === "published" ? "Publiée" : o.status === "pending" ? "En attente" : o.status === "rejected" ? "Refusée" : o.status}</Badge>
        </div>
      ))}
    </div>
  );
}
