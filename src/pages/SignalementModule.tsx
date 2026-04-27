import { useState, useEffect, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Construction, Camera, MapPin, Send, CheckCircle, Clock, Phone,
  AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Image as ImageIcon, X,
  ZoomIn, ZoomOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPush } from "@/lib/sendPush";
import SignalementsStats from "@/components/admin/SignalementsStats";
import { useCentre } from "@/contexts/CentreContext";
import planCoordinateurDefault from "@/assets/plan-coordinateur.png";
import SignalementSettingsTab from "@/components/admin/SignalementSettingsTab";

const CATEGORIES = [
  { value: "degradation", label: "Dégradation", color: "bg-orange/20 text-orange border-orange/30" },
  { value: "element_manquant", label: "Élément manquant", color: "bg-info/20 text-info border-info/30" },
  { value: "information", label: "Information", color: "bg-violet/20 text-violet border-violet/30" },
  { value: "autre", label: "Autre", color: "bg-muted text-muted-foreground border-border" },
];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  nouveau: { label: "Nouveau", class: "bg-orange/20 text-orange border-orange/30" },
  pris_en_compte: { label: "Pris en compte", class: "bg-info/20 text-info border-info/30" },
  resolu: { label: "Résolu", class: "bg-success/20 text-success border-success/30" },
};

const SECURITY_PHONE = "tel:+33100000000"; // Placeholder

interface Signalement {
  id: string;
  boutique_name: string | null;
  created_at: string;
  description: string;
  status: string;
  category: string;
  photo_url: string | null;
  plan_x: number | null;
  plan_y: number | null;
  location: string | null;
  created_by: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

interface Message {
  id: string;
  signalement_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

export default function SignalementModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();
  const [view, setView] = useState<"form" | "history" | "detail" | "plan_settings">("history");
  const [reports, setReports] = useState<Signalement[]>([]);
  const [selectedReport, setSelectedReport] = useState<Signalement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Form state
  const [category, setCategory] = useState("degradation");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [planX, setPlanX] = useState<number | null>(null);
  const [planY, setPlanY] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === "securite" || role === "gestionnaire" || role === "coordinateur" || role === "fonciere" || role === "proprietaire";

  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const fetchPlan = async () => {
    const cid = user?.centreId ?? selectedCentreId;
    if (!cid) return;
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "plan_image_url")
      .eq("centre_id", cid)
      .maybeSingle();
    setPlanUrl(data?.value ?? null);
  };

  useEffect(() => { fetchPlan(); }, [user?.centreId, selectedCentreId]);

  const fetchReports = async () => {
    let q = supabase
      .from("signalements")
      .select("*")
      .order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setReports(data as Signalement[]);
  };

  const fetchMessages = async (signalementId: string) => {
    const { data } = await supabase
      .from("signalement_messages")
      .select("*")
      .eq("signalement_id", signalementId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel("signalements-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "signalements" }, () => fetchReports())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCentreId]);

  useEffect(() => {
    if (selectedReport) {
      fetchMessages(selectedReport.id);
      const channel = supabase
        .channel(`messages-${selectedReport.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "signalement_messages", filter: `signalement_id=eq.${selectedReport.id}` }, () => fetchMessages(selectedReport.id))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedReport?.id]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlanX(Math.round(x * 10) / 10);
    setPlanY(Math.round(y * 10) / 10);
  };

  const submitReport = async () => {
    if (!description.trim()) {
      toast({ title: "Erreur", description: "Veuillez décrire le problème.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `signalements/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("attachments").upload(path, photoFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data: insertedRows, error } = await supabase.from("signalements").insert({
      created_by: user!.id,
      boutique_name: user?.commerçant ?? user?.name,
      centre_id: user?.centreId ?? null,
      category,
      description,
      status: "nouveau",
      photo_url: photoUrl,
      plan_x: planX,
      plan_y: planY,
    } as any).select();

    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signalement envoyé", description: "Votre signalement a été transmis." });

    // Push to security + centre admins of the same centre
    if (user?.centreId) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("centre_id", user.centreId);
      const candidateIds = (profilesData ?? []).map((p: any) => p.user_id);
      if (candidateIds.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", candidateIds)
          .in("role", ["securite", "centre", "fonciere"]);
        const targetIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
        const catLabel = CATEGORIES.find(c => c.value === category)?.label ?? category;
        sendPush({
          user_ids: targetIds,
          title: `🚧 Signalement : ${catLabel}`,
          body: `${user?.commerçant ?? user?.name ?? ""} — ${description.slice(0, 140)}`,
          notif_type: "alerte",
        });
      }
    }

    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setPlanX(null);
    setPlanY(null);
    setView("history");
    fetchReports();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "pris_en_compte") {
      updates.acknowledged_at = new Date().toISOString();
      updates.acknowledged_by = user!.id;
    }
    if (newStatus === "resolu") {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user!.id;
    }
    await supabase.from("signalements").update(updates).eq("id", id);
    if (selectedReport?.id === id) {
      setSelectedReport({ ...selectedReport, ...updates, status: newStatus } as Signalement);
    }
    fetchReports();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedReport) return;
    await supabase.from("signalement_messages").insert({
      signalement_id: selectedReport.id,
      author_id: user!.id,
      author_name: user?.name ?? "Inconnu",
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

  // ─── DETAIL VIEW ───
  if (view === "detail" && selectedReport) {
    const s = STATUS_MAP[selectedReport.status] ?? STATUS_MAP.nouveau;
    return (
      <div className="min-h-screen mesh-bg flex flex-col">
        <AppHeader onBack={() => { setView("history"); setSelectedReport(null); }} />
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4 animate-fade-up">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={`${s.class} border text-xs`}>{s.label}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(selectedReport.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <p className="text-sm font-medium font-display">{selectedReport.boutique_name}</p>
            <Badge className={`${CATEGORIES.find(c => c.value === selectedReport.category)?.color ?? ""} border text-xs`}>
              {CATEGORIES.find(c => c.value === selectedReport.category)?.label ?? selectedReport.category}
            </Badge>
            <p className="text-sm text-muted-foreground">{selectedReport.description}</p>

            {selectedReport.photo_url && (
              <img src={selectedReport.photo_url} alt="Photo" className="w-full rounded-xl max-h-48 object-cover" />
            )}

            {selectedReport.plan_x != null && selectedReport.plan_y != null && (
              <div className="space-y-1">
                <div
                  className="relative w-full rounded-xl border border-border/30 overflow-hidden cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                >
                  <img src={planUrl ?? planCoordinateurDefault} alt="Plan" className="w-full" />
                  <div
                    className="absolute w-4 h-4 bg-sos rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${selectedReport.plan_x}%`, top: `${selectedReport.plan_y}%` }}
                  />
                  <div className="absolute top-2 right-2 bg-background/80 rounded-lg p-1">
                    <ZoomIn className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Appuyez pour zoomer</p>
              </div>
            )}
            {/* Zoom modal */}
            {zoomOpen && (planUrl || true) && selectedReport.plan_x != null && (
              <div className="fixed inset-0 z-50 bg-background/95 flex flex-col" onClick={() => { setZoomOpen(false); setZoom(1); }}>
                <div className="flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
                  <p className="text-sm font-display font-semibold">Localisation</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="bg-muted rounded-lg p-2"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="bg-muted rounded-lg p-2"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={() => { setZoomOpen(false); setZoom(1); }} className="bg-muted rounded-lg p-2 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                  <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}>
                    <img src={planUrl ?? planCoordinateurDefault} alt="Plan zoomé" style={{ maxWidth: "90vw" }} />
                    <div
                      className="absolute w-5 h-5 bg-sos rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${selectedReport.plan_x}%`, top: `${selectedReport.plan_y!}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedReport.acknowledged_at && (
              <p className="text-xs text-info flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Pris en compte le {new Date(selectedReport.acknowledged_at).toLocaleString("fr-FR")}
              </p>
            )}
            {selectedReport.resolved_at && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Résolu le {new Date(selectedReport.resolved_at).toLocaleString("fr-FR")}
              </p>
            )}

            {/* Admin actions */}
            {isAdmin && selectedReport.status === "nouveau" && (
              <Button className="w-full bg-info hover:bg-info/90 rounded-xl" onClick={() => updateStatus(selectedReport.id, "pris_en_compte")}>
                Prendre en compte
              </Button>
            )}
            {isAdmin && selectedReport.status === "pris_en_compte" && (
              <Button className="w-full bg-success hover:bg-success/90 rounded-xl" onClick={() => updateStatus(selectedReport.id, "resolu")}>
                Marquer comme résolu
              </Button>
            )}
          </div>

          {/* Messages thread */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Échanges
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun message</p>}
              {messages.map(m => (
                <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.author_id === user?.id ? "bg-primary/15 ml-8" : "bg-muted/40 mr-8"}`}>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{m.author_name} · {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-xs">{m.content}</p>
                </div>
              ))}
            </div>
            {(isAdmin || selectedReport.created_by === user?.id) && (
              <div className="flex gap-2">
                <Input
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="rounded-xl text-sm"
                />
                <Button size="icon" className="rounded-xl bg-primary" onClick={sendMessage}><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── PLAN SETTINGS VIEW ───
  if (view === "plan_settings") {
    return (
      <div className="min-h-screen mesh-bg flex flex-col">
        <AppHeader onBack={() => setView("history")} />
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-display">Plan du centre</h2>
          </div>
          <SignalementSettingsTab />
        </main>
      </div>
    );
  }

  // ─── FORM VIEW ───
  if (view === "form") {
    return (
      <div className="min-h-screen mesh-bg flex flex-col">
        <AppHeader onBack={() => setView("history")} />
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          <div className="flex items-center gap-2 animate-fade-up">
            <Construction className="w-5 h-5 text-orange" />
            <h2 className="text-lg font-bold font-display">Signaler une anomalie</h2>
          </div>

          {/* Category */}
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
            <h3 className="text-sm font-display font-semibold">Catégorie</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-display font-medium border transition-all cursor-pointer ${
                    category === c.value ? c.color + " scale-[1.02]" : "border-border/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <h3 className="text-sm font-display font-semibold">Photo</h3>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full rounded-xl max-h-40 object-cover" />
                <button className="absolute top-2 right-2 bg-background/80 rounded-full p-1" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Prendre une photo ou choisir</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Plan location */}
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-display font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Localiser sur le plan
            </h3>
            <div
              className="relative w-full rounded-xl border border-border/30 cursor-crosshair overflow-hidden"
              onClick={handlePlanClick}
            >
              <img src={planUrl ?? planCoordinateurDefault} alt="Plan" className="w-full" />
              {planX == null && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full">Cliquez pour placer un repère</span>
                </div>
              )}
              {planX != null && planY != null && (
                <div
                  className="absolute w-5 h-5 bg-sos rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 animate-scale-up"
                  style={{ left: `${planX}%`, top: `${planY}%` }}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              {planX != null ? (
                <p className="text-[10px] text-success">📍 Repère placé</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Optionnel</p>
              )}
              <button
                onClick={() => setZoomOpen(true)}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ZoomIn className="w-3 h-3" /> Zoomer pour placer précisément
              </button>
            </div>
            {/* Zoom modal pour le formulaire */}
            {zoomOpen && (
              <div className="fixed inset-0 z-50 bg-background/95 flex flex-col" onClick={() => { setZoomOpen(false); setZoom(1); }}>
                <div className="flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
                  <p className="text-sm font-display font-semibold">Cliquez pour placer le repère</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="bg-muted rounded-lg p-2"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="bg-muted rounded-lg p-2"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={() => { setZoomOpen(false); setZoom(1); }} className="bg-muted rounded-lg p-2 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                  <div
                    className="relative cursor-crosshair"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setPlanX(Math.round(x * 10) / 10);
                      setPlanY(Math.round(y * 10) / 10);
                      setZoomOpen(false);
                      setZoom(1);
                    }}
                  >
                    <img src={planUrl ?? planCoordinateurDefault} alt="Plan zoomé" style={{ maxWidth: "90vw" }} />
                    {planX != null && planY != null && (
                      <div
                        className="absolute w-5 h-5 bg-sos rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${planX}%`, top: `${planY}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-sm font-display font-semibold">Description</h3>
            <Textarea
              placeholder="Décrivez le problème observé..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-[hsl(45,90%,55%)] to-orange hover:opacity-90 rounded-xl font-display text-white"
            onClick={submitReport}
            disabled={submitting}
          >
            {submitting ? "Envoi..." : "Envoyer le signalement"}
          </Button>

          {/* Emergency call */}
          <a
            href={SECURITY_PHONE}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-sos to-[hsl(15,80%,45%)] text-white flex items-center justify-center gap-2 font-display font-bold shadow-lg hover:opacity-90 transition-opacity"
          >
            <Phone className="w-5 h-5" />
            Risque pour les personnes — Appeler le PC Sécurité
          </a>
        </main>
      </div>
    );
  }

  // ─── HISTORY / LIST VIEW ───
  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        <div className="flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-2">
            <Construction className="w-5 h-5 text-orange" />
            <h2 className="text-lg font-bold font-display">{isAdmin ? "Signalements reçus" : "Mes signalements"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1 text-xs"
                onClick={() => setView("plan_settings")}
              >
                <MapPin className="w-3 h-3" /> Plan
              </Button>
            )}
            <Button
              size="sm"
              className="bg-gradient-to-r from-[hsl(45,90%,55%)] to-orange text-white rounded-xl font-display"
              onClick={() => setView("form")}
            >
              + Signaler
            </Button>
          </div>
        </div>

        {isAdmin && <SignalementsStats />}

        <div className="space-y-3">
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun signalement</p>
          )}
          {reports.map((r, i) => {
            const s = STATUS_MAP[r.status] ?? STATUS_MAP.nouveau;
            const cat = CATEGORIES.find(c => c.value === r.category);
            return (
              <button
                key={r.id}
                onClick={() => { setSelectedReport(r); setView("detail"); }}
                className="w-full text-left glass-card rounded-2xl p-4 space-y-2 animate-fade-up hover:scale-[1.01] transition-transform cursor-pointer"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${s.class} border text-[10px]`}>{s.label}</Badge>
                    {cat && <Badge className={`${cat.color} border text-[10px]`}>{cat.label}</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-sm font-medium font-display">{r.boutique_name ?? "Inconnu"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                {r.photo_url && (
                  <div className="flex items-center gap-1 text-[10px] text-primary">
                    <ImageIcon className="w-3 h-3" /> Photo jointe
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
