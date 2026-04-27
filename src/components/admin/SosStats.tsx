import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Activity, CheckCircle2, Download } from "lucide-react";
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

export default function SosStats() {
  const [d, setD] = useState<{ total: number; ackTimes: number[]; resolvedTimes: number[] } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sos_alerts").select("created_at, acknowledged_at, resolved_at");
      const list = data ?? [];
      const ack: number[] = []; const res: number[] = [];
      list.forEach((a: any) => {
        if (a.acknowledged_at && a.created_at) ack.push(new Date(a.acknowledged_at).getTime() - new Date(a.created_at).getTime());
        if (a.resolved_at && a.created_at) res.push(new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime());
      });
      setD({ total: list.length, ackTimes: ack, resolvedTimes: res });
    })();
  }, []);

  const exportAll = async () => {
    const { data } = await supabase
      .from("sos_alerts")
      .select("created_at, alert_type, boutique_name, description, status, acknowledged_at, resolved_at")
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map((r: any) => {
      const ack = r.acknowledged_at && r.created_at ? new Date(r.acknowledged_at).getTime() - new Date(r.created_at).getTime() : null;
      const res = r.resolved_at && r.created_at ? new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime() : null;
      return {
        Créé: r.created_at,
        Type: r.alert_type,
        Boutique: r.boutique_name ?? "",
        Description: r.description ?? "",
        Statut: r.status,
        "Pris en compte": r.acknowledged_at ?? "",
        Acquitté: r.resolved_at ?? "",
        "Délai prise en compte": ack ? formatDuration(ack) : "",
        "Délai acquittement": res ? formatDuration(res) : "",
      };
    });
    exportToXLSX(rows, `alertes_sos_${new Date().toISOString().slice(0,10)}`, "Alertes");
  };

  if (!d) return null;
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-sos" /><h3 className="text-sm font-display font-semibold">Alertes — Réactivité</h3></div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={exportAll}>
          <Download className="w-3 h-3" /> XLSX
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total alertes" value={d.total} />
        <Stat label="Prises en compte" value={`${d.ackTimes.length}/${d.total}`} />
        <Stat label="Temps moyen prise en compte" value={formatDuration(average(d.ackTimes))} icon={<Activity className="w-3 h-3 text-info" />} />
        <Stat label="Temps médian prise en compte" value={formatDuration(median(d.ackTimes))} icon={<Activity className="w-3 h-3 text-info" />} />
        <Stat label="Temps moyen acquittement" value={formatDuration(average(d.resolvedTimes))} icon={<CheckCircle2 className="w-3 h-3 text-success" />} />
        <Stat label="Temps médian acquittement" value={formatDuration(median(d.resolvedTimes))} icon={<CheckCircle2 className="w-3 h-3 text-success" />} />
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
