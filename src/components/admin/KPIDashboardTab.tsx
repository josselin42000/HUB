import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCentre } from "@/contexts/CentreContext";
import { Building2, TrendingUp, TrendingDown, Layers, Maximize, Store, Percent, ChevronDown, ChevronUp, Calendar, Trophy } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--violet))", "hsl(var(--orange))", "hsl(var(--teal))", "hsl(var(--destructive))"];

const fmtEur = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M€` : n >= 1000 ? `${(n / 1000).toFixed(1)}K€` : `${n.toFixed(0)}€`;
const fmtNum = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export default function KPIDashboardTab() {
  const { user } = useAuth();
  const { selectedCentreId } = useCentre();
  const isFonciere = user?.role === "gestionnaire" || user?.role === "proprietaire";
  const [view, setView] = useState<"centre" | "boutique">("centre");
  const [boutiquesAll, setBoutiquesAll] = useState<any[]>([]);
  const [caAll, setCaAll] = useState<any[]>([]);
  const [centres, setCentres] = useState<any[]>([]);
  const [centreId, setCentreId] = useState<string>("all");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [expandedBoutique, setExpandedBoutique] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: bg }, { data: cs }] = await Promise.all([
        supabase.from("boutique_groups").select("id, name, centre_id, surface, loyer, charges, secteur, date_ouverture"),
        supabase.from("centres").select("id, name").order("name"),
      ]);
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("ca_collecte")
          .select("boutique_name, mois, ca_ht, centre_id")
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setBoutiquesAll(bg ?? []);
      setCaAll(all);
      setCentres(cs ?? []);
      if (!isFonciere && user?.centreId) setCentreId(user.centreId);
    })();
  }, [isFonciere, user?.centreId]);

  // Sync avec le sélecteur global du header (uniquement pour foncière/proprio)
  useEffect(() => {
    if (isFonciere) setCentreId(selectedCentreId ?? "all");
  }, [selectedCentreId, isFonciere]);

  const boutiques = useMemo(() => centreId === "all" ? boutiquesAll : boutiquesAll.filter(b => b.centre_id === centreId), [boutiquesAll, centreId]);
  const ca = useMemo(() => centreId === "all" ? caAll : caAll.filter(r => r.centre_id === centreId), [caAll, centreId]);

  const years = useMemo(() => {
    const set = new Set<string>();
    ca.forEach(r => r.mois && set.add(r.mois.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [ca]);

  // Bascule automatiquement sur l'année la plus récente disponible
  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) setYear(years[0]);
  }, [years, year]);

  // Index boutiques par nom (normalisé)
  const boutiqueByName = useMemo(() => {
    const m: Record<string, any> = {};
    boutiques.forEach(b => { if (b.name) m[b.name.toLowerCase()] = b; });
    return m;
  }, [boutiques]);

  // CA agrégé par boutique pour l'année sélectionnée
  const caByBoutique = useMemo(() => {
    const m: Record<string, { total: number; byMois: Record<string, number> }> = {};
    ca.forEach(r => {
      if (!r.boutique_name || !r.mois?.startsWith(year)) return;
      const k = r.boutique_name;
      if (!m[k]) m[k] = { total: 0, byMois: {} };
      m[k].total += Number(r.ca_ht ?? 0);
      m[k].byMois[r.mois] = (m[k].byMois[r.mois] ?? 0) + Number(r.ca_ht ?? 0);
    });
    return m;
  }, [ca, year]);

  // KPIs Centre
  const centreKpis = useMemo(() => {
    const totalCA = Object.values(caByBoutique).reduce((s, b) => s + b.total, 0);
    const totalSurface = boutiques.reduce((s, b) => s + Number(b.surface ?? 0), 0);
    const nbBoutiques = boutiques.length;
    const nbBoutiquesAvecCA = Object.keys(caByBoutique).length;

    // Par mois (uniquement les mois qui existent dans les données)
    const byMois: Record<string, number> = {};
    Object.values(caByBoutique).forEach(b => {
      Object.entries(b.byMois).forEach(([m, v]) => { byMois[m] = (byMois[m] ?? 0) + v; });
    });
    const moisAvecData = Object.keys(byMois).sort();
    const monthlyData = moisAvecData.map(m => ({
      mois: new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleString("fr-FR", { month: "short" }),
      ca: byMois[m],
    }));
    const nbMois = moisAvecData.length;
    const caMoyenMensuel = nbMois > 0 ? totalCA / nbMois : 0;
    const lastMois = moisAvecData[moisAvecData.length - 1];
    const lastMoisCA = lastMois ? byMois[lastMois] : 0;
    const lastMoisLabel = lastMois ? new Date(+lastMois.slice(0, 4), +lastMois.slice(5, 7) - 1, 1).toLocaleString("fr-FR", { month: "long", year: "numeric" }) : "—";

    // Par secteur
    const bySecteur: Record<string, { ca: number; surface: number; nb: number }> = {};
    Object.entries(caByBoutique).forEach(([name, data]) => {
      const b = boutiqueByName[name.toLowerCase()];
      const sect = b?.secteur || "Non renseigné";
      if (!bySecteur[sect]) bySecteur[sect] = { ca: 0, surface: 0, nb: 0 };
      bySecteur[sect].ca += data.total;
      bySecteur[sect].surface += Number(b?.surface ?? 0);
      bySecteur[sect].nb += 1;
    });
    boutiques.forEach(b => {
      const sect = b.secteur || "Non renseigné";
      if (!bySecteur[sect]) bySecteur[sect] = { ca: 0, surface: Number(b.surface ?? 0), nb: 1 };
    });
    const secteurData = Object.entries(bySecteur).map(([name, v]) => ({
      name, ca: v.ca, surface: v.surface, nb: v.nb,
      caM2: v.surface > 0 ? v.ca / v.surface : 0,
    })).sort((a, b) => b.ca - a.ca);

    // Top/Flop boutiques vs N-1 (même période disponible)
    const prevYear = String(+year - 1);
    const moisDuYear = moisAvecData.map(m => m.slice(5, 7));
    const compare = boutiques.map(b => {
      const data = caByBoutique[b.name];
      if (!data) return null;
      const caN = Object.entries(data.byMois).filter(([m]) => m.startsWith(year) && moisDuYear.includes(m.slice(5, 7))).reduce((s, [, v]) => s + v, 0);
      // CA N-1 sur les mêmes mois disponibles cette année
      const allBoutiqueData: Record<string, number> = {};
      ca.forEach(r => {
        if (r.boutique_name === b.name && r.mois?.startsWith(prevYear) && moisDuYear.includes(r.mois.slice(5, 7))) {
          allBoutiqueData[r.mois] = (allBoutiqueData[r.mois] ?? 0) + Number(r.ca_ht ?? 0);
        }
      });
      const caN1 = Object.values(allBoutiqueData).reduce((s, v) => s + v, 0);
      if (caN1 === 0) return null;
      const evol = ((caN - caN1) / caN1) * 100;
      return { name: b.name, caN, caN1, evol };
    }).filter(Boolean) as Array<{ name: string; caN: number; caN1: number; evol: number }>;
    const top3 = [...compare].sort((a, b) => b.evol - a.evol).slice(0, 3);
    const flop3 = [...compare].sort((a, b) => a.evol - b.evol).slice(0, 3);

    return { totalCA, totalSurface, nbBoutiques, nbBoutiquesAvecCA, monthlyData, secteurData, nbMois, caMoyenMensuel, lastMoisCA, lastMoisLabel, top3, flop3 };
  }, [caByBoutique, boutiques, boutiqueByName, year, ca]);

  // KPIs Boutique (taux d'effort, vs secteur)
  const boutiqueKpis = useMemo(() => {
    // Moyennes secteur (CA/m²)
    const secteurStats: Record<string, { totalCA: number; totalSurface: number }> = {};
    boutiques.forEach(b => {
      const sect = b.secteur || "Non renseigné";
      if (!secteurStats[sect]) secteurStats[sect] = { totalCA: 0, totalSurface: 0 };
      const ca = caByBoutique[b.name]?.total ?? 0;
      secteurStats[sect].totalCA += ca;
      secteurStats[sect].totalSurface += Number(b.surface ?? 0);
    });
    const secteurAvgCAM2: Record<string, number> = {};
    Object.entries(secteurStats).forEach(([s, v]) => {
      secteurAvgCAM2[s] = v.totalSurface > 0 ? v.totalCA / v.totalSurface : 0;
    });

    return boutiques.map(b => {
      const ca = caByBoutique[b.name]?.total ?? 0;
      const surface = Number(b.surface ?? 0);
      const loyer = Number(b.loyer ?? 0);
      const charges = Number(b.charges ?? 0);
      const sect = b.secteur || "Non renseigné";
      const caM2 = surface > 0 ? ca / surface : 0;
      const tauxEffort = ca > 0 ? (loyer + charges) / ca * 100 : 0;
      const secteurAvg = secteurAvgCAM2[sect] ?? 0;
      const vsSecteur = secteurAvg > 0 ? ((caM2 - secteurAvg) / secteurAvg) * 100 : 0;
      return { ...b, ca, surface, loyer, charges, secteur: sect, caM2, tauxEffort, secteurAvg, vsSecteur };
    }).sort((a, b) => b.ca - a.ca);
  }, [boutiques, caByBoutique]);

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Sélecteurs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => setView("centre")} className={`px-3 py-1.5 rounded-xl text-xs font-display ${view === "centre" ? "glass border-success/30 text-success" : "glass-subtle text-muted-foreground"}`}>
            <Building2 className="w-3 h-3 inline mr-1" /> Centre
          </button>
          <button onClick={() => setView("boutique")} className={`px-3 py-1.5 rounded-xl text-xs font-display ${view === "boutique" ? "glass border-info/30 text-info" : "glass-subtle text-muted-foreground"}`}>
            <Store className="w-3 h-3 inline mr-1" /> Boutiques
          </button>
        </div>
        {isFonciere && centres.length > 1 && (
          <select value={centreId} onChange={e => setCentreId(e.target.value)} className="ml-auto glass-subtle rounded-xl px-2 py-1.5 text-xs border border-border/30">
            <option value="all">Tous les centres</option>
            {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={year} onChange={e => setYear(e.target.value)} className={`${isFonciere && centres.length > 1 ? "" : "ml-auto"} glass-subtle rounded-xl px-2 py-1.5 text-xs border border-border/30`}>
          {years.length === 0 && <option value={year}>{year}</option>}
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {view === "centre" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label={`CA cumulé ${year} (${centreKpis.nbMois} mois)`} value={fmtEur(centreKpis.totalCA)} color="success" />
            <KpiCard icon={<Calendar className="w-4 h-4" />} label={`Dernier mois (${centreKpis.lastMoisLabel})`} value={fmtEur(centreKpis.lastMoisCA)} color="teal" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="CA moyen / mois" value={fmtEur(centreKpis.caMoyenMensuel)} color="info" />
            <KpiCard icon={<Store className="w-4 h-4" />} label="Boutiques actives" value={`${centreKpis.nbBoutiquesAvecCA}/${centreKpis.nbBoutiques}`} color="violet" />
            <KpiCard icon={<Maximize className="w-4 h-4" />} label="Surface totale" value={`${fmtNum(centreKpis.totalSurface)} m²`} color="orange" />
            <KpiCard icon={<Percent className="w-4 h-4" />} label={`CA/m² ${year} cumulé`} value={centreKpis.totalSurface > 0 ? `${fmtNum(centreKpis.totalCA / centreKpis.totalSurface)} €/m²` : "—"} color="primary" />
          </div>

          <ChartCard title={`Évolution CA mensuel ${year} (${centreKpis.nbMois} mois saisis)`}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={centreKpis.monthlyData}>
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmtEur(v)} />
                <Line type="monotone" dataKey="ca" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {(centreKpis.top3.length > 0 || centreKpis.flop3.length > 0) && (
            <div className="grid grid-cols-1 gap-2">
              <div className="glass-card rounded-2xl p-3">
                <p className="text-xs font-display font-semibold mb-2 flex items-center gap-1"><Trophy className="w-3 h-3 text-success" /> Top 3 vs N-1 (mêmes mois)</p>
                <div className="space-y-1">
                  {centreKpis.top3.map(t => (
                    <div key={t.name} className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-0">
                      <span className="font-medium truncate flex-1 mr-2">{t.name}</span>
                      <div className="flex gap-2 items-center shrink-0">
                        <span className="text-muted-foreground text-[10px]">{fmtEur(t.caN)}</span>
                        <Badge className="bg-success/20 text-success border-success/30 text-[10px] h-4">+{t.evol.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                  {centreKpis.top3.length === 0 && <p className="text-[10px] text-muted-foreground">Pas de comparatif disponible</p>}
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3">
                <p className="text-xs font-display font-semibold mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-destructive" /> Flop 3 vs N-1 (mêmes mois)</p>
                <div className="space-y-1">
                  {centreKpis.flop3.map(t => (
                    <div key={t.name} className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-0">
                      <span className="font-medium truncate flex-1 mr-2">{t.name}</span>
                      <div className="flex gap-2 items-center shrink-0">
                        <span className="text-muted-foreground text-[10px]">{fmtEur(t.caN)}</span>
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] h-4">{t.evol.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                  {centreKpis.flop3.length === 0 && <p className="text-[10px] text-muted-foreground">Pas de comparatif disponible</p>}
                </div>
              </div>
            </div>
          )}

          <ChartCard title="Répartition CA par secteur">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={centreKpis.secteurData.filter(s => s.ca > 0)} dataKey="ca" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => e.name}>
                  {centreKpis.secteurData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmtEur(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Performance par secteur (CA/m²)">
            <ResponsiveContainer width="100%" height={Math.max(180, centreKpis.secteurData.length * 28)}>
              <BarChart data={centreKpis.secteurData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={90} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => `${fmtNum(v)} €/m²`} />
                <Bar dataKey="caM2" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="glass-card rounded-2xl p-3">
            <p className="text-xs font-display font-semibold mb-2 flex items-center gap-1"><Layers className="w-3 h-3 text-violet" /> Détails secteurs ({year})</p>
            <div className="space-y-1">
              {centreKpis.secteurData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium truncate">{s.name}</span>
                    <span className="text-muted-foreground shrink-0">({s.nb})</span>
                  </div>
                  <div className="flex gap-2 text-[10px] items-center shrink-0">
                    <span className="text-muted-foreground">{fmtNum(s.surface)}m²</span>
                    {s.caM2 > 0 && <span className="text-info">{fmtNum(s.caM2)}€/m²</span>}
                    <span className="font-bold">{fmtEur(s.ca)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "boutique" && (
        <div className="space-y-2">
          {boutiqueKpis.map(b => {
            const isOpen = expandedBoutique === b.id;
            const byMois = caByBoutique[b.name]?.byMois ?? {};
            const moisKeys = Object.keys(byMois).sort();
            const lastMois = moisKeys[moisKeys.length - 1];
            const lastMoisCA = lastMois ? byMois[lastMois] : 0;
            const prevYear = String(+year - 1);
            const prevYearMois = Object.entries(byMois).filter(([m]) => m.startsWith(prevYear));
            const prevYearComplete = prevYearMois.length === 12;
            const prevYearCA = prevYearMois.reduce((s, [, v]) => s + v, 0);
            const highlight = prevYearComplete
              ? { label: `CA ${prevYear} (complet)`, value: prevYearCA }
              : lastMois
                ? { label: `Dernier mois (${new Date(+lastMois.slice(0, 4), +lastMois.slice(5, 7) - 1, 1).toLocaleString("fr-FR", { month: "short", year: "2-digit" })})`, value: lastMoisCA }
                : null;
            return (
              <div key={b.id} className="glass-card rounded-2xl p-3 space-y-2">
                <button onClick={() => setExpandedBoutique(isOpen ? null : b.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold truncate">{b.name}</p>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {b.secteur && <Badge variant="outline" className="text-[9px] h-4">{b.secteur}</Badge>}
                        {b.surface > 0 && <Badge variant="outline" className="text-[9px] h-4">{fmtNum(b.surface)}m²</Badge>}
                      </div>
                      {highlight && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded glass-subtle">
                          <span className="text-[9px] text-muted-foreground">{highlight.label}</span>
                          <span className="text-[10px] font-bold text-success">{fmtEur(highlight.value)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">CA {year}</p>
                      <p className="text-sm font-bold">{fmtEur(b.ca)}</p>
                      {b.caM2 > 0 && <p className="text-[10px] text-muted-foreground">{fmtNum(b.caM2)} €/m²</p>}
                      {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground inline" /> : <ChevronDown className="w-3 h-3 text-muted-foreground inline" />}
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="pt-2 border-t border-border/20 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="glass-subtle rounded-lg p-2">
                        <p className="text-muted-foreground uppercase tracking-wider">Loyer/an</p>
                        <p className="font-bold text-sm">{b.loyer > 0 ? fmtEur(b.loyer) : "—"}</p>
                      </div>
                      <div className="glass-subtle rounded-lg p-2">
                        <p className="text-muted-foreground uppercase tracking-wider">Charges/an</p>
                        <p className="font-bold text-sm">{b.charges > 0 ? fmtEur(b.charges) : "—"}</p>
                      </div>
                      <div className="glass-subtle rounded-lg p-2">
                        <p className="text-muted-foreground uppercase tracking-wider">Taux d'effort</p>
                        <p className={`font-bold text-sm ${b.tauxEffort > 15 ? "text-destructive" : b.tauxEffort > 10 ? "text-orange" : "text-success"}`}>{b.tauxEffort > 0 ? `${b.tauxEffort.toFixed(1)}%` : "—"}</p>
                      </div>
                    </div>
                    {b.secteurAvg > 0 && (
                      <div className="glass-subtle rounded-lg p-2 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">vs Moyenne {b.secteur} ({fmtNum(b.secteurAvg)} €/m²)</span>
                        <span className={`font-bold ${b.vsSecteur >= 0 ? "text-success" : "text-destructive"}`}>{b.vsSecteur >= 0 ? "+" : ""}{b.vsSecteur.toFixed(1)}%</span>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={Object.keys(byMois).filter(m => m.startsWith(year)).sort().map(m => ({
                        mois: new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleString("fr-FR", { month: "short" }),
                        ca: byMois[m],
                      }))}>
                        <XAxis dataKey="mois" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmtEur(v)} />
                        <Bar dataKey="ca" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    {moisKeys.length > 0 && (
                      <details className="glass-subtle rounded-lg p-2">
                        <summary className="text-[11px] font-semibold cursor-pointer text-muted-foreground">Historique complet ({moisKeys.length} mois)</summary>
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                          {[...moisKeys].reverse().map(m => (
                            <div key={m} className="flex justify-between text-[10px] py-0.5 border-b border-border/10 last:border-0">
                              <span className="text-muted-foreground">{new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleString("fr-FR", { month: "long", year: "numeric" })}</span>
                              <span className="font-bold">{fmtEur(byMois[m])}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {boutiqueKpis.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Aucune boutique.</p>}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <div className={`flex items-center gap-1 text-${color} text-[10px] uppercase tracking-wider mb-1`}>{icon}{label}</div>
      <p className="text-lg font-bold font-display">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <p className="text-xs font-display font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}
