import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, FileUser, Trash2, ThumbsUp, Briefcase, Heart, AlertTriangle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import ManagerJobOffers from "@/components/cvtheque/ManagerJobOffers";
import CVManagementTab from "@/components/admin/CVManagementTab";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useCentre } from "@/contexts/CentreContext";

interface CV {
  id: string; nom: string; prenom: string | null; email: string | null; telephone: string | null;
  poste: string; secteur: string | null; experience: string | null; competences: string[] | null;
  status: string; boutique_name: string | null; created_at: string;
  cv_file_url: string | null; motivation_file_url: string | null;
}
interface Interest { id: string; cv_id: string; user_id: string; boutique_name: string | null; created_at: string; }

const statusColors: Record<string, string> = {
  nouveau: "bg-info/20 text-info border-info/30", en_cours: "bg-orange/20 text-orange border-orange/30",
  retenu: "bg-success/20 text-success border-success/30", refuse: "bg-destructive/20 text-destructive border-destructive/30",
};
const statusLabels: Record<string, string> = { nouveau: "Nouveau", en_cours: "En cours", retenu: "Retenu", refuse: "Refusé" };

export default function CVthequeModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const [search, setSearch] = useState("");
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nom: "", prenom: "", email: "", telephone: "", poste: "", secteur: "", experience: "" });
  const [cvFileUrl, setCvFileUrl] = useState<string | null>(null);
  const [motivFileUrl, setMotivFileUrl] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const fetchCVs = async () => {
    let q = supabase.from("cvs").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setCvs(data as CV[]);
  };
  const fetchInterests = async () => { const { data } = await supabase.from("cv_interests").select("*"); if (data) setInterests(data as Interest[]); };

  useEffect(() => { fetchCVs(); fetchInterests(); }, [selectedCentreId]);

  const filtered = cvs.filter(cv => cv.nom.toLowerCase().includes(search.toLowerCase()) || cv.poste.toLowerCase().includes(search.toLowerCase()));

  const toggleInterest = async (cvId: string) => {
    const existing = interests.find(i => i.cv_id === cvId && i.user_id === user!.id);
    if (existing) {
      await supabase.from("cv_interests").delete().eq("id", existing.id);
    } else {
      await supabase.from("cv_interests").insert({ cv_id: cvId, user_id: user!.id, boutique_name: user?.commerçant ?? user?.name } as any);
    }
    fetchInterests();
  };

  const getInterestCount = (cvId: string) => interests.filter(i => i.cv_id === cvId).length;
  const hasInterest = (cvId: string) => interests.some(i => i.cv_id === cvId && i.user_id === user!.id);

  const updateStatus = async (id: string, status: string) => { await supabase.from("cvs").update({ status }).eq("id", id); fetchCVs(); };
  const deleteCV = async (id: string) => { await supabase.from("cvs").delete().eq("id", id); setCvs(prev => prev.filter(cv => cv.id !== id)); setSelectedCV(null); };

  const sendToBoutique = async (cv: CV) => {
    const { data: groups } = await supabase.from("boutique_groups").select("id, name").order("name");
    const groupName = window.prompt(`Envoyer "${cv.nom}" à quelle boutique ?\n\n${(groups ?? []).map((g: any) => `• ${g.name}`).join("\n")}`);
    if (!groupName) return;
    const target = (groups ?? []).find((g: any) => g.name.toLowerCase() === groupName.trim().toLowerCase());
    if (!target) { toast({ title: "Boutique introuvable", variant: "destructive" }); return; }
    await supabase.from("cv_interests").insert({ cv_id: cv.id, user_id: user!.id, boutique_name: target.name } as any);
    await supabase.functions.invoke("notify-cv-interest", {
      body: { boutique_group_id: target.id, cv_id: cv.id, cv_nom: `${cv.nom}${cv.prenom ? " " + cv.prenom : ""}`, cv_poste: cv.poste },
    });
    toast({ title: "Envoyé à " + target.name });
    fetchInterests();
  };

  const submitCV = async () => {
    if (!formData.nom || !formData.poste) { toast({ title: "Champs requis", variant: "destructive" }); return; }
    const { error } = await supabase.from("cvs").insert({
      created_by: user!.id, boutique_name: user?.commerçant ?? user?.name,
      nom: formData.nom, prenom: formData.prenom || null, email: formData.email || null,
      telephone: formData.telephone || null, poste: formData.poste, secteur: formData.secteur || null,
      experience: formData.experience || null, status: "nouveau",
      cv_file_url: cvFileUrl, motivation_file_url: motivFileUrl,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setFormSubmitted(true); toast({ title: "CV enregistré !" }); fetchCVs();
  };

  const resetForm = () => {
    setFormSubmitted(false); setShowForm(false);
    setFormData({ nom: "", prenom: "", email: "", telephone: "", poste: "", secteur: "", experience: "" });
    setCvFileUrl(null); setMotivFileUrl(null);
  };

  const oldCVs = cvs.filter(cv => Date.now() - new Date(cv.created_at).getTime() > 365 * 24 * 60 * 60 * 1000);

  if (formSubmitted) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col"><AppHeader onBack={onBack} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 animate-scale-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass glow-primary"><CheckCircle className="w-10 h-10 text-success" /></div>
            <h2 className="text-xl font-bold font-display">CV enregistré !</h2>
            <Button onClick={resetForm} className="bg-gradient-to-r from-primary to-info hover:opacity-90 font-display">Retour</Button>
          </div>
        </main>
      </div>
    );
  }

  const FormBlock = () => (
    <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
      <h3 className="text-sm font-display font-semibold">Ajouter un CV</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nom *</Label><Input value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
        <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Prénom</Label><Input value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
        <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
        <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone</Label><Input value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Poste *</Label><Input value={formData.poste} onChange={e => setFormData({ ...formData, poste: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
      <div className="grid grid-cols-2 gap-3">
        <FileUpload label="CV (PDF)" value={cvFileUrl} onChange={setCvFileUrl} folder="cvs" accept=".pdf,.doc,.docx" />
        <FileUpload label="Lettre de motivation" value={motivFileUrl} onChange={setMotivFileUrl} folder="cvs" accept=".pdf,.doc,.docx" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { setShowForm(false); setCvFileUrl(null); setMotivFileUrl(null); }} className="flex-1 rounded-xl">Annuler</Button>
        <Button onClick={submitCV} className="flex-1 bg-gradient-to-r from-primary to-info hover:opacity-90 rounded-xl font-display">Enregistrer</Button>
      </div>
    </div>
  );

  // Coordinateur / Foncière view
  if (role === "gestionnaire" || role === "coordinateur") {
    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute bottom-1/3 -right-32 w-64 h-64 rounded-full bg-info/10 blur-[100px]" />
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2"><FileUser className="w-5 h-5 text-info" /><h2 className="text-lg font-bold font-display">CVthèque — Admin</h2></div>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-gradient-to-r from-primary to-info hover:opacity-90 rounded-xl font-display"><Briefcase className="w-4 h-4 mr-1" /> Ajouter</Button>
          </div>

          <CollapsibleSection title="Statistiques" icon={FileUser} accent="text-info" badge={<Badge variant="outline" className="text-[10px]">{cvs.length}</Badge>}>
            <div className="grid grid-cols-4 gap-3">
              <div className="glass-subtle rounded-xl p-3 text-center"><p className="text-xl font-bold font-display text-info">{cvs.length}</p><p className="text-[10px] text-muted-foreground uppercase">Total</p></div>
              <div className="glass-subtle rounded-xl p-3 text-center"><p className="text-xl font-bold font-display text-orange">{interests.length}</p><p className="text-[10px] text-muted-foreground uppercase">Intérêts</p></div>
              <div className="glass-subtle rounded-xl p-3 text-center"><p className="text-xl font-bold font-display text-success">{cvs.filter(c => c.status === "retenu").length}</p><p className="text-[10px] text-muted-foreground uppercase">Retenus</p></div>
              <div className="glass-subtle rounded-xl p-3 text-center"><p className="text-xl font-bold font-display text-destructive">{oldCVs.length}</p><p className="text-[10px] text-muted-foreground uppercase">&gt;1 an</p></div>
            </div>
          </CollapsibleSection>

          {oldCVs.length > 0 && (
            <CollapsibleSection title={`${oldCVs.length} CV(s) de plus d'un an`} icon={AlertTriangle} accent="text-orange">
              <div className="flex gap-2 flex-wrap">
                {oldCVs.slice(0, 5).map(cv => (
                  <div key={cv.id} className="flex items-center gap-1 glass-subtle rounded-lg px-2 py-1">
                    <span className="text-xs">{cv.nom}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => deleteCV(cv.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Administration CVthèque (déplacée depuis Admin) */}
          <CollapsibleSection title="Administration & lien public" icon={Briefcase} accent="text-violet">
            <CVManagementTab />
          </CollapsibleSection>

          {showForm && <FormBlock />}

          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" /></div>

          <div className="grid gap-3">
            {filtered.map(cv => (
              <div key={cv.id} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20"><AvatarFallback className="bg-gradient-to-br from-primary to-info text-white font-display">{cv.nom[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm font-display">{cv.nom}{cv.prenom ? ` ${cv.prenom}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{cv.poste} • {cv.boutique_name}</p>
                  {getInterestCount(cv.id) > 0 && <p className="text-xs text-orange flex items-center gap-1"><Heart className="w-3 h-3 fill-orange" /> {getInterestCount(cv.id)} intérêt(s)</p>}
                </div>
                <Badge className={`${statusColors[cv.status] ?? ""} text-[10px] border`}>{statusLabels[cv.status] ?? cv.status}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setSelectedCV(cv)}><Eye className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-info" onClick={() => sendToBoutique(cv)} title="Envoyer à une boutique"><Send className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-success" onClick={() => updateStatus(cv.id, "retenu")}><ThumbsUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive" onClick={() => deleteCV(cv.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </main>

        <Dialog open={!!selectedCV} onOpenChange={() => setSelectedCV(null)}>
          <DialogContent className="glass-card border-border/30">
            <DialogHeader><DialogTitle className="font-display">{selectedCV?.nom} {selectedCV?.prenom}</DialogTitle></DialogHeader>
            {selectedCV && (
              <div className="space-y-3">
                <p className="text-sm">{selectedCV.poste} • {selectedCV.secteur} • {selectedCV.experience}</p>
                {selectedCV.email && <p className="text-sm text-muted-foreground">📧 {selectedCV.email}</p>}
                {selectedCV.telephone && <p className="text-sm text-muted-foreground">📱 {selectedCV.telephone}</p>}
                {selectedCV.cv_file_url && <a href={selectedCV.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline block">📄 Voir le CV</a>}
                {selectedCV.motivation_file_url && <a href={selectedCV.motivation_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline block">📝 Lettre de motivation</a>}
                <div className="border-t border-border/30 pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Marques d'intérêt :</p>
                  {interests.filter(i => i.cv_id === selectedCV.id).map(i => (
                    <Badge key={i.id} className="text-xs mr-1 mb-1 bg-orange/20 text-orange border-orange/30">{i.boutique_name ?? "?"}</Badge>
                  ))}
                  {interests.filter(i => i.cv_id === selectedCV.id).length === 0 && <p className="text-xs text-muted-foreground">Aucune</p>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Commerçant view
  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute bottom-1/3 -right-32 w-64 h-64 rounded-full bg-info/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
        <div className="flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-2"><FileUser className="w-5 h-5 text-info" /><h2 className="text-lg font-bold font-display">CVthèque</h2></div>
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-gradient-to-r from-primary to-info hover:opacity-90 rounded-xl font-display"><Briefcase className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>

        {(user as any)?.is_manager && <ManagerJobOffers />}

        {showForm && <FormBlock />}

        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" /></div>

        <div className="grid gap-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun CV</p>}
          {filtered.map(cv => (
            <div key={cv.id} className="glass-card rounded-2xl p-4 flex items-center gap-3 animate-fade-up">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20"><AvatarFallback className="bg-gradient-to-br from-primary to-info text-white font-display">{cv.nom[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm font-display">{cv.nom}{cv.prenom ? ` ${cv.prenom}` : ""}</p>
                <p className="text-xs text-muted-foreground">{cv.poste}{cv.experience ? ` • ${cv.experience}` : ""}</p>
                {getInterestCount(cv.id) > 0 && <p className="text-xs text-orange flex items-center gap-1"><Heart className="w-3 h-3 fill-orange" /> {getInterestCount(cv.id)}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedCV(cv)} className="h-9 w-9 rounded-xl text-muted-foreground"><Eye className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => toggleInterest(cv.id)}
                className={`h-9 w-9 rounded-xl ${hasInterest(cv.id) ? "text-orange" : "text-muted-foreground"}`}>
                <Heart className={`w-5 h-5 ${hasInterest(cv.id) ? "fill-orange" : ""}`} />
              </Button>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={!!selectedCV} onOpenChange={() => setSelectedCV(null)}>
        <DialogContent className="glass-card border-border/30">
          <DialogHeader><DialogTitle className="font-display">{selectedCV?.nom} {selectedCV?.prenom}</DialogTitle></DialogHeader>
          {selectedCV && (
            <div className="space-y-3">
              <p className="text-sm">{selectedCV.poste}{selectedCV.secteur ? ` • ${selectedCV.secteur}` : ""}{selectedCV.experience ? ` • ${selectedCV.experience}` : ""}</p>
              {selectedCV.cv_file_url && <a href={selectedCV.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline block">📄 Voir le CV</a>}
              {selectedCV.motivation_file_url && <a href={selectedCV.motivation_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline block">📝 Lettre de motivation</a>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
