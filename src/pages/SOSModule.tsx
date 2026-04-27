import { useState, useEffect, useRef, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Phone, User, CheckCircle, Clock, ShieldAlert, Download, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPush } from "@/lib/sendPush";
import SosStats from "@/components/admin/SosStats";
import { useCentre } from "@/contexts/CentreContext";

interface Alert {
  id: string;
  boutique_name: string | null;
  created_at: string;
  status: string;
  description: string | null;
  alert_type: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
}

export default function SOSModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const [phase, setPhase] = useState<"idle" | "countdown" | "sent">("idle");
  const [countdown, setCountdown] = useState(10);
  const [slideX, setSlideX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [myAlert, setMyAlert] = useState<Alert | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const [showRegistry, setShowRegistry] = useState(false);
  const [regFrom, setRegFrom] = useState("");
  const [regTo, setRegTo] = useState("");

  const fetchAlerts = async () => {
    let q = supabase.from("sos_alerts").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setAlerts(data as Alert[]);
  };

  useEffect(() => {
    fetchAlerts();
    const channel = supabase.channel("sos-realtime").on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, () => fetchAlerts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCentreId]);

  useEffect(() => {
    if (role === "commerçant") {
      const active = alerts.find(a => a.status !== "resolue" && a.boutique_name === (user?.commerçant ?? user?.name));
      if (active) {
        setMyAlert(active);
        setPhase("sent");
      }
    }
  }, [alerts, role, user]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { sendAlert(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const sendAlert = async () => {
    const { error, data } = await supabase.from("sos_alerts").insert({
      created_by: user!.id,
      boutique_name: user?.commerçant ?? user?.name,
      alert_type: "urgence",
      description: "Alerte SOS déclenchée",
      status: "active",
    }).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setPhase("sent");
    setMyAlert(data as Alert);
    toast({ title: "🚨 Alerte envoyée", description: "Le PC sécurité a été notifié." });

    try {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id, centre_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const targetRoles = new Set(["securite", "centre", "fonciere", "proprietaire"]);
      const roleByUser = new Map(((roles as any[]) ?? []).map(r => [r.user_id, r.role]));
      const myCentre = user?.centreId ?? null;
      const userIds = ((profs as any[]) ?? [])
        .filter(p => {
          const r = roleByUser.get(p.user_id);
          if (!targetRoles.has(r)) return false;
          if (r === "fonciere" || r === "proprietaire") return true;
          return p.centre_id === myCentre;
        })
        .map(p => p.user_id);
      sendPush({
        user_ids: Array.from(new Set(userIds)),
        title: "🚨 ALERTE SOS",
        body: `${user?.commerçant ?? user?.name ?? "Boutique"} a déclenché une alerte`,
        url: "/sos",
        notif_type: "alerte",
      });
    } catch (e) { console.warn("push SOS", e); }
  };

  const startCountdown = () => { setPhase("countdown"); setCountdown(10); };
  const cancelCountdown = () => { setPhase("idle"); setCountdown(10); };

  const handleSlideStart = () => setIsDragging(true);
  const handleSlideMove = useCallback((clientX: number) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left - 24, rect.width - 48));
    setSlideX(x);
    if (x >= rect.width - 60) { setIsDragging(false); setSlideX(0); sendAlert(); }
  }, [isDragging]);
  const handleSlideEnd = () => { setIsDragging(false); setSlideX(0); };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleSlideMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleSlideMove(e.touches[0].clientX);
    const onUp = () => handleSlideEnd();
    if (isDragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging, handleSlideMove]);

  const acknowledge = async (id: string) => {
    await supabase.from("sos_alerts").update({ status: "prise_en_compte", acknowledged_at: new Date().toISOString(), acknowledged_by: user!.id } as any).eq("id", id);
    toast({ title: "Prise en compte" });
  };

  const resolve = async (id: string) => {
    await supabase.from("sos_alerts").update({ status: "resolue", resolved_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Alerte acquittée" });
  };

  const downloadRegistry = () => {
    let filtered = alerts;
    if (regFrom) filtered = filtered.filter(a => a.created_at >= regFrom);
    if (regTo) filtered = filtered.filter(a => a.created_at <= regTo + "T23:59:59");

    const demandeurs: Record<string, number> = {};
    let totalAckTime = 0, ackCount = 0, totalResTime = 0, resCount = 0;
    filtered.forEach(a => {
      demandeurs[a.boutique_name ?? "Inconnu"] = (demandeurs[a.boutique_name ?? "Inconnu"] || 0) + 1;
      if (a.acknowledged_at) { totalAckTime += (new Date(a.acknowledged_at).getTime() - new Date(a.created_at).getTime()); ackCount++; }
      if (a.resolved_at) { totalResTime += (new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime()); resCount++; }
    });
    const top5 = Object.entries(demandeurs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const avgAck = ackCount > 0 ? Math.round(totalAckTime / ackCount / 60000) : 0;
    const avgRes = resCount > 0 ? Math.round(totalResTime / resCount / 60000) : 0;

    let csv = "REGISTRE SOS\n\n";
    csv += `Période: ${regFrom || "début"} → ${regTo || "fin"}\n`;
    csv += `Total alertes: ${filtered.length}\n`;
    csv += `Temps moyen prise en compte: ${avgAck} min\n`;
    csv += `Temps moyen acquittement: ${avgRes} min\n\n`;
    csv += "TOP 5 DEMANDEURS:\n";
    top5.forEach(([name, count]) => { csv += `  ${name}: ${count}\n`; });
    csv += "\nDÉTAIL:\nBoutique;Date;Statut;Prise en compte (min);Acquittement (min)\n";
    filtered.forEach(a => {
      const ack = a.acknowledged_at ? Math.round((new Date(a.acknowledged_at).getTime() - new Date(a.created_at).getTime()) / 60000) : "-";
      const res = a.resolved_at ? Math.round((new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime()) / 60000) : "-";
      csv += `${a.boutique_name};${new Date(a.created_at).toLocaleString("fr-FR")};${a.status};${ack};${res}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `registre_sos_${regFrom || "all"}.csv`; link.click();
  };

  const showCommerçantView = role === "commerçant";
  const showSecuView = role === "securite" || role === "gestionnaire" || role === "coordinateur";

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-sos/10 blur-[100px] animate-glow-pulse" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
        {showCommerçantView && (
          <>
            <div className="glass-card rounded-2xl p-4 space-y-2 animate-fade-up mb-4">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><span className="text-sm">{user?.name} — {user?.commerçant}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><span className="text-sm">01 23 45 67 89</span></div>
            </div>

            {phase === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center py-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <button onClick={startCountdown}
                  className="w-36 h-36 rounded-full bg-gradient-to-br from-sos to-[hsl(15,80%,40%)] text-sos-foreground flex flex-col items-center justify-center font-bold text-xl font-display shadow-2xl animate-sos-pulse transition-all cursor-pointer glow-sos">
                  <AlertTriangle className="w-10 h-10 mb-1" />
                  ALERTE
                </button>
              </div>
            )}

            {phase === "countdown" && (
              <div className="flex flex-col items-center py-6 space-y-6 animate-fade-up">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--sos))" strokeWidth="6"
                      strokeDasharray={`${(countdown / 10) * 339.3} 339.3`} strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-display text-sos">{countdown}</span>
                    <span className="text-xs text-muted-foreground">secondes</span>
                  </div>
                </div>
                <Button variant="outline" onClick={cancelCountdown} className="rounded-xl border-border/50">Annuler</Button>
                <div className="w-full">
                  <p className="text-xs text-center text-muted-foreground mb-2">Glissez pour envoyer immédiatement</p>
                  <div ref={sliderRef} className="relative h-14 rounded-xl glass border border-sos/30 overflow-hidden select-none">
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground font-display">
                      <Hand className="w-4 h-4 mr-1" /> Glisser →
                    </div>
                    <div
                      className="absolute top-1 left-1 w-12 h-12 rounded-xl bg-gradient-to-br from-sos to-[hsl(15,80%,40%)] flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                      style={{ transform: `translateX(${slideX}px)` }}
                      onMouseDown={handleSlideStart}
                      onTouchStart={handleSlideStart}
                    >
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {phase === "sent" && myAlert && (
              <div className="flex flex-col items-center py-6 space-y-4 animate-fade-up">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sos to-[hsl(15,80%,40%)] flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold font-display">Alerte envoyée</h3>
                <div className="w-full space-y-2">
                  <StatusStep label="Envoyé" done={true} time={myAlert.created_at} />
                  <StatusStep label="Pris en compte" done={!!myAlert.acknowledged_at} time={myAlert.acknowledged_at} />
                  <StatusStep label="Acquitté" done={myAlert.status === "resolue"} time={myAlert.resolved_at} />
                </div>
              </div>
            )}
          </>
        )}

        {showSecuView && (
          <div className="space-y-4">
            <SosStats />
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
              <div className="p-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /><h3 className="text-base font-display font-semibold">Alertes SOS</h3></div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowRegistry(!showRegistry)}>
                  <Download className="w-3 h-3 mr-1" /> Registre
                </Button>
              </div>
              <div className="p-4 pt-2 space-y-2">
                {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune alerte</p>}
                {alerts.map(alert => (
                  <div key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${alert.status === "active" ? "animate-blink-border border-2 border-sos bg-sos/5" : "glass-subtle"}`}>
                    <div>
                      <p className="text-sm font-medium">{alert.boutique_name ?? "Boutique"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(alert.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.status === "active" ? "destructive" : "secondary"}
                        className={`text-[10px] ${alert.status === "resolue" ? "bg-success/20 text-success border-success/30" : alert.status === "prise_en_compte" ? "bg-orange/20 text-orange border-orange/30" : ""}`}>
                        {alert.status === "active" ? "Active" : alert.status === "prise_en_compte" ? "Prise en compte" : "Acquittée"}
                      </Badge>
                      {alert.status === "active" && (
                        <Button size="sm" className="h-6 text-[10px] px-2 bg-orange hover:bg-orange/90 rounded-lg" onClick={() => acknowledge(alert.id)}>
                          Prendre en compte
                        </Button>
                      )}
                      {alert.status === "prise_en_compte" && (
                        <Button size="sm" className="h-6 text-[10px] px-2 bg-success hover:bg-success/90 rounded-lg" onClick={() => resolve(alert.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Acquitter
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showRegistry && (
              <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
                <h3 className="text-sm font-display font-semibold">Télécharger le registre</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Du</label><Input type="date" value={regFrom} onChange={e => setRegFrom(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                  <div><label className="text-xs text-muted-foreground">Au</label><Input type="date" value={regTo} onChange={e => setRegTo(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                </div>
                <Button onClick={downloadRegistry} className="w-full bg-gradient-to-r from-primary to-violet hover:opacity-90 rounded-xl font-display">
                  <Download className="w-4 h-4 mr-2" /> Télécharger CSV
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusStep({ label, done, time }: { label: string; done: boolean; time: string | null }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${done ? "glass-card" : "glass-subtle opacity-50"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-success/20" : "bg-muted"}`}>
        {done ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium font-display">{label}</p>
        {done && time && <p className="text-xs text-muted-foreground">{new Date(time).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>}
      </div>
    </div>
  );
}
