import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToXLSX } from "@/lib/exportTable";
import { Search, Download, Eye, Edit, Link as LinkIcon, RefreshCw, Copy, FileSpreadsheet, FileText } from "lucide-react";

interface Boutique {
  id: string;
  name: string;
  centre_id: string | null;
}
interface Contact {
  id?: string;
  boutique_group_id: string;
  centre_id: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_tel_fixe: string | null;
  responsable_tel_mobile: string | null;
  responsable_email: string | null;
  adjoint_nom: string | null;
  adjoint_prenom: string | null;
  adjoint_tel_fixe: string | null;
  adjoint_tel_mobile: string | null;
  adjoint_email: string | null;
  site_internet: string | null;
  numero_local: string | null;
  telephone_boutique: string | null;
  notes: string | null;
}
interface TokenRow {
  boutique_group_id: string;
  token: string;
  is_active: boolean;
  last_used_at: string | null;
}

export default function AnnuaireTab() {
  const { toast } = useToast();
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [tokens, setTokens] = useState<Record<string, TokenRow>>({});
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Contact | null>(null);

  const load = async () => {
    const [{ data: bg }, { data: cs }, { data: tk }] = await Promise.all([
      supabase.from("boutique_groups").select("id, name, centre_id").order("name"),
      supabase.from("boutique_contacts").select("*"),
      supabase.from("boutique_update_tokens").select("boutique_group_id, token, is_active, last_used_at"),
    ]);
    setBoutiques((bg as any) ?? []);
    const cmap: Record<string, Contact> = {};
    (cs as any[] ?? []).forEach(c => { cmap[c.boutique_group_id] = c; });
    setContacts(cmap);
    const tmap: Record<string, TokenRow> = {};
    (tk as any[] ?? []).forEach(t => { tmap[t.boutique_group_id] = t; });
    setTokens(tmap);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    boutiques.filter(b => b.name.toLowerCase().includes(search.toLowerCase())), [boutiques, search]);

  const rowsForExport = () => filtered.map(b => {
    const c: any = contacts[b.id];
    return {
      Boutique: b.name,
      "N° local": c?.numero_local ?? "",
      "Tél. boutique": c?.telephone_boutique ?? "",
      "Site internet": c?.site_internet ?? "",
      "Responsable Nom": c?.responsable_nom ?? "",
      "Responsable Prénom": c?.responsable_prenom ?? "",
      "Resp. Fixe": c?.responsable_tel_fixe ?? "",
      "Resp. Mobile": c?.responsable_tel_mobile ?? "",
      "Resp. Email": c?.responsable_email ?? "",
      "Adjoint Nom": c?.adjoint_nom ?? "",
      "Adjoint Prénom": c?.adjoint_prenom ?? "",
      "Adj. Fixe": c?.adjoint_tel_fixe ?? "",
      "Adj. Mobile": c?.adjoint_tel_mobile ?? "",
      "Adj. Email": c?.adjoint_email ?? "",
      Notes: c?.notes ?? "",
    };
  });

  const startEdit = (b: Boutique) => {
    const c = contacts[b.id];
    setEditing(b.id);
    setForm({
      boutique_group_id: b.id,
      centre_id: b.centre_id,
      responsable_nom: c?.responsable_nom ?? "",
      responsable_prenom: c?.responsable_prenom ?? "",
      responsable_tel_fixe: c?.responsable_tel_fixe ?? "",
      responsable_tel_mobile: c?.responsable_tel_mobile ?? "",
      responsable_email: c?.responsable_email ?? "",
      adjoint_nom: c?.adjoint_nom ?? "",
      adjoint_prenom: c?.adjoint_prenom ?? "",
      adjoint_tel_fixe: c?.adjoint_tel_fixe ?? "",
      adjoint_tel_mobile: c?.adjoint_tel_mobile ?? "",
      adjoint_email: c?.adjoint_email ?? "",
      site_internet: (c as any)?.site_internet ?? "",
      numero_local: (c as any)?.numero_local ?? "",
      telephone_boutique: (c as any)?.telephone_boutique ?? "",
      notes: c?.notes ?? "",
    });
  };

  const save = async () => {
    if (!form) return;
    const existing = contacts[form.boutique_group_id];
    if (existing?.id) {
      const { error } = await supabase.from("boutique_contacts").update(form).eq("id", existing.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("boutique_contacts").insert(form);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Enregistré" });
    setEditing(null);
    setForm(null);
    load();
  };

  const ensureToken = async (b: Boutique) => {
    let t = tokens[b.id];
    if (!t) {
      const { data, error } = await supabase
        .from("boutique_update_tokens")
        .insert({ boutique_group_id: b.id, centre_id: b.centre_id })
        .select()
        .single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }
      t = data as any;
      setTokens(prev => ({ ...prev, [b.id]: t! }));
    }
    return t;
  };

  const copyLink = async (b: Boutique) => {
    const t = await ensureToken(b);
    if (!t) return;
    const url = `${window.location.origin}/annuaire/maj/${t.token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Lien copié", description: url });
  };

  const regenerate = async (b: Boutique) => {
    if (!confirm(`Régénérer le lien de ${b.name} ? L'ancien sera invalide.`)) return;
    await supabase.from("boutique_update_tokens").delete().eq("boutique_group_id", b.id);
    setTokens(prev => { const n = { ...prev }; delete n[b.id]; return n; });
    await ensureToken(b);
    toast({ title: "Lien régénéré" });
  };

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Rechercher une boutique..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={() => exportToCSV(rowsForExport(), "annuaire-boutiques")}>
          <FileText className="w-4 h-4 mr-1" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportToXLSX(rowsForExport(), "annuaire-boutiques", "Annuaire")}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> XLSX
        </Button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-2 font-display">Boutique</th>
                <th className="p-2 font-display">Responsable</th>
                <th className="p-2 font-display">Mobile</th>
                <th className="p-2 font-display">Adjoint</th>
                <th className="p-2 font-display">Mobile</th>
                <th className="p-2 font-display text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const c = contacts[b.id];
                return (
                  <tr key={b.id} className="border-t border-border/30 hover:bg-muted/10">
                    <td className="p-2 font-medium">{b.name}</td>
                    <td className="p-2">{[c?.responsable_prenom, c?.responsable_nom].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">{c?.responsable_tel_mobile || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">{[c?.adjoint_prenom, c?.adjoint_nom].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">{c?.adjoint_tel_mobile || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(b)} title="Modifier">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyLink(b)} title="Copier le lien de mise à jour">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => regenerate(b)} title="Régénérer le lien">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucune boutique</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={o => { if (!o) { setEditing(null); setForm(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fiche contact — {boutiques.find(b => b.id === editing)?.name}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 font-display text-sm text-primary">Boutique</div>
              <Field label="N° de local (ex: A12)" value={form.numero_local} onChange={v => setForm({ ...form, numero_local: v })} />
              <Field label="Téléphone boutique" value={form.telephone_boutique} onChange={v => setForm({ ...form, telephone_boutique: v })} />
              <Field label="Site internet" value={form.site_internet} onChange={v => setForm({ ...form, site_internet: v })} className="md:col-span-2" />

              <div className="md:col-span-2 font-display text-sm text-primary mt-2">Responsable</div>
              <Field label="Prénom" value={form.responsable_prenom} onChange={v => setForm({ ...form, responsable_prenom: v })} />
              <Field label="Nom" value={form.responsable_nom} onChange={v => setForm({ ...form, responsable_nom: v })} />
              <Field label="Téléphone fixe" value={form.responsable_tel_fixe} onChange={v => setForm({ ...form, responsable_tel_fixe: v })} />
              <Field label="Téléphone mobile" value={form.responsable_tel_mobile} onChange={v => setForm({ ...form, responsable_tel_mobile: v })} />
              <Field label="Email" value={form.responsable_email} onChange={v => setForm({ ...form, responsable_email: v })} className="md:col-span-2" />

              <div className="md:col-span-2 font-display text-sm text-primary mt-2">Adjoint</div>
              <Field label="Prénom" value={form.adjoint_prenom} onChange={v => setForm({ ...form, adjoint_prenom: v })} />
              <Field label="Nom" value={form.adjoint_nom} onChange={v => setForm({ ...form, adjoint_nom: v })} />
              <Field label="Téléphone fixe" value={form.adjoint_tel_fixe} onChange={v => setForm({ ...form, adjoint_tel_fixe: v })} />
              <Field label="Téléphone mobile" value={form.adjoint_tel_mobile} onChange={v => setForm({ ...form, adjoint_tel_mobile: v })} />
              <Field label="Email" value={form.adjoint_email} onChange={v => setForm({ ...form, adjoint_email: v })} className="md:col-span-2" />

              <div className="md:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setForm(null); }}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string | null; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input value={value ?? ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
