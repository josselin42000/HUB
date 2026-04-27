import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, CheckCircle, Trash2, Edit, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import { sendPush, getCentreBoutiqueUserIds } from "@/lib/sendPush";
import { useCentre } from "@/contexts/CentreContext";

interface BonPlan {
  id: string; title: string; description: string; created_by: string; boutique_name: string | null;
  status: string; created_at: string; approved_at: string | null; file_url: string | null; target_boutique: string | null;
}

const statusColors: Record<string, string> = {
  proposed: "bg-orange/20 text-orange border-orange/30",
  published: "bg-success/20 text-success border-success/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};
const statusLabels: Record<string, string> = { proposed: "En attente", published: "Publié", rejected: "Refusé" };

export default function BonPlanModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const isManager = user?.isManager ?? false;
  const [plans, setPlans] = useState<BonPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [targetCommerçant, setTargetCommerçant] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const fetchPlans = async () => {
    let q = supabase.from("bon_plans").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setPlans(data as BonPlan[]);
  };

  useEffect(() => { fetchPlans(); }, [selectedCentreId]);

  const resetForm = () => { setTitle(""); setDescription(""); setFileUrl(null); setTargetCommerçant(""); setEditingId(null); setShowForm(false); };

  const submit = async () => {
    if (!title || !description) { toast({ title: "Champs requis", variant: "destructive" }); return; }
    if (editingId) {
      await supabase.from("bon_plans").update({ title, description, file_url: fileUrl, target_boutique: targetCommerçant || null, updated_at: new Date().toISOString() } as any).eq("id", editingId);
      toast({ title: "Bon plan modifié" });
    } else {
      const willPublish = role === "gestionnaire" || role === "coordinateur";
      await supabase.from("bon_plans").insert({
        title, description, created_by: user!.id, boutique_name: user?.commerçant ?? user?.name,
        status: willPublish ? "published" : "proposed",
        file_url: fileUrl, target_boutique: targetCommerçant || null,
      } as any);
      toast({ title: willPublish ? "Bon plan publié" : "Bon plan proposé" });
      if (willPublish) {
        const ids = await getCentreBoutiqueUserIds(user?.centreId);
        sendPush({ user_ids: ids, title: `🎁 Nouveau bon plan : ${title}`, body: description.slice(0, 140), notif_type: "info" });
      }
    }
    resetForm(); fetchPlans();
  };

  const approve = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    await supabase.from("bon_plans").update({ status: "published", approved_by: user!.id, approved_at: new Date().toISOString() } as any).eq("id", id);
    if (plan) {
      const ids = await getCentreBoutiqueUserIds(user?.centreId);
      sendPush({ user_ids: ids, title: `🎁 Nouveau bon plan : ${plan.title}`, body: plan.description.slice(0, 140), notif_type: "info" });
    }
    fetchPlans();
  };
  const reject = async (id: string) => { await supabase.from("bon_plans").update({ status: "rejected" } as any).eq("id", id); fetchPlans(); };
  const deletePlan = async (id: string) => { await supabase.from("bon_plans").delete().eq("id", id); fetchPlans(); };

  const startEdit = (plan: BonPlan) => {
    setTitle(plan.title); setDescription(plan.description); setFileUrl(plan.file_url); setTargetCommerçant(plan.target_boutique ?? "");
    setEditingId(plan.id); setShowForm(true);
  };

  const publishedPlans = plans.filter(p => p.status === "published");
  const pendingPlans = plans.filter(p => p.status === "proposed");

  const formBlock = (
    <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" className="bg-secondary/50 border-border/50" />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description du bon plan" rows={3} className="bg-secondary/50 border-border/50" />
      <Input value={targetCommerçant} onChange={e => setTargetCommerçant(e.target.value)} placeholder="Commerçant concernée (optionnel)" className="bg-secondary/50 border-border/50" />
      <FileUpload label="Pièce jointe" value={fileUrl} onChange={setFileUrl} folder="bon-plans" />
      <div className="flex gap-2">
        <Button variant="outline" onClick={resetForm} className="flex-1 rounded-xl">Annuler</Button>
        <Button onClick={submit} className="flex-1 bg-gradient-to-r from-orange to-violet hover:opacity-90 rounded-xl font-display">{editingId ? "Modifier" : (role === "gestionnaire" || role === "coordinateur") ? "Publier" : "Proposer"}</Button>
      </div>
    </div>
  );

  // Coordinateur / Foncière: manage
  if (role === "gestionnaire" || role === "coordinateur") {
    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute top-1/3 -left-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-orange" /><h2 className="text-lg font-bold font-display">Bons Plans — Admin</h2></div>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="bg-gradient-to-r from-orange to-violet hover:opacity-90 rounded-xl font-display"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </div>

          {showForm && formBlock}

          {pendingPlans.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
              <div className="p-4 pb-2"><h3 className="text-base font-display font-semibold text-orange">En attente ({pendingPlans.length})</h3></div>
              <div className="p-4 pt-2 space-y-2">
                {pendingPlans.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl glass-subtle">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.boutique_name}{p.target_boutique ? ` → ${p.target_boutique}` : ""} • {p.description.slice(0, 60)}...</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90 rounded-lg" onClick={() => approve(p.id)}>Accepter</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg text-destructive" onClick={() => reject(p.id)}>Refuser</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 animate-fade-up">
            {plans.map(p => (
              <div key={p.id} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium font-display">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.description.slice(0, 80)}{p.target_boutique ? ` • ${p.target_boutique}` : ""}</p>
                  {p.file_url && <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-info hover:underline"><Paperclip className="w-3 h-3 inline" /> Pièce jointe</a>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColors[p.status]} text-[10px] border`}>{statusLabels[p.status]}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(p)}><Edit className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deletePlan(p.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Commerçant view
  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/3 -left-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
        <div className="flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-orange" /><h2 className="text-lg font-bold font-display">Bons Plans</h2></div>
          {isManager && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="bg-gradient-to-r from-orange to-violet hover:opacity-90 rounded-xl font-display"><Plus className="w-4 h-4 mr-1" /> Proposer</Button>
          )}
        </div>

        {showForm && formBlock}

        <div className="space-y-3">
          {publishedPlans.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun bon plan pour le moment</p>}
          {publishedPlans.map((p, i) => (
            <div key={p.id} className="glass-card rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-orange" />
                <h3 className="text-sm font-display font-semibold">{p.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              {p.target_boutique && <p className="text-xs text-primary mt-1">🏪 {p.target_boutique}</p>}
              {p.file_url && <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline mt-1 block"><Paperclip className="w-3 h-3 inline" /> Pièce jointe</a>}
              <p className="text-xs text-muted-foreground mt-2">{p.boutique_name && `Par ${p.boutique_name} • `}{new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
