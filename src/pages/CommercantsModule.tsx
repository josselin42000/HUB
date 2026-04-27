import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Store, ChevronLeft, Phone, Mail, Globe, MapPin, Edit, Trash2,
  Archive, History as HistoryIcon, TrendingUp, StickyNote, AlertTriangle,
  Construction, MessageSquare, DoorClosed, ClipboardList, Coffee, Wrench, AlertCircle,
} from "lucide-react";
import { isAdminRole } from "@/lib/permissions";
import { useCentre } from "@/contexts/CentreContext";

const EVT_ICONS: Record<string, any> = { DoorClosed, ClipboardList, MessageSquare, AlertCircle, Wrench, Coffee, Archive };
const EVT_COLOR: Record<string, string> = {
  orange: "from-orange to-[hsl(20,90%,50%)]",
  info: "from-info to-primary",
  violet: "from-violet to-primary",
  teal: "from-teal to-info",
  primary: "from-primary to-violet",
  destructive: "from-destructive to-[hsl(0,70%,40%)]",
};

interface Boutique {
  id: string;
  name: string;
  centre_id: string | null;
  loyer: number | null;
  surface: number | null;
  date_ouverture: string | null;
  date_fermeture: string | null;
  contact?: any;
}

export default function CommercantsModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();
  const role = user?.role ?? "commerçant";
  const isAdmin = isAdminRole(role);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);

  // selected detail data
  const [events, setEvents] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [signalements, setSignalements] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [caRows, setCaRows] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [pendingType, setPendingType] = useState<any>(null);
  const [eventComment, setEventComment] = useState("");
  const [editContact, setEditContact] = useState(false);
  const [contactForm, setContactForm] = useState<any>(null);

  const fetchAll = async () => {
    let bgq = supabase.from("boutique_groups").select("id, name, centre_id, loyer, surface, date_ouverture, date_fermeture").order("name");
    if (selectedCentreId) bgq = bgq.eq("centre_id", selectedCentreId);
    const [bg, cs] = await Promise.all([
      bgq,
      supabase.from("boutique_contacts").select("*"),
    ]);
    const cmap: Record<string, any> = {};
    (cs.data ?? []).forEach((c: any) => { cmap[c.boutique_group_id] = c; });
    setBoutiques(((bg.data as any[]) ?? []).map(b => ({ ...b, contact: cmap[b.id] })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [selectedCentreId]);

  const fetchSelectedDetails = async (b: Boutique) => {
    const [ev, types, sos, sig, nt, ca] = await Promise.all([
      supabase.from("boutique_events").select("*").eq("boutique_group_id", b.id).order("created_at", { ascending: false }),
      supabase.from("boutique_event_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("sos_alerts").select("*").eq("boutique_name", b.name).order("created_at", { ascending: false }).limit(50),
      supabase.from("signalements").select("*").eq("boutique_name", b.name).order("created_at", { ascending: false }).limit(50),
      supabase.from("boutique_notes" as any).select("*").eq("boutique_group_id", b.id).order("created_at", { ascending: false }),
      supabase.from("ca_collecte").select("*").eq("boutique_name", b.name).order("mois", { ascending: false }),
    ]);
    setEvents(ev.data ?? []);
    setEventTypes(types.data ?? []);
    setSosAlerts(sos.data ?? []);
    setSignalements(sig.data ?? []);
    setNotes(nt.data ?? []);
    setCaRows(ca.data ?? []);
  };

  useEffect(() => { if (selected) fetchSelectedDetails(selected); }, [selected]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return boutiques;
    return boutiques.filter(b => b.name.toLowerCase().includes(q));
  }, [boutiques, search]);

  const submitEvent = async (withComment: boolean) => {
    if (!pendingType || !selected || !user) return;
    const { error } = await supabase.from("boutique_events").insert({
      boutique_group_id: selected.id,
      centre_id: selected.centre_id,
      event_type: pendingType.type_key,
      event_label: pendingType.label,
      comment: withComment ? (eventComment.trim() || null) : null,
      created_by: user.id,
      created_by_name: user.name ?? null,
    } as any);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "Événement enregistré" });
    setPendingType(null); setEventComment("");
    fetchSelectedDetails(selected);
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("boutique_events").delete().eq("id", id);
    if (selected) fetchSelectedDetails(selected);
  };

  const addNote = async () => {
    if (!newNote.trim() || !selected || !user) return;
    const { error } = await supabase.from("boutique_notes" as any).insert({
      boutique_group_id: selected.id,
      centre_id: selected.centre_id,
      content: newNote.trim(),
      author_id: user.id,
      author_name: user.name ?? user.email,
    } as any);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setNewNote("");
    toast({ title: "Note ajoutée" });
    fetchSelectedDetails(selected);
  };

  const deleteNote = async (id: string) => {
    await supabase.from("boutique_notes" as any).delete().eq("id", id);
    if (selected) fetchSelectedDetails(selected);
  };

  const openContactEdit = () => {
    if (!selected) return;
    const c = selected.contact ?? {};
    setContactForm({
      boutique_group_id: selected.id,
      centre_id: selected.centre_id,
      responsable_nom: c.responsable_nom ?? "", responsable_prenom: c.responsable_prenom ?? "",
      responsable_tel_fixe: c.responsable_tel_fixe ?? "", responsable_tel_mobile: c.responsable_tel_mobile ?? "",
      responsable_email: c.responsable_email ?? "",
      adjoint_nom: c.adjoint_nom ?? "", adjoint_prenom: c.adjoint_prenom ?? "",
      adjoint_tel_fixe: c.adjoint_tel_fixe ?? "", adjoint_tel_mobile: c.adjoint_tel_mobile ?? "",
      adjoint_email: c.adjoint_email ?? "",
      site_internet: c.site_internet ?? "", numero_local: c.numero_local ?? "",
      telephone_boutique: c.telephone_boutique ?? "", notes: c.notes ?? "",
    });
    setEditContact(true);
  };

  const saveContact = async () => {
    if (!contactForm || !selected) return;
    const existing = selected.contact;
    const op = existing?.id
      ? supabase.from("boutique_contacts").update(contactForm).eq("id", existing.id)
      : supabase.from("boutique_contacts").insert(contactForm);
    const { error } = await op;
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "Fiche enregistrée" });
    setEditContact(false);
    fetchAll();
    fetchSelectedDetails(selected);
  };

  // ====== List view ======
  if (!selected) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3 pb-8">
          <div className="flex items-center gap-2 animate-fade-up">
            <Store className="w-5 h-5 text-violet" />
            <h2 className="text-lg font-bold font-display">Commerçants</h2>
          </div>
          <div className="relative animate-fade-up">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher une boutique..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" />
          </div>
          {loading ? (
            <p className="text-center text-muted-foreground py-10">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Aucune boutique</p>
          ) : (
            <div className="space-y-2 animate-fade-up">
              {filtered.map(b => {
                const c = b.contact ?? {};
                return (
                  <button key={b.id} onClick={() => setSelected(b)}
                    className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:ring-1 hover:ring-primary/30 transition-all text-left">
                    <Store className="w-4 h-4 text-violet shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold">{b.name}</p>
                      <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                        {c.numero_local && <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{c.numero_local}</span>}
                        {c.telephone_boutique && <span className="inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.telephone_boutique}</span>}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ====== Detail view ======
  const c = selected.contact ?? {};
  const resp = [c.responsable_prenom, c.responsable_nom].filter(Boolean).join(" ");
  const adj = [c.adjoint_prenom, c.adjoint_nom].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-primary/10 blur-[100px]" />
      <AppHeader onBack={() => setSelected(null)} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3 pb-8">
        <div className="flex items-center gap-2 animate-fade-up">
          <Store className="w-5 h-5 text-violet" />
          <h2 className="text-lg font-bold font-display flex-1">{selected.name}</h2>
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={openContactEdit}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Contact / infos */}
        <CollapsibleSection title="Coordonnées & contacts" icon={Phone} defaultOpen>
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              {c.numero_local && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.numero_local}</span>}
              {c.telephone_boutique && <a href={`tel:${c.telephone_boutique}`} className="inline-flex items-center gap-1 text-primary"><Phone className="w-3 h-3" />{c.telephone_boutique}</a>}
              {c.site_internet && <a href={c.site_internet.startsWith("http") ? c.site_internet : `https://${c.site_internet}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary"><Globe className="w-3 h-3" />{c.site_internet}</a>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {resp && (
                <div className="glass-subtle rounded-xl p-2">
                  <div className="font-display text-[10px] text-primary uppercase">Responsable</div>
                  <div className="font-medium">{resp}</div>
                  {c.responsable_tel_mobile && <a href={`tel:${c.responsable_tel_mobile}`} className="inline-flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{c.responsable_tel_mobile}</a>}
                  {c.responsable_email && <a href={`mailto:${c.responsable_email}`} className="block text-muted-foreground inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.responsable_email}</a>}
                </div>
              )}
              {adj && (
                <div className="glass-subtle rounded-xl p-2">
                  <div className="font-display text-[10px] text-violet uppercase">Adjoint</div>
                  <div className="font-medium">{adj}</div>
                  {c.adjoint_tel_mobile && <a href={`tel:${c.adjoint_tel_mobile}`} className="inline-flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{c.adjoint_tel_mobile}</a>}
                  {c.adjoint_email && <a href={`mailto:${c.adjoint_email}`} className="block text-muted-foreground inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.adjoint_email}</a>}
                </div>
              )}
              {!resp && !adj && <p className="text-muted-foreground italic">Aucun contact renseigné</p>}
            </div>
            {(selected.loyer || selected.surface || selected.date_ouverture || selected.date_fermeture) && (
              <div className="flex gap-2 text-[11px] text-muted-foreground pt-1 flex-wrap">
                {selected.surface && <span>Surface : {selected.surface} m²</span>}
                {selected.loyer && <span>• Loyer/an : {selected.loyer} €</span>}
                {selected.date_ouverture && <span>• Ouverture : {new Date(selected.date_ouverture).toLocaleDateString("fr-FR")}</span>}
                {selected.date_fermeture && <span>• Fermeture : {new Date(selected.date_fermeture).toLocaleDateString("fr-FR")}</span>}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Boîte Noire — événements */}
        {isAdmin && (
          <CollapsibleSection title="Événements (Boîte Noire)" icon={Archive} badge={events.length || undefined}>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-display">Signaler :</p>
                <div className="grid grid-cols-3 gap-2">
                  {eventTypes.map(t => {
                    const Icon = EVT_ICONS[t.icon ?? "Archive"] ?? Archive;
                    const grad = EVT_COLOR[t.color ?? "primary"] ?? EVT_COLOR.primary;
                    return (
                      <button key={t.id} onClick={() => { setPendingType(t); setEventComment(""); }}
                        className={`rounded-xl p-2 bg-gradient-to-br ${grad} text-white flex flex-col items-center gap-1 shadow hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-display text-center leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                {events.length === 0 && <p className="text-center text-[11px] text-muted-foreground py-3">Aucun événement</p>}
                {events.map(e => (
                  <div key={e.id} className="glass-subtle rounded-xl p-2 flex items-start gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{e.event_label}</Badge>
                        <span className="text-[9px] text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      {e.comment && <p className="text-[11px] mt-0.5">{e.comment}</p>}
                      {e.created_by_name && <p className="text-[9px] text-muted-foreground">par {e.created_by_name}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteEvent(e.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Historique SOS */}
        {isAdmin && (
          <CollapsibleSection title="Historique alertes SOS" icon={AlertTriangle} badge={sosAlerts.length || undefined}>
            {sosAlerts.length === 0 ? <p className="text-[11px] text-muted-foreground">Aucune alerte</p> : (
              <div className="space-y-1">
                {sosAlerts.map(a => (
                  <div key={a.id} className="glass-subtle rounded-lg p-2 text-xs flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{a.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    {a.description && <span className="truncate">{a.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Historique signalements */}
        {isAdmin && (
          <CollapsibleSection title="Historique signalements" icon={Construction} badge={signalements.length || undefined}>
            {signalements.length === 0 ? <p className="text-[11px] text-muted-foreground">Aucun signalement</p> : (
              <div className="space-y-1">
                {signalements.map(s => (
                  <div key={s.id} className="glass-subtle rounded-lg p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{s.category}</Badge>
                      <Badge variant="outline" className="text-[9px]">{s.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="mt-0.5 truncate">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* CA */}
        {isAdmin && (
          <CollapsibleSection title="Chiffre d'affaires" icon={TrendingUp} badge={caRows.length || undefined}>
            {caRows.length === 0 ? <p className="text-[11px] text-muted-foreground">Aucune saisie CA</p> : (
              <div className="space-y-1">
                {caRows.map(r => (
                  <div key={r.id} className="glass-subtle rounded-lg p-2 text-xs flex items-center justify-between">
                    <span className="font-display">{r.mois}</span>
                    <span className="font-bold">{Number(r.ca_ht).toLocaleString("fr-FR")} € HT</span>
                    {r.objectif && <span className="text-muted-foreground text-[10px]">obj. {Number(r.objectif).toLocaleString("fr-FR")} €</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Notes signées */}
        {isAdmin && (
          <CollapsibleSection title="Notes signées" icon={StickyNote} badge={notes.length || undefined} defaultOpen={notes.length > 0}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Ajouter une note…" className="min-h-16 text-xs" />
                <Button onClick={addNote} disabled={!newNote.trim()} size="sm">Ajouter</Button>
              </div>
              {notes.map(n => (
                <div key={n.id} className="glass-subtle rounded-xl p-2 text-xs">
                  <p>{n.content}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>— {n.author_name ?? "?"} • {new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    {(user?.id === n.author_id || isAdmin) && (
                      <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => deleteNote(n.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </main>

      {/* Event comment dialog */}
      <Dialog open={!!pendingType} onOpenChange={o => !o && setPendingType(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{pendingType?.label}</DialogTitle></DialogHeader>
          <Textarea value={eventComment} onChange={e => setEventComment(e.target.value)} placeholder="Commentaire (facultatif)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => submitEvent(false)}>Sans commentaire</Button>
            <Button onClick={() => submitEvent(true)}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact edit dialog */}
      <Dialog open={editContact} onOpenChange={setEditContact}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Coordonnées — {selected.name}</DialogTitle></DialogHeader>
          {contactForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 font-display text-sm text-primary">Boutique</div>
              <Field label="N° de local" value={contactForm.numero_local} onChange={v => setContactForm({ ...contactForm, numero_local: v })} />
              <Field label="Téléphone boutique" value={contactForm.telephone_boutique} onChange={v => setContactForm({ ...contactForm, telephone_boutique: v })} />
              <Field label="Site internet" value={contactForm.site_internet} onChange={v => setContactForm({ ...contactForm, site_internet: v })} className="md:col-span-2" />

              <div className="md:col-span-2 font-display text-sm text-primary mt-2">Responsable</div>
              <Field label="Prénom" value={contactForm.responsable_prenom} onChange={v => setContactForm({ ...contactForm, responsable_prenom: v })} />
              <Field label="Nom" value={contactForm.responsable_nom} onChange={v => setContactForm({ ...contactForm, responsable_nom: v })} />
              <Field label="Téléphone fixe" value={contactForm.responsable_tel_fixe} onChange={v => setContactForm({ ...contactForm, responsable_tel_fixe: v })} />
              <Field label="Téléphone mobile" value={contactForm.responsable_tel_mobile} onChange={v => setContactForm({ ...contactForm, responsable_tel_mobile: v })} />
              <Field label="Email" value={contactForm.responsable_email} onChange={v => setContactForm({ ...contactForm, responsable_email: v })} className="md:col-span-2" />

              <div className="md:col-span-2 font-display text-sm text-primary mt-2">Adjoint</div>
              <Field label="Prénom" value={contactForm.adjoint_prenom} onChange={v => setContactForm({ ...contactForm, adjoint_prenom: v })} />
              <Field label="Nom" value={contactForm.adjoint_nom} onChange={v => setContactForm({ ...contactForm, adjoint_nom: v })} />
              <Field label="Téléphone fixe" value={contactForm.adjoint_tel_fixe} onChange={v => setContactForm({ ...contactForm, adjoint_tel_fixe: v })} />
              <Field label="Téléphone mobile" value={contactForm.adjoint_tel_mobile} onChange={v => setContactForm({ ...contactForm, adjoint_tel_mobile: v })} />
              <Field label="Email" value={contactForm.adjoint_email} onChange={v => setContactForm({ ...contactForm, adjoint_email: v })} className="md:col-span-2" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditContact(false)}>Annuler</Button>
            <Button onClick={saveContact}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
