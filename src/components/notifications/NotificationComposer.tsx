import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendPush } from "@/lib/sendPush";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Megaphone } from "lucide-react";
import { isAdminRole, isProprietaire } from "@/lib/permissions";

type Scope = "boutique" | "secteur" | "centre" | "global";

export default function NotificationComposer({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role ?? "commerçant";
  const canSend = isAdminRole(role) || role === "securite";
  const isGlobal = isProprietaire(role) || role === "gestionnaire";

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("info");
  const [scope, setScope] = useState<Scope>("centre");
  const [boutiques, setBoutiques] = useState<{ id: string; name: string; centre_id: string | null; secteur: string | null }[]>([]);
  const [centres, setCentres] = useState<{ id: string; name: string }[]>([]);
  const [secteurs, setSecteurs] = useState<string[]>([]);
  const [targetBoutique, setTargetBoutique] = useState<string>("");
  const [targetSecteur, setTargetSecteur] = useState<string>("");
  const [targetCentre, setTargetCentre] = useState<string>("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: bg }, { data: cs }] = await Promise.all([
        supabase.from("boutique_groups").select("id, name, centre_id, secteur").order("name"),
        isGlobal ? supabase.from("centres").select("id, name").order("name") : Promise.resolve({ data: [] } as any),
      ]);
      setBoutiques((bg as any) ?? []);
      setCentres((cs as any) ?? []);
      const sec = Array.from(new Set(((bg as any[]) ?? []).map(b => b.secteur).filter(Boolean))) as string[];
      setSecteurs(sec.sort());
    })();
  }, [open, isGlobal]);

  if (!canSend) return null;

  const reset = () => {
    setTitle(""); setBody(""); setLink(""); setType("info"); setScope("centre");
    setTargetBoutique(""); setTargetSecteur(""); setTargetCentre("");
  };

  const send = async () => {
    if (!user || !title.trim() || !body.trim()) {
      toast({ title: "Titre et message requis", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // Determine targets
      let userIds: string[] = [];
      let centreId: string | null = user.centreId ?? null;

      let q = supabase.from("profiles").select("user_id, centre_id, boutique_group_id");

      if (scope === "boutique") {
        if (!targetBoutique) throw new Error("Sélectionne une boutique");
        const b = boutiques.find(x => x.id === targetBoutique);
        centreId = b?.centre_id ?? centreId;
        const { data } = await q.eq("boutique_group_id", targetBoutique);
        userIds = ((data as any[]) ?? []).map(p => p.user_id);
      } else if (scope === "secteur") {
        if (!targetSecteur) throw new Error("Sélectionne un secteur");
        const ids = boutiques.filter(b => b.secteur === targetSecteur && (isGlobal || b.centre_id === user.centreId)).map(b => b.id);
        if (ids.length === 0) throw new Error("Aucune boutique dans ce secteur");
        const { data } = await q.in("boutique_group_id", ids);
        userIds = ((data as any[]) ?? []).map(p => p.user_id);
      } else if (scope === "centre") {
        const cid = isGlobal && targetCentre ? targetCentre : user.centreId;
        if (!cid) throw new Error("Aucun centre cible");
        centreId = cid;
        const { data } = await q.eq("centre_id", cid);
        userIds = ((data as any[]) ?? []).map(p => p.user_id);
      } else if (scope === "global") {
        if (!isGlobal) throw new Error("Réservé Foncière/Propriétaire");
        const { data } = await q;
        userIds = ((data as any[]) ?? []).map(p => p.user_id);
        centreId = null;
      }

      userIds = Array.from(new Set(userIds.filter(Boolean)));
      if (userIds.length === 0) throw new Error("Aucun destinataire trouvé");

      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          centre_id: centreId,
          created_by: user.id,
          created_by_name: user.name,
          title: title.trim(),
          body: body.trim(),
          link_url: link.trim() || null,
          notif_type: type,
          target_scope: scope,
          target_boutique_group_id: scope === "boutique" ? targetBoutique : null,
          target_secteur: scope === "secteur" ? targetSecteur : null,
          target_centre_id: scope === "centre" ? centreId : null,
        })
        .select()
        .single();
      if (error) throw error;

      const recipients = userIds.map(uid => ({ notification_id: (notif as any).id, user_id: uid }));
      const { error: rErr } = await supabase.from("notification_recipients").insert(recipients);
      if (rErr) throw rErr;

      sendPush({ user_ids: userIds, title: title.trim(), body: body.trim(), url: link.trim() || "/", notif_type: type });

      toast({ title: "Envoyée", description: `${userIds.length} destinataire(s)` });
      reset();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1">
            <Megaphone className="w-4 h-4" /> Notifier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Envoyer une notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Réunion mardi" maxLength={120} />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Détails..." rows={3} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="alerte">Alerte</SelectItem>
                  <SelectItem value="evenement">Événement</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cible</Label>
              <Select value={scope} onValueChange={v => setScope(v as Scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boutique">Une boutique</SelectItem>
                  <SelectItem value="secteur">Un secteur</SelectItem>
                  <SelectItem value="centre">Tout le centre</SelectItem>
                  {isGlobal && <SelectItem value="global">Global (tous)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === "boutique" && (
            <div>
              <Label className="text-xs">Boutique</Label>
              <Select value={targetBoutique} onValueChange={setTargetBoutique}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {boutiques.filter(b => isGlobal || b.centre_id === user?.centreId).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {scope === "secteur" && (
            <div>
              <Label className="text-xs">Secteur</Label>
              {secteurs.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-2">Aucun secteur défini sur les boutiques. Renseigne-les dans l'admin.</div>
              ) : (
                <Select value={targetSecteur} onValueChange={setTargetSecteur}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {secteurs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {scope === "centre" && isGlobal && (
            <div>
              <Label className="text-xs">Centre (vide = ton centre)</Label>
              <Select value={targetCentre} onValueChange={setTargetCentre}>
                <SelectTrigger><SelectValue placeholder="Mon centre" /></SelectTrigger>
                <SelectContent>
                  {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Lien (optionnel)</Label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={send} disabled={sending}>
            <Send className="w-4 h-4 mr-1" /> {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
