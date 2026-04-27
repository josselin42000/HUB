import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useSupportPermissions } from "@/hooks/useSupportPermissions";
import { getAccessibleModules, Module } from "@/lib/permissions";
import { AlertTriangle, Construction, DoorOpen, BarChart3, Bot, TrendingUp, FileUser, Gift, Megaphone, Users, Crown, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCAReminderStatus } from "@/hooks/useCAReminderStatus";

const allMenuItems: { id: Module; label: string; icon: typeof Construction; gradient: string; glow: string; managerOnly?: boolean }[] = [
  { id: "signalement", label: "Signaler", icon: Construction, gradient: "from-[hsl(45,90%,55%)] to-orange", glow: "hsl(40,95%,55%)" },
  { id: "acces", label: "Laisser-Passer", icon: DoorOpen, gradient: "from-info to-primary", glow: "hsl(210,80%,55%)" },
  { id: "sondage", label: "Sondage", icon: BarChart3, gradient: "from-violet to-primary", glow: "hsl(270,70%,60%)" },
  { id: "chatbot", label: "Steel Com IA", icon: Bot, gradient: "from-teal to-info", glow: "hsl(175,70%,45%)" },
  { id: "collecte", label: "Collecte CA", icon: TrendingUp, gradient: "from-success to-teal", glow: "hsl(155,70%,45%)", managerOnly: true },
  { id: "cvtheque", label: "CVthèque", icon: FileUser, gradient: "from-primary to-info", glow: "hsl(210,80%,55%)", managerOnly: true },
  { id: "bonplan", label: "Bons Plans", icon: Gift, gradient: "from-orange to-violet", glow: "hsl(300,60%,50%)" },
  { id: "information", label: "Infos", icon: Megaphone, gradient: "from-info to-teal", glow: "hsl(190,70%,50%)" },
  { id: "commercants" as any, label: "Commerçants", icon: Store, gradient: "from-teal to-violet", glow: "hsl(200,70%,50%)" },
  { id: "admin", label: "Utilisateurs", icon: Users, gradient: "from-violet to-primary", glow: "hsl(240,70%,60%)" },
  { id: "proprietaire" as any, label: "Propriétaire", icon: Crown, gradient: "from-[hsl(45,90%,50%)] to-[hsl(30,90%,45%)]", glow: "hsl(40,90%,55%)" },
];

interface Props {
  onNavigate: (module: string) => void;
}

const formatDate = () => {
  const d = new Date();
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

export default function MainMenu({ onNavigate }: Props) {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const support = useSupportPermissions();
  const role = user?.role ?? "commerçant";
  const isManager = user?.isManager ?? false;
  const accessible = getAccessibleModules(role);
  const caPending = useCAReminderStatus();
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  const [homeTitle, setHomeTitle] = useState<string>("");
  const [homeSubtitle, setHomeSubtitle] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    if (role === "gestionnaire" || role === "coordinateur") {
      supabase
        .from("admin_module_access")
        .select("module")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAllowedModules(data.map((d: any) => d.module));
          } else {
            setAllowedModules([]);
          }
        });
    }
  }, [user, role]);

  useEffect(() => {
    supabase.from("app_settings").select("key, value").in("key", ["home_title", "home_subtitle"]).then(({ data }: any) => {
      if (data) {
        data.forEach((row: any) => {
          if (row.key === "home_title") setHomeTitle(row.value ?? "");
          if (row.key === "home_subtitle") setHomeSubtitle(row.value ?? "");
        });
      }
    });
  }, []);

  // Si l'utilisateur est "support", on restreint son menu aux modules cochés.
  const supportAllowed: string[] | null = support.isSupport
    ? [
        ...(support.can_view_stats ? ["admin"] : []),
        ...(support.can_view_sondages ? ["sondage"] : []),
        ...(support.can_view_informations ? ["information"] : []),
        ...(support.can_view_collecte ? ["collecte"] : []),
      ]
    : null;

  const menuItems = allMenuItems.filter(item => {
    if (!accessible.includes(item.id)) return false;
    if (role === "commerçant" && item.managerOnly && !isManager) return false;
    if ((role === "gestionnaire" || role === "coordinateur") && allowedModules !== null) {
      if (item.id !== "commercants" && !allowedModules.includes(item.id)) return false;
    }
    if (supportAllowed) {
      if (!supportAllowed.includes(item.id)) return false;
    }
    return true;
  });

  // Badge PWA (icône appli) pour la saisie CA en attente
  useEffect(() => {
    const nav: any = navigator;
    if (caPending && nav.setAppBadge) {
      nav.setAppBadge(1).catch(() => {});
    } else if (nav.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    }
  }, [caPending]);

  const [quote, setQuote] = useState("");
  const [events, setEvents] = useState<{ title: string; event_date: string }[]>([]);
  const [banner, setBanner] = useState<{ content: string; link_url: string | null; image_url: string | null } | null>(null);

  useEffect(() => {
    supabase.from("motivational_quotes").select("text").then(({ data }) => {
      if (data && data.length > 0) {
        setQuote((data as any[])[Math.floor(Math.random() * data.length)].text);
      }
    });
    const today = new Date().toISOString().split("T")[0];
    supabase.from("upcoming_events").select("title, event_date").gte("event_date", today).order("event_date").limit(3).then(({ data }) => {
      if (data) setEvents(data as any[]);
    });
    supabase.from("banner_config").select("content, link_url, image_url").eq("is_active", true).limit(1).then(({ data }) => {
      if (data && data.length > 0) setBanner(data[0] as any);
    });
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";
  const lastName = user?.name?.split(" ").slice(1).join(" ") ?? "";

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-20 -left-20 w-40 h-40 rounded-full bg-primary/15 blur-[80px] animate-glow-pulse" />
      <div className="absolute bottom-20 -right-20 w-40 h-40 rounded-full bg-violet/15 blur-[80px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />

      <AppHeader />

      <main className="flex-1 flex flex-col items-center px-4 pt-0 pb-4 gap-0">
        {/* Logo */}
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="h-32 object-contain animate-fade-up -mb-8 -mt-4" />
        )}
        {/* Titre personnalisable + sous-titre */}
        {(homeTitle || homeSubtitle) && (
          <div className="text-center animate-fade-up mb-1">
            {homeTitle && <h1 className="text-base font-bold font-display bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">{homeTitle}</h1>}
            {homeSubtitle && <p className="text-[11px] text-muted-foreground tracking-wide">{homeSubtitle}</p>}
          </div>
        )}
        {/* Greeting */}
        <div className="text-center animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <h2 className="text-lg font-bold font-display">Bonjour {firstName} {lastName}</h2>
          {quote && <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{quote}</p>}
        </div>

        {/* Upcoming events */}
        {events.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {events.map((ev, i) => {
              const d = daysUntil(ev.event_date);
              return (
                <span key={i} className="text-xs glass-subtle px-3 py-1.5 rounded-xl font-display">
                  <span className="text-primary font-semibold">J-{d}</span> {ev.title}
                </span>
              );
            })}
          </div>
        )}

        {/* Grid menu */}
        <div className="flex flex-col items-center justify-center w-full gap-4 mt-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-md px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isPulsing = item.id === "collecte" && caPending;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group p-2 ${isPulsing ? "animate-glow-pulse" : ""}`}
                  style={{ boxShadow: `0 4px 20px ${item.glow}33, 0 0 40px ${item.glow}15` }}
                >
                  {isPulsing && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-sos rounded-full ring-2 ring-background animate-pulse" />
                  )}
                  <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium mt-1 leading-tight font-display tracking-wide text-center">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Alerte button */}
          {accessible.includes("sos") && (
            <button
              onClick={() => onNavigate("sos")}
              className="w-40 h-12 rounded-xl bg-gradient-to-br from-sos to-[hsl(15,80%,45%)] text-sos-foreground flex items-center justify-center gap-2 font-bold text-base font-display shadow-lg animate-sos-pulse hover:scale-105 transition-transform cursor-pointer mt-2"
              style={{ boxShadow: "0 4px 30px hsl(0,70%,50%,0.4), 0 0 60px hsl(0,70%,50%,0.15)" }}
            >
              <AlertTriangle className="w-5 h-5" />
              Alerte
            </button>
          )}
        </div>

        {/* Bottom banner */}
        {banner && (
          <div
            className={`w-full max-w-md glass-subtle rounded-2xl overflow-hidden text-center animate-fade-up ${banner.link_url ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}`}
            onClick={() => banner.link_url && window.open(banner.link_url, "_blank", "noopener")}
          >
            {banner.image_url && <img src={banner.image_url} alt="Encart" className="w-full max-h-32 object-cover" />}
            {banner.content && <p className={`text-xs text-muted-foreground ${banner.image_url ? "px-4 py-2" : "px-4 py-3"}`}>{banner.content}</p>}
            {banner.link_url && !banner.image_url && <p className="text-[10px] text-primary pb-2">Cliquez pour en savoir plus →</p>}
          </div>
        )}
      </main>
    </div>
  );
}
