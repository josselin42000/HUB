import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  logo_url: string | null;
  color_primary: string;
  color_violet: string;
  color_orange: string;
  color_teal: string;
  color_foreground: string;
  color_background: string;
}

const DEFAULTS: AppSettings = {
  logo_url: null,
  color_primary: "215 90% 60%",
  color_violet: "270 70% 60%",
  color_orange: "25 95% 55%",
  color_teal: "175 70% 45%",
  color_foreground: "210 40% 95%",
  color_background: "225 25% 8%",
};

const SETTING_KEYS: (keyof AppSettings)[] = [
  "logo_url", "color_primary", "color_violet", "color_orange", "color_teal",
  "color_foreground", "color_background",
];

const AppSettingsContext = createContext<{
  settings: AppSettings;
  defaults: AppSettings;
  refresh: () => void;
}>({ settings: DEFAULTS, defaults: DEFAULTS, refresh: () => {} });

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  const fetchSettings = async () => {
    const { data } = await supabase.from("app_settings").select("key, value") as any;
    if (data && Array.isArray(data)) {
      const s = { ...DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        if (SETTING_KEYS.includes(row.key as keyof AppSettings) && row.value) {
          (s as any)[row.key] = row.value;
        }
      });
      setSettings(s);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.color_primary);
    root.style.setProperty("--ring", settings.color_primary);
    root.style.setProperty("--violet", settings.color_violet);
    root.style.setProperty("--orange", settings.color_orange);
    root.style.setProperty("--teal", settings.color_teal);
    root.style.setProperty("--info", settings.color_primary);

    // Foreground & background
    root.style.setProperty("--foreground", settings.color_foreground);
    root.style.setProperty("--card-foreground", settings.color_foreground);
    root.style.setProperty("--popover-foreground", settings.color_foreground);
    root.style.setProperty("--accent-foreground", settings.color_foreground);
    root.style.setProperty("--background", settings.color_background);
    root.style.setProperty("--card", settings.color_background);
    root.style.setProperty("--popover", settings.color_background);

    // Derive muted/secondary from background
    const bgParts = settings.color_background.match(/[\d.]+/g);
    if (bgParts && bgParts.length >= 3) {
      const h = bgParts[0]; const s = bgParts[1]; const l = parseFloat(bgParts[2]);
      root.style.setProperty("--secondary", `${h} ${Math.max(0, parseInt(s) - 5)}% ${Math.min(100, l + 10)}%`);
      root.style.setProperty("--muted", `${h} ${Math.max(0, parseInt(s) - 5)}% ${Math.min(100, l + 8)}%`);
      root.style.setProperty("--accent", `${h} ${Math.max(0, parseInt(s) - 5)}% ${Math.min(100, l + 12)}%`);
      root.style.setProperty("--border", `${h} ${Math.max(0, parseInt(s) - 10)}% ${Math.min(100, l + 12)}%`);
      root.style.setProperty("--input", `${h} ${Math.max(0, parseInt(s) - 10)}% ${Math.min(100, l + 12)}%`);
      root.style.setProperty("--glass", `${h} ${s}% ${Math.min(100, l + 7)}% / 0.6`);
      root.style.setProperty("--glass-border", `${h} ${Math.max(0, parseInt(s) - 10)}% ${Math.min(100, l + 22)}% / 0.4`);
    }

    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${settings.color_primary}), hsl(${settings.color_violet}))`);
    root.style.setProperty("--gradient-warm", `linear-gradient(135deg, hsl(${settings.color_orange}), hsl(0 80% 55%))`);
    root.style.setProperty("--gradient-cool", `linear-gradient(135deg, hsl(${settings.color_teal}), hsl(${settings.color_primary}))`);
    root.style.setProperty("--gradient-mesh", `radial-gradient(at 20% 80%, hsl(${settings.color_primary} / 0.15) 0%, transparent 50%), radial-gradient(at 80% 20%, hsl(${settings.color_violet} / 0.15) 0%, transparent 50%), radial-gradient(at 50% 50%, hsl(${settings.color_teal} / 0.08) 0%, transparent 50%)`);
  }, [settings]);

  // Sync favicon + apple-touch-icon + PWA manifest with logo
  useEffect(() => {
    const iconUrl = settings.logo_url || "/icon-512.png";

    const setLink = (rel: string, href: string, sizes?: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ""}`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        if (sizes) link.setAttribute("sizes", sizes);
        document.head.appendChild(link);
      }
      link.href = href;
    };
    setLink("icon", iconUrl);
    setLink("shortcut icon", iconUrl);
    setLink("apple-touch-icon", iconUrl);

    // Dynamic manifest pointing to current logo
    const manifest = {
      name: "HubCommerce",
      short_name: "HubCommerce",
      description: "Application de gestion centre commercial",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0a0a0f",
      theme_color: "#0a0a0f",
      icons: [
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    let m = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!m) {
      m = document.createElement("link");
      m.rel = "manifest";
      document.head.appendChild(m);
    }
    const old = m.href;
    m.href = url;
    if (old.startsWith("blob:")) URL.revokeObjectURL(old);
  }, [settings.logo_url]);

  return (
    <AppSettingsContext.Provider value={{ settings, defaults: DEFAULTS, refresh: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
