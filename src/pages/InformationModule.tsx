import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Edit, Send, Clock, AlertTriangle, Paperclip, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { sendPush } from "@/lib/sendPush";
import { useCentre } from "@/contexts/CentreContext";

interface Info {
  id: string; title: string; content: string; info_type: string; priority: string;
  created_by: string; status: string; published_at: string | null; created_at: string;
  file_url: string | null;
}

const PRESETS = [
  { label: "Enfant perdu", type: "urgence", content: "⚠️ Un enfant a été signalé perdu dans le coordinateur. Merci de rester vigilant et de contacter le PC sécurité." },
  { label: "Avis de tempête", type: "urgence", content: "⛈️ Alerte météo : tempête annoncée. Veuillez sécuriser vos devantures et prévenir vos clients." },
  { label: "Faux billets", type: "securite", content: "🔍 Signalement de faux billets en circulation. Soyez attentifs lors des transactions en espèces." },
  { label: "Demande de CA", type: "general", content: "📊 Rappel : merci de saisir votre CA du mois en cours dans le module Collecte CA." },
  { label: "Relance CA", type: "general", content: "📊 Relance : votre CA du mois n'a pas encore été saisi. Merci de le faire rapidement." },
];

const priorityColors: Record<string, string> = {
  normal: "bg-info/20 text-info border-info/30",
  important: "bg-orange/20 text-orange border-orange/30",
  urgent: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function InformationModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const [infos, setInfos] = useState<Info[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [infoType, setInfoType] = useState("general");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sendNotif, setSendNotif] = useState(true);
  const [notifScope, setNotifScope] = useState<"centre" | "global">("centre");
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const fetchInfos = async () => {
    let q = supabase.from("informations").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setInfos(data as Info[]);
  };

  useEffect(() => { fetchInfos(); }, [selectedCentreId]);

  const resetForm = () => { setTitle(""); setContent(""); setFileUrl(null); setPriority("normal"); setInfoType("general"); setEditingId(null); setShowForm(false); setSendNotif(true); setNotifScope("centre"); };

  const dispatchNotification = async (infoTitle: string, infoContent: string, infoPriority: string) => {
    if (!user) return;
    try {
      const isGlobalUser = role === "gestionnaire" || (role as string) === "proprietaire";
      const scope: "centre" | "global" = notifScope === "global" && isGlobalUser ? "global" : "centre";
      const centreId = scope === "global" ? null : (user.centreId ?? null);

      let q = supabase.from("profiles").select("user_id");
      if (scope === "centre" && centreId) q = q.eq("centre_id", centreId);
      const { data: profs } = await q;
      const userIds = Array.from(new Set(((profs as any[]) ?? []).map(p => p.user_id).filter(Boolean)));
      if (userIds.length === 0) return;

      const { data: notif, error } = await supabase.from("notifications").insert({
        centre_id: centreId, created_by: user.id, created_by_name: (user as any).name ?? null,
        title: `📢 ${infoTitle}`, body: infoContent.slice(0, 400),
        notif_type: infoPriority === "urgent" ? "alerte" : "info",
        target_scope: scope, target_centre_id: scope === "centre" ? centreId : null,
      } as any).select().single();
      if (error) throw error;
      await supabase.from("notification_recipients").insert(userIds.map(uid => ({ notification_id: (notif as any).id, user_id: uid })));
      sendPush({ user_ids: userIds, title: `📢 ${infoTitle}`, body: infoContent.slice(0, 400), url: "/information", notif_type: infoPriority === "urgent" ? "alerte" : "info" });
      toast({ title: "Notification envoyée", description: `${userIds.length} destinataire(s)` });
    } catch (e: any) {
      toast({ title: "Notif non envoyée", description: e.message, variant: "destructive" });
    }
  };

  const submit = async () => {
    if (!title || !content) { toast({ title: "Champs requis", variant: "destructive" }); return; }
    if (editingId) {
      await supabase.from("informations").update({ title, content, priority, info_type: infoType, file_url: fileUrl, updated_at: new Date().toISOString() } as any).eq("id", editingId);
      toast({ title: "Information modifiée" });
    } else {
      await supabase.from("informations").insert({
        title, content, priority, info_type: infoType, file_url: fileUrl, created_by: user!.id,
        status: "published", published_at: new Date().toISOString(),
      } as any);
      toast({ title: "Information publiée" });
      if (sendNotif) await dispatchNotification(title, content, priority);
    }
    resetForm(); fetchInfos();
  };

  const deleteInfo = async (id: string) => { await supabase.from("informations").delete().eq("id", id); fetchInfos(); };

  const startEdit = (info: Info) => {
    setTitle(info.title); setContent(info.content); setPriority(info.priority); setInfoType(info.info_type);
    setFileUrl((info as any).file_url ?? null); setEditingId(info.id); setShowForm(true);
  };

  const usePreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.label); setContent(preset.content); setInfoType(preset.type);
    setPriority(preset.type === "urgence" ? "urgent" : "normal"); setShowForm(true);
  };

  const canManage = role === "gestionnaire" || role === "coordinateur" || role === "securite";
  const published = infos.filter(i => i.status === "published");

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-info/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
        <div className="flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-info" /><h2 className="text-lg font-bold font-display">Informations{canManage ? " — Gestion" : ""}</h2></div>
          {canManage && <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="bg-gradient-to-r from-info to-teal hover:opacity-90 rounded-xl font-display"><Plus className="w-4 h-4 mr-1" /> Publier</Button>}
        </div>

        {canManage && !showForm && (
          <div className="animate-fade-up">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Messages pré-enregistrés</p>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => usePreset(p)}
                  className="px-3 py-1.5 rounded-xl glass border-info/20 text-xs font-display hover:bg-info/10 transition-colors cursor-pointer">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showForm && canManage && (
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" className="bg-secondary/50 border-border/50" />
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu de l'information" rows={4} className="bg-secondary/50 border-border/50" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={infoType} onValueChange={setInfoType}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="securite">Sécurité</SelectItem>
                  <SelectItem value="urgence">Urgence</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FileUpload label="Pièce jointe" value={fileUrl} onChange={setFileUrl} folder="informations" />
            {!editingId && (
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="send-notif" checked={sendNotif} onCheckedChange={(v) => setSendNotif(!!v)} />
                  <Label htmlFor="send-notif" className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <Bell className="w-3.5 h-3.5 text-info" /> Envoyer aussi en notification
                  </Label>
                </div>
                {sendNotif && (role === "gestionnaire" || (role as string) === "proprietaire") && (
                  <Select value={notifScope} onValueChange={(v) => setNotifScope(v as any)}>
                    <SelectTrigger className="bg-secondary/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="centre">Mon centre</SelectItem>
                      <SelectItem value="global">Tous les centres</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1 rounded-xl">Annuler</Button>
              <Button onClick={submit} className="flex-1 bg-gradient-to-r from-info to-teal hover:opacity-90 rounded-xl font-display">
                <Send className="w-4 h-4 mr-1" /> {editingId ? "Modifier" : "Publier"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {published.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune information</p>}
          {published.map((info, i) => (
            <div key={info.id} className={`glass-card rounded-2xl p-4 animate-fade-up ${info.priority === "urgent" ? "border border-destructive/30" : ""}`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {info.priority === "urgent" ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Megaphone className="w-4 h-4 text-info" />}
                  <h3 className="text-sm font-display font-semibold">{info.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={`${priorityColors[info.priority]} text-[10px] border`}>{info.priority}</Badge>
                  {canManage && (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(info)}><Edit className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteInfo(info.id)}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{info.content}</p>
              {info.file_url && <a href={info.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline mt-1 block"><Paperclip className="w-3 h-3 inline" /> Pièce jointe</a>}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(info.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
