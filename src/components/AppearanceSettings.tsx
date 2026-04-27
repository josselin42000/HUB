import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Palette, Upload, Image as ImageIcon, X } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TestNotificationButton from "@/components/notifications/TestNotificationButton";

function hslToHex(hsl: string) {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return "#3b82f6";
  const h = parseFloat(parts[0]); const s = parseFloat(parts[1]) / 100; const l = parseFloat(parts[2]) / 100;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; const c = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AppearanceSettings() {
  const { settings, defaults, refresh } = useAppSettings();
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo_url);
  const [primary, setPrimary] = useState(settings.color_primary);
  const [violet, setViolet] = useState(settings.color_violet);
  const [orange, setOrange] = useState(settings.color_orange);
  const [teal, setTeal] = useState(settings.color_teal);
  const [foreground, setForeground] = useState(settings.color_foreground);
  const [background, setBackground] = useState(settings.color_background);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLogoPreview(settings.logo_url);
    setPrimary(settings.color_primary);
    setViolet(settings.color_violet);
    setOrange(settings.color_orange);
    setTeal(settings.color_teal);
    setForeground(settings.color_foreground);
    setBackground(settings.color_background);
  }, [settings]);

  const upsert = async (key: string, value: string | null) => {
    const { data } = await supabase.from("app_settings").select("id").eq("key", key).limit(1) as any;
    if (data && data.length > 0) {
      await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() } as any).eq("id", data[0].id);
    } else {
      await supabase.from("app_settings").insert({ key, value } as any);
    }
  };

  const save = async () => {
    setSaving(true);
    let logoUrl = settings.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `branding/logo.${ext}`;
      await supabase.storage.from("attachments").upload(path, logoFile, { upsert: true });
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      logoUrl = data.publicUrl + "?t=" + Date.now();
    } else if (logoPreview === null) {
      logoUrl = null;
    }
    await Promise.all([
      upsert("logo_url", logoUrl),
      upsert("color_primary", primary),
      upsert("color_violet", violet),
      upsert("color_orange", orange),
      upsert("color_teal", teal),
      upsert("color_foreground", foreground),
      upsert("color_background", background),
    ]);
    refresh();
    setSaving(false);
    toast({ title: "Personnalisation enregistrée" });
  };

  const reset = async () => {
    setSaving(true);
    const d = defaults;
    await Promise.all([
      upsert("logo_url", null),
      upsert("color_primary", d.color_primary),
      upsert("color_violet", d.color_violet),
      upsert("color_orange", d.color_orange),
      upsert("color_teal", d.color_teal),
      upsert("color_foreground", d.color_foreground),
      upsert("color_background", d.color_background),
    ]);
    setLogoPreview(null); setLogoFile(null);
    setPrimary(d.color_primary); setViolet(d.color_violet); setOrange(d.color_orange); setTeal(d.color_teal);
    setForeground(d.color_foreground); setBackground(d.color_background);
    refresh();
    setSaving(false);
    toast({ title: "Style initial restauré" });
  };

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-2xl p-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-display font-semibold">Notifications push</h3>
          <p className="text-[10px] text-muted-foreground">Envoie une notif test sur cet appareil</p>
        </div>
        <TestNotificationButton />
      </div>

      <div className="glass-card rounded-2xl p-3 space-y-2">
        <h3 className="text-xs font-display font-semibold flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-primary" /> Logo</h3>
        {logoPreview ? (
          <div className="relative inline-block">
            <img src={logoPreview} alt="Logo" className="h-14 object-contain rounded-xl bg-secondary/30 p-2" />
            <button className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => { setLogoPreview(null); setLogoFile(null); }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="w-full h-16 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 cursor-pointer">
            <ImageIcon className="w-4 h-4" />
            <span className="text-[11px]">Choisir un logo</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setLogoFile(f); setLogoPreview(URL.createObjectURL(f));
            }} />
          </label>
        )}
      </div>

      <div className="glass-card rounded-2xl p-3 space-y-2">
        <h3 className="text-xs font-display font-semibold flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-violet" /> Couleurs</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Principale", value: primary, set: setPrimary },
            { label: "Secondaire", value: violet, set: setViolet },
            { label: "Chaud", value: orange, set: setOrange },
            { label: "Froid", value: teal, set: setTeal },
          ].map(c => (
            <div key={c.label} className="space-y-1 text-center">
              <label className="text-[9px] text-muted-foreground">{c.label}</label>
              <div className="flex flex-col items-center gap-1">
                <input type="color" value={hslToHex(c.value)} onChange={e => c.set(hexToHsl(e.target.value))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent" />
                <div className="w-full h-3 rounded-md" style={{ background: `hsl(${c.value})` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card rounded-2xl p-3 space-y-2">
          <h3 className="text-xs font-display font-semibold">Texte</h3>
          <input type="color" value={hslToHex(foreground)} onChange={e => setForeground(hexToHsl(e.target.value))} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent" />
        </div>
        <div className="glass-card rounded-2xl p-3 space-y-2">
          <h3 className="text-xs font-display font-semibold">Fond</h3>
          <input type="color" value={hslToHex(background)} onChange={e => setBackground(hexToHsl(e.target.value))} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1 bg-gradient-to-r from-violet to-primary rounded-xl font-display">
          {saving ? "…" : "Enregistrer"}
        </Button>
        <Button variant="outline" onClick={reset} disabled={saving} className="rounded-xl">Réinitialiser</Button>
      </div>
    </div>
  );
}
