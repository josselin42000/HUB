import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Construction, Clock, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToXLSX } from "@/lib/exportTable";

function formatDuration(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "—";
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)} min`;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} j`;
}
const median = (a: number[]) => { if (!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const average = (a: number[]) => a.length ? a.reduce((x,y)=>x+y,0)/a.length : NaN;
const pct = (n: number, t: number) => t === 0 ? 0 : Math.round((n/t)*100);

export default function SignalementsStats() {
  const [s, setS] = useState<{ total: number; resolved: number; underWeek: number; underMonth: number; avgMs: number; medMs: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("signalements").select("created_at, resolved_at");
      const list = data ?? [];
      const dur: number[] = []; let uw=0, um=0;
      list.forEach((x: any) => {
        if (x.resolved_at && x.created_at) {
          const d = new Date(x.resolved_at).getTime() - new Date(x.created_at).getTime();
          dur.push(d);
          if (d <= 7*86400000) uw++;
          if (d <= 30*86400000) um++;
        }
      });
      setS({ total: list.length, resolved: dur.length, underWeek: uw, underMonth: um, avgMs: average(dur), medMs: median(dur) });
    })();
  }, []);

  const exportAll = async () => {
    const { data } = await supabase
      .from("signalements")
      .select("created_at, category, description, location, boutique_name, status, acknowledged_at, resolved_at")
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map((r: any) => {
      const dur = r.resolved_at && r.created_at ? (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) : null;
      return {
        Créé: r.created_at,
        Catégorie: r.category,
        Boutique: r.boutique_name ?? "",
        Lieu: r.location ?? "",
        Description: r.description,
        Statut: r.status,
        "Pris en compte": r.acknowledged_at ?? "",
        Résolu: r.resolved_at ?? "",
        "Durée résolution": dur ? formatDuration(dur) : "",
      };
    });
    exportToXLSX(rows, `signalements_${new Date().toISOString().slice(0,10)}`, "Signalements");
  };

  if (!s) return null;
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Construction className="w-4 h-4 text-orange" /><h3 className="text-sm font-display font-semibold">Signalements — Résolution</h3></div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={exportAll}>
          <Download className="w-3 h-3" /> XLSX
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total" value={s.total} />
        <Stat label="Résolus" value={`${s.resolved} (${pct(s.resolved, s.total)}%)`} />
        <Stat label="< 1 semaine" value={`${pct(s.underWeek, s.total)}%`} icon={<CheckCircle2 className="w-3 h-3 text-success" />} />
        <Stat label="< 1 mois" value={`${pct(s.underMonth, s.total)}%`} icon={<CheckCircle2 className="w-3 h-3 text-success" />} />
        <Stat label="Temps moyen" value={formatDuration(s.avgMs)} icon={<Clock className="w-3 h-3 text-info" />} />
        <Stat label="Temps médian" value={formatDuration(s.medMs)} icon={<Clock className="w-3 h-3 text-info" />} />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="glass-subtle rounded-xl p-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">{icon}{label}</div>
      <p className="text-base font-bold font-display mt-0.5">{value}</p>
    </div>
  );
}
