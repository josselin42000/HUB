import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Calendar as CalendarIcon, Mail, Smartphone } from "lucide-react";

type Step = "initial" | "relance_1" | "relance_2" | "email_final";
type Channel = "push" | "email";

interface Settings {
  id?: string;
  centre_id: string | null;
  is_active: boolean;
  day_of_month: number;
  skip_weekend: boolean;
  delay_relance_1: number;
  delay_relance_2: number;
  delay_email_final: number;
  channels_initial: Channel[];
  channels_relance_1: Channel[];
  channels_relance_2: Channel[];
  channels_email_final: Channel[];
  email_subject: string;
  email_template: string;
}

const DEFAULTS: Settings = {
  centre_id: null,
  is_active: true,
  day_of_month: 5,
  skip_weekend: true,
  delay_relance_1: 3,
  delay_relance_2: 3,
  delay_email_final: 4,
  channels_initial: ["push"],
  channels_relance_1: ["push"],
  channels_relance_2: ["push"],
  channels_email_final: ["email"],
  email_subject: "Saisie CA en attente",
  email_template:
    "Bonjour {{name}},\n\nVotre saisie du chiffre d'affaires pour {{mois}} est toujours en attente.\nMerci de la compléter dans l'application dès que possible.\n\nCordialement,\nL'équipe du centre",
};

function shiftIfWeekend(d: Date): Date {
  const out = new Date(d);
  if (out.getDay() === 6) out.setDate(out.getDate() + 2);
  else if (out.getDay() === 0) out.setDate(out.getDate() + 1);
  return out;
}

function fmt(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

const STEP_LABELS: Record<Step, string> = {
  initial: "1ère demande",
  relance_1: "Relance 1",
  relance_2: "Relance 2",
  email_final: "Envoi final",
};

export default function CARemindersTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const centreId = (user as any)?.centreId ?? null;

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ca_reminder_settings")
      .select("*")
      .eq("centre_id", centreId)
      .maybeSingle();
    if (data) {
      setSettings({
        ...DEFAULTS,
        ...(data as any),
        channels_initial: (data as any).channels_initial ?? DEFAULTS.channels_initial,
        channels_relance_1: (data as any).channels_relance_1 ?? DEFAULTS.channels_relance_1,
        channels_relance_2: (data as any).channels_relance_2 ?? DEFAULTS.channels_relance_2,
        channels_email_final: (data as any).channels_email_final ?? DEFAULTS.channels_email_final,
      });
    } else setSettings({ ...DEFAULTS, centre_id: centreId });

    const mois = new Date().toISOString().slice(0, 7);
    const { data: l } = await supabase
      .from("ca_reminder_log")
      .select("*")
      .eq("centre_id", centreId)
      .eq("mois", mois)
      .order("sent_at", { ascending: false })
      .limit(50);
    setLogs(l ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [centreId]);

  const save = async () => {
    setSaving(true);
    const payload = { ...settings, centre_id: centreId };
    const { error } = settings.id
      ? await supabase.from("ca_reminder_settings").update(payload as any).eq("id", settings.id)
      : await supabase.from("ca_reminder_settings").insert(payload as any);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Réglages enregistrés" });
    fetchData();
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ca-reminders-cron", {
        body: { dry_run: false, force_centre_id: centreId },
      });
      if (error) throw error;
      toast({ title: "Cycle exécuté", description: `${data?.sent ?? 0} envoi(s)` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const toggleChannel = (step: Step, channel: Channel) => {
    const key = `channels_${step}` as const;
    const current = (settings as any)[key] as Channel[];
    const next = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    setSettings({ ...settings, [key]: next } as Settings);
  };

  const now = new Date();
  const initial = shiftIfWeekend(new Date(now.getFullYear(), now.getMonth(), settings.day_of_month));
  const r1 = shiftIfWeekend(new Date(initial.getTime() + settings.delay_relance_1 * 86400000));
  const r2 = shiftIfWeekend(new Date(r1.getTime() + settings.delay_relance_2 * 86400000));
  const ef = shiftIfWeekend(new Date(r2.getTime() + settings.delay_email_final * 86400000));

  const stepDates: Record<Step, Date> = { initial, relance_1: r1, relance_2: r2, email_final: ef };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  const renderChannelRow = (step: Step) => {
    const key = `channels_${step}` as const;
    const channels = (settings as any)[key] as Channel[];
    return (
      <div key={step} className="flex items-center justify-between glass-subtle rounded-lg p-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-display font-semibold">{STEP_LABELS[step]}</span>
          <span className="text-[10px] text-muted-foreground">{fmt(stepDates[step])}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={channels.includes("push")} onCheckedChange={() => toggleChannel(step, "push")} />
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs">Push</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={channels.includes("email")} onCheckedChange={() => toggleChannel(step, "email")} />
            <Mail className="w-3.5 h-3.5 text-orange" />
            <span className="text-xs">Mail</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-orange" />
        <h3 className="text-base font-bold font-display">Alertes Collecte CA</h3>
      </div>

      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Système actif</Label>
          <Switch checked={settings.is_active} onCheckedChange={v => setSettings({ ...settings, is_active: v })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Jour du mois</Label>
            <Input type="number" min={1} max={28} value={settings.day_of_month}
              onChange={e => setSettings({ ...settings, day_of_month: Math.max(1, Math.min(28, parseInt(e.target.value) || 1)) })} />
          </div>
          <div className="flex items-end justify-between gap-2 pb-1">
            <Label className="text-xs">Décaler si week-end</Label>
            <Switch checked={settings.skip_weekend} onCheckedChange={v => setSettings({ ...settings, skip_weekend: v })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Relance 1 (j+)</Label>
            <Input type="number" min={1} value={settings.delay_relance_1}
              onChange={e => setSettings({ ...settings, delay_relance_1: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Relance 2 (j+)</Label>
            <Input type="number" min={1} value={settings.delay_relance_2}
              onChange={e => setSettings({ ...settings, delay_relance_2: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Final (j+)</Label>
            <Input type="number" min={1} value={settings.delay_email_final}
              onChange={e => setSettings({ ...settings, delay_email_final: parseInt(e.target.value) || 1 })} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-display font-semibold flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Canaux par étape
          </p>
          {(["initial", "relance_1", "relance_2", "email_final"] as Step[]).map(renderChannelRow)}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-orange" /> Mail type
          </Label>
          <Input
            placeholder="Objet du mail"
            value={settings.email_subject}
            onChange={e => setSettings({ ...settings, email_subject: e.target.value })}
          />
          <Textarea
            rows={7}
            placeholder="Corps du mail"
            value={settings.email_template}
            onChange={e => setSettings({ ...settings, email_template: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">
            Variables : <code>{"{{name}}"}</code> (destinataire), <code>{"{{mois}}"}</code> (mois en cours, ex 2026-04), <code>{"{{boutique}}"}</code>.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1 bg-gradient-to-r from-success to-teal hover:opacity-90 font-display">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button onClick={runTest} disabled={testing} variant="outline" className="font-display">
            <Send className="w-4 h-4 mr-1" /> {testing ? "..." : "Tester"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Destinataires : managers de boutique (is_manager = true) n'ayant pas saisi leur CA du mois en cours.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4 space-y-2">
        <p className="text-sm font-display font-semibold">Historique du mois ({logs.length})</p>
        {logs.length === 0 && <p className="text-xs text-muted-foreground">Aucun envoi ce mois.</p>}
        {logs.map(l => (
          <div key={l.id} className="flex items-center justify-between text-xs glass-subtle rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{l.step}</Badge>
              {l.channel === "email" ? <Mail className="w-3 h-3 text-orange" /> : <Smartphone className="w-3 h-3 text-primary" />}
              <span className="text-muted-foreground">{new Date(l.sent_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            <span className={l.success ? "text-success" : "text-destructive"}>{l.success ? "OK" : "Échec"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
