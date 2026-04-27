import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, MessageSquare, Briefcase, Link2, Copy, Trash2, FileUser, Heart, Mail, CheckCircle2, Inbox } from "lucide-react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Badge as B } from "@/components/ui/badge";

const RETENTION_KEY = "cv_retention_months";

interface CvKpis { total: number; thisMonth: number; pending: number; sent: number; retained: number; offersPublished: number; }

export default function CVManagementTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [retention, setRetention] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [centre, setCentre] = useState<any>(null);
  const [reviewCV, setReviewCV] = useState<any>(null);
  const [complementText, setComplementText] = useState("");
  const [kpis, setKpis] = useState<CvKpis | null>(null);

  const centreId = (user as any)?.centreId ?? null;

  const fetchAll = async () => {
    setLoading(true);
    let cQuery = supabase.from("centres").select("id, name, slug");
    if (centreId) cQuery = cQuery.eq("id", centreId);
    const { data: cs } = await cQuery;
    if (cs && cs.length > 0) setCentre(cs[0]);

    const cvQ = supabase.from("cvs").select("*").eq("validation_status", "pending").order("created_at", { ascending: false });
    const { data: cvs } = await cvQ;
    setPending(cvs ?? []);

    const { data: os } = await supabase.from("job_offers").select("*").order("created_at", { ascending: false });
    setOffers(os ?? []);

    const { data: s } = await supabase.from("app_settings").select("value").eq("key", RETENTION_KEY).maybeSingle();
    if (s?.value) setRetention(parseInt(s.value, 10) || 6);

    // KPIs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [{ count: total }, { count: thisMonth }, { count: pendingC }, { count: sent }, { count: retained }, { count: offersPublished }] = await Promise.all([
      supabase.from("cvs").select("*", { count: "exact", head: true }).eq("validation_status", "validated"),
      supabase.from("cvs").select("*", { count: "exact", head: true }).eq("validation_status", "validated").gte("created_at", startOfMonth),
      supabase.from("cvs").select("*", { count: "exact", head: true }).eq("validation_status", "pending"),
      supabase.from("cv_interests").select("*", { count: "exact", head: true }),
      supabase.from("cv_interests").select("*", { count: "exact", head: true }).eq("retained", true),
      supabase.from("job_offers").select("*", { count: "exact", head: true }).eq("status", "published"),
    ]);
    setKpis({ total: total ?? 0, thisMonth: thisMonth ?? 0, pending: pendingC ?? 0, sent: sent ?? 0, retained: retained ?? 0, offersPublished: offersPublished ?? 0 });

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveRetention = async () => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", RETENTION_KEY).maybeSingle();
    if (existing) {
      await supabase.from("app_settings").update({ value: String(retention) } as any).eq("id", existing.id);
    } else {
      await supabase.from("app_settings").insert({ key: RETENTION_KEY, value: String(retention), centre_id: centreId } as any);
    }
    toast({ title: "Durée de conservation enregistrée" });
  };

  const validateCV = async (cv: any) => {
    const expires = new Date(); expires.setMonth(expires.getMonth() + retention);
    await supabase.from("cvs").update({
      validation_status: "validated", validated_at: new Date().toISOString(), validated_by: user!.id, expires_at: expires.toISOString(),
    } as any).eq("id", cv.id);
    toast({ title: "CV validé et ajouté à la base" });
    fetchAll();
  };

  const rejectCV = async (cv: any) => {
    await supabase.from("cvs").update({ validation_status: "rejected", validated_by: user!.id } as any).eq("id", cv.id);
    toast({ title: "CV refusé" });
    fetchAll();
  };

  const requestComplement = async () => {
    if (!reviewCV || !complementText.trim()) return;
    await supabase.from("cvs").update({
      validation_status: "complement_requested", complement_request: complementText.trim(), validated_by: user!.id,
    } as any).eq("id", reviewCV.id);
    toast({ title: "Demande de complément enregistrée", description: "Le candidat sera notifié par email (à venir avec Resend)." });
    setReviewCV(null); setComplementText("");
    fetchAll();
  };

  const approveOffer = async (o: any) => {
    await supabase.from("job_offers").update({
      status: "published", published_at: new Date().toISOString(), approved_by: user!.id,
    } as any).eq("id", o.id);
    toast({ title: "Offre publiée" }); fetchAll();
  };

  const rejectOffer = async (o: any) => {
    await supabase.from("job_offers").update({ status: "rejected", approved_by: user!.id } as any).eq("id", o.id);
    toast({ title: "Offre refusée" }); fetchAll();
  };

  const deleteOffer = async (o: any) => {
    await supabase.from("job_offers").delete().eq("id", o.id);
    fetchAll();
  };

  const publicUrl = centre?.slug ? `${window.location.origin}/cv/depot/${centre.slug}` : null;
  const copyLink = () => { if (publicUrl) { navigator.clipboard.writeText(publicUrl); toast({ title: "Lien copié" }); } };

  if (loading) return <div className="text-center py-6 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      {/* Lien public */}
      <CollapsibleSection title="Lien public de dépôt" icon={Link2} accent="text-info">
        {publicUrl ? (
          <>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="bg-secondary/50 border-border/50 text-xs" />
              <Button size="icon" variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
            </div>
            <Button onClick={() => window.open(publicUrl, "_blank")} className="w-full rounded-xl" variant="outline">
              <Link2 className="w-4 h-4 mr-2" /> Ouvrir le formulaire public
            </Button>
            <p className="text-[11px] text-muted-foreground">Partagez ce lien sur vos réseaux, QR code, affiches.</p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{centre ? `Le centre "${centre.name}" n'a pas de slug configuré.` : "Aucun centre détecté pour votre compte."} Le lien public sera disponible une fois le slug défini.</p>
        )}
      </CollapsibleSection>

      {/* KPIs CVthèque */}
      {kpis && (
        <CollapsibleSection title="CVthèque — Activité" icon={FileUser} accent="text-info">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Total CV (validés)" value={kpis.total} icon={<FileUser className="w-3 h-3 text-info" />} />
            <Kpi label="CV ce mois" value={kpis.thisMonth} />
            <Kpi label="En attente validation" value={kpis.pending} icon={<Mail className="w-3 h-3 text-orange" />} />
            <Kpi label="Intérêts boutiques" value={kpis.sent} icon={<Heart className="w-3 h-3 text-orange" />} />
            <Kpi label="Candidats retenus" value={kpis.retained} icon={<CheckCircle2 className="w-3 h-3 text-success" />} />
            <Kpi label="Offres publiées" value={kpis.offersPublished} icon={<Briefcase className="w-3 h-3 text-violet" />} />
          </div>
        </CollapsibleSection>
      )}

      {/* Réglage rétention */}
      <CollapsibleSection title="Conservation des CV">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Durée (mois)</Label>
            <Input type="number" min={1} max={36} value={retention} onChange={e => setRetention(parseInt(e.target.value, 10) || 6)} className="bg-secondary/50 border-border/50" />
          </div>
          <Button onClick={saveRetention} className="rounded-xl">Enregistrer</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Les CV validés seront automatiquement supprimés au bout de cette durée.</p>
      </CollapsibleSection>

      <CollapsibleSection
        title="CV en attente & Offres"
        icon={Inbox}
        accent="text-orange"
        badge={<Badge variant="outline" className="text-[10px] border-orange/40 text-orange">{pending.length + offers.filter(o => o.status === "pending").length}</Badge>}
      >
      <Tabs defaultValue="cv">
        <TabsList className="w-full">
          <TabsTrigger value="cv" className="flex-1">CV en attente ({pending.length})</TabsTrigger>
          <TabsTrigger value="offers" className="flex-1">Offres ({offers.filter(o => o.status === "pending").length} à valider)</TabsTrigger>
        </TabsList>

        <TabsContent value="cv" className="space-y-2 mt-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun CV en attente</p>}
          {pending.map(cv => (
            <div key={cv.id} className="glass-card rounded-2xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-display font-medium">{cv.nom} {cv.prenom ?? ""}</p>
                  <p className="text-xs text-muted-foreground">{cv.poste}{cv.secteur ? ` • ${cv.secteur}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{cv.email} {cv.telephone ? `• ${cv.telephone}` : ""}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{cv.submission_source === "public" ? "Public" : "Interne"}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {cv.cv_file_url && <a href={cv.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-info hover:underline">📄 CV</a>}
                {cv.motivation_file_url && <a href={cv.motivation_file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-info hover:underline">📝 Lettre</a>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => validateCV(cv)} className="flex-1 bg-success hover:bg-success/80 h-8"><Check className="w-3 h-3 mr-1" /> Valider</Button>
                <Button size="sm" variant="outline" onClick={() => { setReviewCV(cv); setComplementText(""); }} className="flex-1 h-8"><MessageSquare className="w-3 h-3 mr-1" /> Compléter</Button>
                <Button size="sm" variant="destructive" onClick={() => rejectCV(cv)} className="flex-1 h-8"><X className="w-3 h-3 mr-1" /> Refuser</Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="offers" className="space-y-2 mt-3">
          {offers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune offre</p>}
          {offers.map(o => (
            <div key={o.id} className="glass-card rounded-2xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-display font-medium">{o.title}</p>
                  <p className="text-[10px] text-muted-foreground">{o.boutique_name} • par {o.created_by_name ?? "?"}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${o.status === "published" ? "border-success/40 text-success" : o.status === "pending" ? "border-orange/40 text-orange" : "border-destructive/40 text-destructive"}`}>{o.status}</Badge>
              </div>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground line-clamp-3">{o.description}</p>
              <div className="flex gap-1">
                {o.status === "pending" && <Button size="sm" onClick={() => approveOffer(o)} className="flex-1 bg-success hover:bg-success/80 h-8"><Check className="w-3 h-3 mr-1" /> Publier</Button>}
                {o.status === "pending" && <Button size="sm" variant="destructive" onClick={() => rejectOffer(o)} className="flex-1 h-8"><X className="w-3 h-3 mr-1" /> Refuser</Button>}
                {o.status !== "pending" && <Button size="sm" variant="outline" onClick={() => deleteOffer(o)} className="flex-1 h-8"><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
      </CollapsibleSection>

      <Dialog open={!!reviewCV} onOpenChange={(o) => !o && setReviewCV(null)}>
        <DialogContent className="glass-card border-border/30">
          <DialogHeader><DialogTitle className="font-display">Demander un complément</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pour {reviewCV?.nom} {reviewCV?.prenom ?? ""} ({reviewCV?.email})</p>
            <Textarea value={complementText} onChange={e => setComplementText(e.target.value)} rows={5} placeholder="Précisez ce qui manque (ex: lettre de motivation, références…)" className="bg-secondary/50 border-border/50" />
            <Button onClick={requestComplement} className="w-full">Envoyer la demande</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="glass-subtle rounded-xl p-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">{icon}{label}</div>
      <p className="text-base font-bold font-display mt-0.5">{value}</p>
    </div>
  );
}
