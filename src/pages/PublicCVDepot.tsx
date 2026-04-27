import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Briefcase, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/contexts/AppSettingsContext";

interface Centre { id: string; name: string; slug: string; }
interface Offer { id: string; title: string; description: string; contract_type: string | null; work_time: string | null; boutique_name: string | null; }

const RETENTION_KEY = "cv_retention_months";
const DEFAULT_RETENTION = 6;

export default function PublicCVDepot() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const [centre, setCentre] = useState<Centre | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [retention, setRetention] = useState<number>(DEFAULT_RETENTION);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string>("spontaneous");
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", poste: "", secteur: "", experience: "" });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivFile, setMotivFile] = useState<File | null>(null);
  const cvRef = useRef<HTMLInputElement>(null);
  const motivRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: c } = await supabase.rpc("get_centre_by_slug" as any, { _slug: slug });
      const centreData = Array.isArray(c) && c.length > 0 ? c[0] as Centre : null;
      setCentre(centreData);
      if (centreData) {
        const { data: o } = await supabase.rpc("get_published_offers_by_centre" as any, { _centre_id: centreData.id });
        if (o) setOffers(o as Offer[]);
        const { data: s } = await supabase.from("app_settings").select("value").eq("centre_id", centreData.id).eq("key", RETENTION_KEY).maybeSingle();
        if (s?.value) setRetention(parseInt(s.value, 10) || DEFAULT_RETENTION);
      }
      setLoading(false);
    })();
  }, [slug]);

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${centre!.id}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("public-cvs").upload(path, file);
    if (error) { toast({ title: "Erreur upload", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("public-cvs").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!form.nom.trim() || !form.poste.trim() || !form.email.trim()) {
      toast({ title: "Champs requis", description: "Nom, email et poste sont obligatoires.", variant: "destructive" });
      return;
    }
    if (!centre) return;
    setSubmitting(true);
    try {
      let cvUrl: string | null = null;
      let motivUrl: string | null = null;
      if (cvFile) cvUrl = await uploadFile(cvFile, "cv");
      if (motivFile) motivUrl = await uploadFile(motivFile, "motiv");

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + retention);

      const offerId = selectedOffer !== "spontaneous" ? selectedOffer : null;
      const offerObj = offerId ? offers.find(o => o.id === offerId) : null;

      const { error } = await supabase.from("cvs").insert({
        centre_id: centre.id,
        nom: form.nom.trim(),
        prenom: form.prenom.trim() || null,
        email: form.email.trim(),
        telephone: form.telephone.trim() || null,
        poste: form.poste.trim(),
        secteur: form.secteur.trim() || null,
        experience: form.experience.trim() || null,
        cv_file_url: cvUrl,
        motivation_file_url: motivUrl,
        validation_status: "pending",
        submission_source: "public",
        status: "nouveau",
        job_offer_id: offerId,
        boutique_name: offerObj?.boutique_name ?? null,
      } as any);

      if (error) throw error;

      // Notifier l'admin (push) — fire-and-forget
      supabase.functions.invoke("notify-cv-submission", {
        body: { centre_id: centre.id, nom: form.nom.trim(), prenom: form.prenom.trim() || null, poste: form.poste.trim(), offer_title: offerObj?.title ?? null },
      }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!centre) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
      <div>
        <p className="text-lg font-display font-bold mb-2">Centre introuvable</p>
        <p className="text-sm text-muted-foreground">Le lien semble incorrect.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4 animate-scale-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass glow-primary"><CheckCircle className="w-8 h-8 text-success" /></div>
        <h2 className="text-xl font-bold font-display">Candidature reçue !</h2>
        <p className="text-sm text-muted-foreground">Votre CV a bien été transmis à l'équipe de <strong>{centre.name}</strong>. Vous serez recontacté(e) si votre profil est retenu.</p>
        <Button onClick={() => { setSubmitted(false); setForm({ nom: "", prenom: "", email: "", telephone: "", poste: "", secteur: "", experience: "" }); setCvFile(null); setMotivFile(null); setSelectedOffer("spontaneous"); }} variant="outline" className="rounded-xl">Déposer une autre candidature</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg p-4 pb-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center pt-6 pb-2 animate-fade-up">
          {settings.logo_url && <img src={settings.logo_url} alt="" className="h-12 mx-auto mb-3" />}
          <h1 className="text-2xl font-bold font-display">Déposer votre CV</h1>
          <p className="text-sm text-muted-foreground mt-1">{centre.name}</p>
        </div>

        {offers.length > 0 && (
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-info" /><h2 className="text-sm font-display font-semibold">Postes ouverts ({offers.length})</h2></div>
            <Select value={selectedOffer} onValueChange={setSelectedOffer}>
              <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spontaneous">📩 Candidature spontanée</SelectItem>
                {offers.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.title}{o.boutique_name ? ` — ${o.boutique_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOffer !== "spontaneous" && (() => {
              const o = offers.find(x => x.id === selectedOffer);
              if (!o) return null;
              return (
                <div className="glass-subtle rounded-xl p-3 space-y-1">
                  <p className="text-sm font-display font-medium">{o.title}</p>
                  {o.boutique_name && <Badge variant="outline" className="text-[10px]">{o.boutique_name}</Badge>}
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{o.description}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    {o.contract_type && <span>📑 {o.contract_type}</span>}
                    {o.work_time && <span>⏱ {o.work_time}</span>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
          <h2 className="text-sm font-display font-semibold">Vos informations</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Prénom</Label><Input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Poste recherché *</Label><Input value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} className="bg-secondary/50 border-border/50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Secteur</Label><Input value={form.secteur} onChange={e => setForm({ ...form, secteur: e.target.value })} placeholder="Mode, Beauté…" className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Expérience</Label><Input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="2 ans, débutant…" className="bg-secondary/50 border-border/50" /></div>
          </div>

          {[
            { label: "CV (PDF)", file: cvFile, setFile: setCvFile, ref: cvRef },
            { label: "Lettre de motivation", file: motivFile, setFile: setMotivFile, ref: motivRef },
          ].map(({ label, file, setFile, ref }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
              {file ? (
                <div className="flex items-center gap-2 p-2 rounded-lg glass-subtle">
                  <FileText className="w-4 h-4 text-info shrink-0" />
                  <span className="text-xs truncate flex-1">{file.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFile(null)}><X className="w-3 h-3" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => ref.current?.click()} className="w-full rounded-xl border-dashed border-border/50 text-muted-foreground text-xs h-9">
                  <Paperclip className="w-3 h-3 mr-1" /> Joindre
                </Button>
              )}
              <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = ""; }} />
            </div>
          ))}

          <div className="glass-subtle rounded-xl p-3 text-[11px] text-muted-foreground border border-border/30">
            ℹ️ Conformément à notre politique de confidentialité, votre CV sera <strong>automatiquement supprimé de notre base au bout de {retention} mois</strong>.
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full h-11 bg-gradient-to-r from-primary to-info hover:opacity-90 rounded-xl font-display">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi…</> : "Envoyer ma candidature"}
          </Button>
        </div>
      </div>
    </div>
  );
}
