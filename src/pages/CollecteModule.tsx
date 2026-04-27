import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Store, ArrowUpRight, ArrowDownRight, Search, Star, Archive, ChevronDown, ChevronUp, BarChart3, Bell, Upload, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCentre } from "@/contexts/CentreContext";
import CARemindersTab from "@/components/admin/CARemindersTab";
import ExcelImportTab from "@/components/admin/ExcelImportTab";
import KPIDashboardTab from "@/components/admin/KPIDashboardTab";

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`cursor-pointer transition-all ${s <= value ? "text-orange" : "text-muted-foreground/30"}`}>
            <Star className={`w-6 h-6 ${s <= value ? "fill-orange" : ""}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CollecteModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const [caHT, setCaHT] = useState("");
  const [objectif, setObjectif] = useState("");
  const [transformation, setTransformation] = useState("");
  const [panier, setPanier] = useState("");
  const [satActivite, setSatActivite] = useState(0);
  const [satFrequentation, setSatFrequentation] = useState(0);
  const [satReseau, setSatReseau] = useState(0);
  const [mois, setMois] = useState(getCurrentMonth());
  const [submitted, setSubmitted] = useState(false);
  const [allCA, setAllCA] = useState<any[]>([]);
  const [searchCommerçant, setSearchCommerçant] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [boutiqueGroups, setBoutiqueGroups] = useState<any[]>([]);
  const [eventsByBoutique, setEventsByBoutique] = useState<Record<string, any[]>>({});
  const [adminTab, setAdminTab] = useState<"saisies" | "kpi" | "rappels" | "import">("saisies");
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const fetchCA = async () => {
    // Pagination pour dépasser la limite de 1000 lignes
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("ca_collecte")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setAllCA(all);
    const { data: bg } = await supabase.from("boutique_groups").select("id, name");
    if (bg) setBoutiqueGroups(bg);
  };

  const toggleExpand = async (boutiqueName: string) => {
    if (expanded === boutiqueName) { setExpanded(null); return; }
    setExpanded(boutiqueName);
    if (!eventsByBoutique[boutiqueName]) {
      const group = boutiqueGroups.find((g: any) => g.name?.toLowerCase() === boutiqueName.toLowerCase());
      if (group) {
        const { data } = await supabase
          .from("boutique_events").select("*")
          .eq("boutique_group_id", group.id)
          .order("created_at", { ascending: false });
        setEventsByBoutique(prev => ({ ...prev, [boutiqueName]: data ?? [] }));
      } else {
        setEventsByBoutique(prev => ({ ...prev, [boutiqueName]: [] }));
      }
    }
  };

  useEffect(() => { fetchCA(); }, []);

  const submitCA = async () => {
    if (!caHT || !mois) { toast({ title: "Champs requis", description: "Remplissez le CA et le mois.", variant: "destructive" }); return; }
    const { error } = await supabase.from("ca_collecte").insert({
      user_id: user!.id,
      commerçant_name: user?.commerçant ?? user?.name,
      ca_ht: parseFloat(caHT),
      objectif: objectif ? parseFloat(objectif) : 0,
      taux_transformation: transformation ? parseFloat(transformation) : null,
      panier_moyen: panier ? parseFloat(panier) : null,
      satisfaction_activite: satActivite || null,
      satisfaction_frequentation: satFrequentation || null,
      satisfaction_reseau: satReseau || null,
      mois,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true);
    toast({ title: "CA enregistré !" });
  };

  if (role === "gestionnaire" || role === "coordinateur" || role === "proprietaire") {
    const currentMonth = getCurrentMonth();
    const currentYear = currentMonth.slice(0, 4);
    const filteredAllCA = selectedCentreId ? allCA.filter(r => r.centre_id === selectedCentreId) : allCA;
    // CA cumulé sur l'année en cours uniquement
    const caYear = filteredAllCA.filter(r => (r.mois ?? "").startsWith(currentYear));
    const totalCA = caYear.reduce((s, r) => s + Number(r.ca_ht), 0);
    const monthsWithData = new Set(caYear.map(r => r.mois)).size;
    const fmtK = (n: number) => {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
      if (n >= 1_000) return `${Math.round(n / 1_000)}K€`;
      return `${Math.round(n)}€`;
    };
    const byCommerçant: Record<string, { ca: number; objectif: number; count: number; satActivite: number[]; satFrequentation: number[]; satReseau: number[]; months: Set<string> }> = {};
    filteredAllCA.forEach(r => {
      const b = r.boutique_name ?? "Inconnu";
      if (!byCommerçant[b]) byCommerçant[b] = { ca: 0, objectif: 0, count: 0, satActivite: [], satFrequentation: [], satReseau: [], months: new Set() };
      byCommerçant[b].ca += Number(r.ca_ht);
      byCommerçant[b].objectif += Number(r.objectif ?? 0);
      byCommerçant[b].count++;
      if (r.satisfaction_activite) byCommerçant[b].satActivite.push(r.satisfaction_activite);
      if (r.satisfaction_frequentation) byCommerçant[b].satFrequentation.push(r.satisfaction_frequentation);
      if (r.satisfaction_reseau) byCommerçant[b].satReseau.push(r.satisfaction_reseau);
      byCommerçant[b].months.add(r.mois);
    });
    const filteredCommerçants = Object.entries(byCommerçant).filter(([name]) => name.toLowerCase().includes(searchCommerçant.toLowerCase()));
    const totalCommerçants = Object.keys(byCommerçant).length;
    const commerçantsCurrentMonth = Object.values(byCommerçant).filter(b => b.months.has(currentMonth)).length;
    const remaining = totalCommerçants - commerçantsCurrentMonth;
    const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—";

    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-success/10 blur-[100px]" />
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
          <div className="flex items-center gap-2 animate-fade-up"><TrendingUp className="w-5 h-5 text-success" /><h2 className="text-lg font-bold font-display">Collecte CA — Administration</h2></div>

          {/* Onglets admin */}
          <div className="flex gap-1 animate-fade-up flex-wrap">
            <button onClick={() => setAdminTab("saisies")} className={`px-3 py-1.5 rounded-xl text-xs font-display flex items-center gap-1 transition-all ${adminTab === "saisies" ? "glass border-success/30 text-success" : "glass-subtle text-muted-foreground"}`}><BarChart3 className="w-3 h-3" /> Saisies</button>
            <button onClick={() => setAdminTab("kpi")} className={`px-3 py-1.5 rounded-xl text-xs font-display flex items-center gap-1 transition-all ${adminTab === "kpi" ? "glass border-orange/30 text-orange" : "glass-subtle text-muted-foreground"}`}><PieChart className="w-3 h-3" /> KPIs</button>
            <button onClick={() => setAdminTab("rappels")} className={`px-3 py-1.5 rounded-xl text-xs font-display flex items-center gap-1 transition-all ${adminTab === "rappels" ? "glass border-info/30 text-info" : "glass-subtle text-muted-foreground"}`}><Bell className="w-3 h-3" /> Rappels</button>
            <button onClick={() => setAdminTab("import")} className={`px-3 py-1.5 rounded-xl text-xs font-display flex items-center gap-1 transition-all ${adminTab === "import" ? "glass border-violet/30 text-violet" : "glass-subtle text-muted-foreground"}`}><Upload className="w-3 h-3" /> Import</button>
          </div>

          {adminTab === "kpi" && <KPIDashboardTab />}
          {adminTab === "rappels" && <CARemindersTab />}
          {adminTab === "import" && <ExcelImportTab />}

          {adminTab === "saisies" && <>
          <div className="grid grid-cols-2 gap-3 animate-fade-up">
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-success">{totalCA > 0 ? fmtK(totalCA) : "—"}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA cumulé {currentYear}{monthsWithData > 0 ? ` (${monthsWithData} mois)` : ""}</p></div>
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-info">{filteredAllCA.length}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saisies</p></div>
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-violet">{totalCommerçants}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Commerçants</p></div>
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-orange">{remaining}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restantes ce mois</p></div>
          </div>
          <div className="relative animate-fade-up"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={searchCommerçant} onChange={e => setSearchCommerçant(e.target.value)} className="pl-10 glass border-border/30" /></div></>}
          {adminTab === "saisies" && (
          <div className="space-y-2 animate-fade-up">
            {filteredCommerçants.map(([name, data], i) => {
              const ecart = data.objectif > 0 ? ((data.ca - data.objectif) / data.objectif * 100).toFixed(0) : null;
              const isOpen = expanded === name;
              const events = eventsByBoutique[name] ?? [];
              return (
                <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
                  <button onClick={() => toggleExpand(name)} className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-teal/20 flex items-center justify-center"><Store className="w-5 h-5 text-success" /></div>
                        <div>
                          <p className="text-sm font-medium font-display flex items-center gap-1">{name} {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}</p>
                          <p className="text-xs text-muted-foreground">{data.count} saisie(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-display">{fmtK(data.ca)}</p>
                        {data.objectif === 0 ? (
                          <span className="text-xs text-muted-foreground">NC</span>
                        ) : ecart ? (
                          <span className={`text-xs font-medium flex items-center gap-0.5 justify-end ${Number(ecart) >= 0 ? "text-success" : "text-destructive"}`}>
                            {Number(ecart) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{ecart}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-3 pt-1 border-t border-border/20">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 text-orange fill-orange" /> Activité: <span className="font-medium text-foreground">{avg(data.satActivite)}</span></div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 text-orange fill-orange" /> Fréq.: <span className="font-medium text-foreground">{avg(data.satFrequentation)}</span></div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 text-orange fill-orange" /> Réseau: <span className="font-medium text-foreground">{avg(data.satReseau)}</span></div>
                  </div>
                  {isOpen && (
                    <div className="pt-2 border-t border-border/20 space-y-2">
                      <div className="flex items-center gap-1 text-xs"><Archive className="w-3 h-3 text-primary" /><span className="font-display font-medium">Boîte Noire ({events.length})</span></div>
                      {events.length === 0 && <p className="text-[11px] text-muted-foreground">Aucun événement</p>}
                      {events.map((e: any) => (
                        <div key={e.id} className="glass-subtle rounded-lg p-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{e.event_label}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                          </div>
                          {e.comment && <p className="text-[11px] mt-1">{e.comment}</p>}
                          {e.created_by_name && <p className="text-[10px] text-muted-foreground">par {e.created_by_name}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col">
        <AppHeader onBack={onBack} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 space-y-4 animate-scale-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass glow-primary"><CheckCircle className="w-10 h-10 text-success" /></div>
            <h3 className="text-lg font-bold font-display">CA enregistré !</h3>
            <Button onClick={() => { setSubmitted(false); setCaHT(""); setObjectif(""); setMois(getCurrentMonth()); setSatActivite(0); setSatFrequentation(0); setSatReseau(0); }} className="bg-gradient-to-r from-success to-teal hover:opacity-90 font-display">Nouvelle saisie</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-success/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
        <div className="flex items-center gap-2 animate-fade-up"><TrendingUp className="w-5 h-5 text-success" /><h2 className="text-lg font-bold font-display">Collecte CA</h2></div>
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
          <div className="p-4 pb-2"><h3 className="text-base font-display font-semibold">Saisie mensuelle</h3></div>
          <div className="p-4 pt-2 space-y-3">
            <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Mois</Label><Input type="month" value={mois} onChange={e => setMois(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">CA HT (€)</Label><Input type="number" value={caHT} onChange={e => setCaHT(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Objectif (€) — 0 = NC</Label><Input type="number" value={objectif} onChange={e => setObjectif(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Taux transfo. (%)</Label><Input type="number" value={transformation} onChange={e => setTransformation(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Panier moyen (€)</Label><Input type="number" value={panier} onChange={e => setPanier(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
            </div>

            <div className="border-t border-border/30 pt-3">
              <p className="text-sm font-display font-medium mb-3">Comment avez-vous perçu le mois ?</p>
              <div className="space-y-3">
                <StarRating value={satActivite} onChange={setSatActivite} label="Activité" />
                <StarRating value={satFrequentation} onChange={setSatFrequentation} label="Fréquentation" />
                <StarRating value={satReseau} onChange={setSatReseau} label="vs Réseau" />
              </div>
            </div>

            <Button className="w-full h-11 bg-gradient-to-r from-success to-teal hover:opacity-90 rounded-xl font-display" onClick={submitCA}>Enregistrer</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
