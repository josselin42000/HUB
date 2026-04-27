import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Users, Store, Crown, Search, Plus, Trash2, MessageSquareQuote, Calendar, Megaphone, MapPin, ChevronLeft, Edit, Image as ImageIcon, X, Palette, Upload, Archive, LifeBuoy, Home, BookUser, Bell, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import planCoordinateur from "@/assets/plan-coordinateur.png";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import SupportTab from "@/components/admin/SupportTab";
import HomeCustomTab from "@/components/admin/HomeCustomTab";
import AnnuaireTab from "@/components/admin/AnnuaireTab";
import CARemindersTab from "@/components/admin/CARemindersTab";
import SignalementSettingsTab from "@/components/admin/SignalementSettingsTab";
import PendingAccountsTab from "@/components/admin/PendingAccountsTab";
import TestNotificationButton from "@/components/notifications/TestNotificationButton";
import CreateUserDialog from "@/components/admin/CreateUserDialog";

interface Profile {
  id: string; user_id: string; name: string; email: string; boutique_name: string | null;
  is_manager: boolean; boutique_group_id: string | null; created_at: string; centre_id: string | null;
}
interface UserRole { id: string; user_id: string; role: string; }
interface Centre { id: string; name: string; }
interface CommerçantGroup {
  id: string; name: string; created_at: string;
  loyer: number | null; surface: number | null;
  date_depot_dat: string | null; date_validation_dat: string | null;
  date_livraison_coque: string | null; date_ouverture: string | null; date_fermeture: string | null;
  plan_position_x: number | null; plan_position_y: number | null; plan_image_url: string | null;
}
interface Quote { id: string; text: string; }
interface Event { id: string; title: string; event_date: string; }
interface Banner { id: string; content: string; is_active: boolean; link_url: string | null; image_url: string | null; }

export default function AdminModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { settings, defaults, refresh: refreshSettings } = useAppSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [groups, setGroups] = useState<CommerçantGroup[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"hub" | "users" | "shops" | "annuaire" | "content">("users");
  const [tab, setTab] = useState<"profiles" | "commerçants" | "quotes" | "events" | "banner" | "custom" | "boitenoire" | "stats" | "support" | "home" | "annuaire" | "cvtheque">("profiles");
  const [newQuote, setNewQuote] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newBanner, setNewBanner] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editBannerContent, setEditBannerContent] = useState("");
  const [editBannerLink, setEditBannerLink] = useState("");
  const [editBannerImageFile, setEditBannerImageFile] = useState<File | null>(null);
  const [editBannerImagePreview, setEditBannerImagePreview] = useState<string | null>(null);
  const [newCommerçantName, setNewCommerçantName] = useState("");
  const [editingCommerçant, setEditingCommerçant] = useState<CommerçantGroup | null>(null);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCommerçantName, setEditCommerçantName] = useState("");
  const [editCoordinateurId, setEditCoordinateurId] = useState("");
  // Commerçant identity fields
  const [bLoyer, setBLoyer] = useState("");
  const [bSurface, setBSurface] = useState("");
  const [bDepotDat, setBDepotDat] = useState("");
  const [bValidDat, setBValidDat] = useState("");
  const [bLivrCoque, setBLivrCoque] = useState("");
  const [bOuverture, setBOuverture] = useState("");
  const [bFermeture, setBFermeture] = useState("");
  const [bPosX, setBPosX] = useState("");
  const [bPosY, setBPosY] = useState("");
  // Boîte Noire
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("primary");
  const [boutiqueEvents, setBoutiqueEvents] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchAll = async () => {
    // Récupérer d'abord les IDs proprietaire pour les exclure
  const [p, r, g, q, ev, b, c] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("*"),
    supabase.from("boutique_groups").select("*").order("name"),
    supabase.from("motivational_quotes").select("*"),
    supabase.from("upcoming_events").select("*").order("event_date"),
    supabase.from("banner_config").select("*"),
    supabase.from("centres").select("id, name").order("name"),
  ]);
const { data: propData } = await supabase.rpc('get_proprietaire_ids');
const propIds: string[] = propData ?? [];
if (p.data) setProfiles((p.data as unknown as Profile[]).filter(pr => !propIds.includes(pr.user_id)));
  if (r.data) setRoles(r.data as UserRole[]);
  if (g.data) setGroups(g.data as CommerçantGroup[]);
  if (q.data) setQuotes(q.data as Quote[]);
  if (ev.data) setEvents(ev.data as Event[]);
  if (b.data) setBanners(b.data as Banner[]);
  if (c.data) setCentres(c.data as Centre[]);
  const et = await supabase.from("boutique_event_types").select("*").order("sort_order");
  if (et.data) setEventTypes(et.data as any[]);
};

  const fetchBoutiqueEvents = async (boutiqueId: string) => {
    const { data } = await supabase
      .from("boutique_events").select("*")
      .eq("boutique_group_id", boutiqueId)
      .order("created_at", { ascending: false });
    setBoutiqueEvents(data ?? []);
  };

  const addEventType = async () => {
    if (!newTypeLabel.trim()) return;
    const key = newTypeLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    const max = Math.max(0, ...eventTypes.map((t: any) => t.sort_order ?? 0));
    const { error } = await supabase.from("boutique_event_types").insert({
      type_key: key, label: newTypeLabel.trim(), icon: "Archive", color: newTypeColor, sort_order: max + 1, is_active: true,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setNewTypeLabel("");
    fetchAll();
  };

  const toggleEventType = async (id: string, isActive: boolean) => {
    await supabase.from("boutique_event_types").update({ is_active: !isActive } as any).eq("id", id);
    fetchAll();
  };

  const deleteEventType = async (id: string) => {
    await supabase.from("boutique_event_types").delete().eq("id", id);
    fetchAll();
  };

  useEffect(() => { fetchAll(); }, []);

  const getRole = (userId: string) => roles.find(r => r.user_id === userId)?.role ?? "boutique";
  const getCentreName = (centreId: string | null) => centres.find(c => c.id === centreId)?.name ?? "";
  const isGestionnaire = user?.role === "gestionnaire" || user?.role === "proprietaire";
  const isCoordinateurOrGestionnaire = user?.role === "coordinateur" || user?.role === "gestionnaire" || user?.role === "proprietaire";

  const updateCentre = async (profileId: string, centreId: string | null) => {
    await supabase.from("profiles").update({ centre_id: centreId } as any).eq("id", profileId);
    toast({ title: "Centre mis à jour" }); fetchAll();
  };

  const updateRole = async (userId: string, newRole: string) => {
    const existing = roles.find(r => r.user_id === userId);
    if (existing) await supabase.from("user_roles").update({ role: newRole } as any).eq("id", existing.id);
    toast({ title: `Rôle mis à jour: ${newRole}` }); fetchAll();
  };

  const toggleManager = async (profile: Profile) => {
    await supabase.from("profiles").update({ is_manager: !profile.is_manager } as any).eq("id", profile.id);
    toast({ title: profile.is_manager ? "Statut manager retiré" : "Statut manager accordé" }); fetchAll();
  };

  const assignGroup = async (profileId: string, groupId: string | null) => {
    await supabase.from("profiles").update({ boutique_group_id: groupId } as any).eq("id", profileId); fetchAll();
  };

  const ensureCommerçantGroup = async (commerçantName: string) => {
    const existing = groups.find(g => g.name.toLowerCase() === commerçantName.toLowerCase());
    if (existing) return existing.id;
    const { data } = await supabase.from("boutique_groups").insert({ name: commerçantName } as any).select().single();
    if (data) { fetchAll(); return (data as any).id; }
    return null;
  };

  const autoAssignGroup = async (profile: Profile) => {
    if (!profile.boutique_name) return;
    const groupId = await ensureCommerçantGroup(profile.boutique_name);
    if (groupId) await assignGroup(profile.id, groupId);
    toast({ title: `Assigné à ${profile.boutique_name}` });
  };

  const addCommerçant = async () => {
    if (!newCommerçantName.trim()) return;
    await supabase.from("boutique_groups").insert({ name: newCommerçantName, centre_id: user?.centreId ?? null } as any);
    setNewCommerçantName(""); fetchAll();
    toast({ title: "Commerçant ajouté" });
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (res.error) throw res.error;
      toast({ title: "Utilisateur supprimé" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from("boutique_groups").delete().eq("id", id);
    if (error) { toast({ title: "Erreur suppression", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Commerçant supprimé" }); fetchAll();
  };

  const startEditCommerçant = (b: CommerçantGroup) => {
    setEditingCommerçant(b);
    fetchBoutiqueEvents(b.id);
    setBLoyer(b.loyer?.toString() ?? "");
    setBSurface(b.surface?.toString() ?? "");
    setBDepotDat(b.date_depot_dat ?? "");
    setBValidDat(b.date_validation_dat ?? "");
    setBLivrCoque(b.date_livraison_coque ?? "");
    setBOuverture(b.date_ouverture ?? "");
    setBFermeture(b.date_fermeture ?? "");
    setBPosX(b.plan_position_x?.toString() ?? "");
    setBPosY(b.plan_position_y?.toString() ?? "");
  };

  const saveCommerçant = async () => {
    if (!editingCommerçant) return;
    await supabase.from("boutique_groups").update({
      loyer: bLoyer ? parseFloat(bLoyer) : null,
      surface: bSurface ? parseFloat(bSurface) : null,
      date_depot_dat: bDepotDat || null,
      date_validation_dat: bValidDat || null,
      date_livraison_coque: bLivrCoque || null,
      date_ouverture: bOuverture || null,
      date_fermeture: bFermeture || null,
      plan_position_x: bPosX ? parseFloat(bPosX) : null,
      plan_position_y: bPosY ? parseFloat(bPosY) : null,
    } as any).eq("id", editingCommerçant.id);
    toast({ title: "Fiche commerçant mise à jour" });
    setEditingCommerçant(null); fetchAll();
  };

  // Profile editing
  const startEditProfile = (p: Profile) => {
    setEditProfile(p);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditCommerçantName(p.boutique_name ?? "");
    setEditCoordinateurId(p.centre_id ?? "");
  };

  const saveProfile = async () => {
    if (!editProfile) return;
    await supabase.from("profiles").update({
      name: editName,
      email: editEmail,
      boutique_name: editCommerçantName || null,
      centre_id: editCoordinateurId || null,
    } as any).eq("id", editProfile.id);
    toast({ title: "Profil modifié" });
    setEditProfile(null); fetchAll();
  };

  // Quotes
  const addQuote = async () => { if (!newQuote.trim()) return; await supabase.from("motivational_quotes").insert({ text: newQuote } as any); setNewQuote(""); fetchAll(); };
  const deleteQuote = async (id: string) => { await supabase.from("motivational_quotes").delete().eq("id", id); fetchAll(); };

  // Events
  const addEvent = async () => { if (!newEventTitle.trim() || !newEventDate) return; await supabase.from("upcoming_events").insert({ title: newEventTitle, event_date: newEventDate } as any); setNewEventTitle(""); setNewEventDate(""); fetchAll(); };
  const deleteEvent = async (id: string) => { await supabase.from("upcoming_events").delete().eq("id", id); fetchAll(); };

  // Banner
  const uploadBannerImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const addBanner = async () => {
    if (!newBanner.trim() && !bannerImageFile) return;
    let imageUrl: string | null = null;
    if (bannerImageFile) imageUrl = await uploadBannerImage(bannerImageFile);
    await supabase.from("banner_config").insert({ content: newBanner || "", is_active: true, link_url: newBannerLink.trim() || null, image_url: imageUrl } as any);
    setNewBanner(""); setNewBannerLink(""); setBannerImageFile(null); setBannerImagePreview(null); fetchAll();
  };

  const startEditBanner = (b: Banner) => {
    setEditingBanner(b);
    setEditBannerContent(b.content);
    setEditBannerLink(b.link_url ?? "");
    setEditBannerImagePreview(b.image_url ?? null);
    setEditBannerImageFile(null);
  };

  const saveBanner = async () => {
    if (!editingBanner) return;
    let imageUrl = editingBanner.image_url;
    if (editBannerImageFile) imageUrl = await uploadBannerImage(editBannerImageFile);
    await supabase.from("banner_config").update({
      content: editBannerContent,
      link_url: editBannerLink.trim() || null,
      image_url: imageUrl,
    } as any).eq("id", editingBanner.id);
    toast({ title: "Encart modifié" });
    setEditingBanner(null); fetchAll();
  };

  const removeBannerImage = async (b: Banner) => {
    await supabase.from("banner_config").update({ image_url: null } as any).eq("id", b.id);
    if (editingBanner?.id === b.id) setEditBannerImagePreview(null);
    fetchAll();
  };

  const toggleBanner = async (b: Banner) => { await supabase.from("banner_config").update({ is_active: !b.is_active } as any).eq("id", b.id); fetchAll(); };
  const deleteBanner = async (id: string) => { await supabase.from("banner_config").delete().eq("id", id); fetchAll(); };


const filtered = profiles.filter(p =>
  p.name.toLowerCase().includes(search.toLowerCase()) ||
  p.email.toLowerCase().includes(search.toLowerCase()) ||
  (p.boutique_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
);

  const roleBadge: Record<string, { label: string; className: string }> = {
    boutique: { label: "Boutique", className: "bg-primary/20 text-primary border-primary/30" },
    centre: { label: "Centre", className: "bg-violet/20 text-violet border-violet/30" },
    fonciere: { label: "Foncière", className: "bg-teal/20 text-teal border-teal/30" },
    securite: { label: "Sécurité", className: "bg-orange/20 text-orange border-orange/30" },
    proprietaire: { label: "Propriétaire", className: "bg-[hsl(45,90%,50%)]/20 text-[hsl(45,90%,50%)] border-[hsl(45,90%,50%)]/30" },
  };

  const profilesByGroup: Record<string, Profile[]> = {};
  groups.forEach(g => { profilesByGroup[g.id] = []; });
  profilesByGroup["ungrouped"] = [];
  filtered.forEach(p => {
    if (p.boutique_group_id && profilesByGroup[p.boutique_group_id]) {
      profilesByGroup[p.boutique_group_id].push(p);
    } else {
      profilesByGroup["ungrouped"].push(p);
    }
  });

  const sections = [
    { id: "users" as const, label: "Utilisateurs", icon: Users, color: "from-primary to-violet", glow: "hsl(240,70%,60%)", desc: "Profils, rôles, permissions support" },
    { id: "content" as const, label: "Apparence", icon: Palette, color: "from-orange to-violet", glow: "hsl(300,60%,50%)", desc: "Logo, couleurs, accueil, encart, citations, événements" },
  ];

  const sectionTabs: Record<string, { id: any; label: string; icon: any }[]> = {
    users: [
      { id: "profiles", label: "Profils", icon: Users },
      { id: "pending", label: "En attente", icon: Clock },
      { id: "support", label: "Support", icon: LifeBuoy },
    ],
    shops: [
      { id: "commerçants", label: "Commerçants", icon: Store },
      { id: "boitenoire", label: "Types Boîte Noire", icon: Archive },
    ],
    annuaire: [
      { id: "annuaire", label: "Annuaire", icon: BookUser },
    ],
    content: [
      { id: "custom", label: "Personnalisation", icon: Palette },
      { id: "home", label: "Accueil", icon: Home },
      { id: "banner", label: "Encart", icon: Megaphone },
      { id: "quotes", label: "Citations", icon: MessageSquareQuote },
      { id: "events", label: "Événements", icon: Calendar },
      { id: "signalement", label: "Signalement", icon: MapPin },
    ],
  };

  const currentTabs = section === "hub" ? [] : sectionTabs[section] ?? [];

  const enterSection = (id: typeof section) => {
    setSection(id);
    const first = sectionTabs[id]?.[0]?.id;
    if (first) setTab(first);
  };

  // Customization state
  const [customLogoFile, setCustomLogoFile] = useState<File | null>(null);
  const [customLogoPreview, setCustomLogoPreview] = useState<string | null>(settings.logo_url);
  const [customPrimary, setCustomPrimary] = useState(settings.color_primary);
  const [customViolet, setCustomViolet] = useState(settings.color_violet);
  const [customOrange, setCustomOrange] = useState(settings.color_orange);
  const [customTeal, setCustomTeal] = useState(settings.color_teal);
  const [customForeground, setCustomForeground] = useState(settings.color_foreground);
  const [customBackground, setCustomBackground] = useState(settings.color_background);
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    setCustomLogoPreview(settings.logo_url);
    setCustomPrimary(settings.color_primary);
    setCustomViolet(settings.color_violet);
    setCustomOrange(settings.color_orange);
    setCustomTeal(settings.color_teal);
    setCustomForeground(settings.color_foreground);
    setCustomBackground(settings.color_background);
  }, [settings]);

  const hslToHex = (hsl: string) => {
    const parts = hsl.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return "#3b82f6";
    const h = parseFloat(parts[0]); const s = parseFloat(parts[1]) / 100; const l = parseFloat(parts[2]) / 100;
    const a2 = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; const c = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, "0"); };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex: string) => {
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
  };

  const upsertSetting = async (key: string, value: string | null) => {
    const { data } = await supabase.from("app_settings").select("id").eq("key", key).limit(1) as any;
    if (data && data.length > 0) {
      await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() } as any).eq("id", data[0].id);
    } else {
      await supabase.from("app_settings").insert({ key, value } as any);
    }
  };

  const saveCustomization = async () => {
    setSavingCustom(true);
    let logoUrl = settings.logo_url; // keep existing by default
    if (customLogoFile) {
      const ext = customLogoFile.name.split(".").pop();
      const path = `branding/logo.${ext}`;
      await supabase.storage.from("attachments").upload(path, customLogoFile, { upsert: true });
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      logoUrl = data.publicUrl + "?t=" + Date.now();
    } else if (customLogoPreview === null) {
      logoUrl = null; // user explicitly removed logo
    }
    await Promise.all([
      upsertSetting("logo_url", logoUrl),
      upsertSetting("color_primary", customPrimary),
      upsertSetting("color_violet", customViolet),
      upsertSetting("color_orange", customOrange),
      upsertSetting("color_teal", customTeal),
      upsertSetting("color_foreground", customForeground),
      upsertSetting("color_background", customBackground),
    ]);
    refreshSettings();
    setSavingCustom(false);
    toast({ title: "Personnalisation enregistrée" });
  };

  const resetToDefaults = async () => {
    setSavingCustom(true);
    const d = defaults;
    await Promise.all([
      upsertSetting("logo_url", null),
      upsertSetting("color_primary", d.color_primary),
      upsertSetting("color_violet", d.color_violet),
      upsertSetting("color_orange", d.color_orange),
      upsertSetting("color_teal", d.color_teal),
      upsertSetting("color_foreground", d.color_foreground),
      upsertSetting("color_background", d.color_background),
    ]);
    setCustomLogoPreview(null);
    setCustomLogoFile(null);
    setCustomPrimary(d.color_primary);
    setCustomViolet(d.color_violet);
    setCustomOrange(d.color_orange);
    setCustomTeal(d.color_teal);
    setCustomForeground(d.color_foreground);
    setCustomBackground(d.color_background);
    refreshSettings();
    setSavingCustom(false);
    toast({ title: "Style initial restauré" });
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 animate-fade-up">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet" />
            <h2 className="text-lg font-bold font-display">
              {section === "users" ? "Utilisateurs" : sections.find(s => s.id === section)?.label ?? "Administration"}
            </h2>
          </div>
          {section === "users" && tab === "profiles" && (
            <CreateUserDialog onCreated={fetchAll} />
          )}
        </div>

        {/* Sous-onglets de la section active */}
        {section !== "hub" && currentTabs.length > 1 && (
          <div className="flex gap-1 flex-wrap animate-fade-up">
            {currentTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-display transition-all flex items-center gap-1 ${tab === t.id ? "glass border-primary/30 text-primary" : "glass-subtle text-muted-foreground"}`}>
                <t.icon className="w-3 h-3" /> {t.label}
              </button>
            ))}
          </div>
        )}

        {section !== "hub" && <>
        {(tab === "profiles" || tab === "commerçants") && (
          <div className="relative animate-fade-up"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" /></div>
        )}

        {tab === "profiles" && (
          <div className="space-y-3 animate-fade-up">
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-primary">{profiles.length}</p><p className="text-[10px] text-muted-foreground uppercase">Total</p></div>
              <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-orange">{profiles.filter(p => p.is_manager).length}</p><p className="text-[10px] text-muted-foreground uppercase">Managers</p></div>
              <div className="glass-card rounded-2xl p-3 text-center"><p className="text-xl font-bold font-display text-violet">{groups.length}</p><p className="text-[10px] text-muted-foreground uppercase">Commerçants</p></div>
            </div>

            {/* Edit profile modal */}
            {editProfile && (
              <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-semibold">Modifier le profil</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditProfile(null)}><ChevronLeft className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nom</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Email</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nom commerçant</Label><Input value={editCommerçantName} onChange={e => setEditCommerçantName(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                  {isGestionnaire && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Centre de rattachement</Label>
                      <Select value={editCoordinateurId || "none"} onValueChange={v => setEditCoordinateurId(v === "none" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditProfile(null)} className="flex-1 rounded-xl">Annuler</Button>
                  <Button onClick={saveProfile} className="flex-1 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display">Enregistrer</Button>
                </div>
              </div>
            )}

            {filtered.map(profile => {
              const r = getRole(profile.user_id);
              const badge = roleBadge[r] ?? roleBadge.boutique;
              const group = groups.find(g => g.id === profile.boutique_group_id);

              return (
                <div key={profile.id} className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20"><AvatarFallback className="bg-gradient-to-br from-primary to-violet text-white text-xs font-display">{profile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-display">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}{profile.boutique_name ? ` • ${profile.boutique_name}` : ""}</p>
                      {profile.centre_id && <p className="text-[10px] text-teal">Centre: {getCentreName(profile.centre_id)}</p>}
                      {group && <p className="text-[10px] text-violet">Groupe: {group.name}</p>}
                    </div>
                    {profile.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer {profile.name} ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible. Le compte et toutes ses données seront supprimés.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(profile.user_id)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditProfile(profile)}><Edit className="w-3 h-3" /></Button>
                    <Badge className={`${badge.className} text-[10px] border`}>{badge.label}</Badge>
                    {profile.is_manager && <Badge className="bg-orange/20 text-orange border-orange/30 text-[10px] border"><Crown className="w-3 h-3 mr-0.5" />Manager</Badge>}
                  </div>

                  {profile.user_id !== user?.id && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Rôle</label>
                        <Select value={r} onValueChange={(v) => updateRole(profile.user_id, v)}>
                          <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boutique">Boutique</SelectItem>
                            <SelectItem value="securite">Sécurité</SelectItem>
                            {isGestionnaire && <SelectItem value="centre">Centre</SelectItem>}
                            {isGestionnaire && <SelectItem value="fonciere">Foncière</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Commerçant</label>
                        {!profile.boutique_group_id && profile.boutique_name ? (
                          <Button size="sm" className="h-8 text-xs w-full rounded-lg" onClick={() => autoAssignGroup(profile)}>
                            Assigner "{profile.boutique_name}"
                          </Button>
                        ) : (
                          <Select value={profile.boutique_group_id ?? "none"} onValueChange={(v) => assignGroup(profile.id, v === "none" ? null : v)}>
                            <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {isCoordinateurOrGestionnaire && (
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">Centre</label>
                          <Select value={profile.centre_id ?? "none"} onValueChange={(v) => updateCentre(profile.id, v === "none" ? null : v)} disabled={!isGestionnaire}>
                            <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun</SelectItem>
                              {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="text-center">
                        <label className="text-xs text-muted-foreground block mb-1">Manager</label>
                        <Switch checked={profile.is_manager} onCheckedChange={() => toggleManager(profile)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "commerçants" && !editingCommerçant && (
          <div className="space-y-4 animate-fade-up">
            {/* Add commerçant */}
            <div className="flex gap-2">
              <Input value={newCommerçantName} onChange={e => setNewCommerçantName(e.target.value)} placeholder="Ajouter une commerçant..." className="bg-secondary/50 border-border/50" />
              <Button onClick={addCommerçant} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl"><Plus className="w-4 h-4" /></Button>
            </div>

            {groups.map(group => (
              <div key={group.id} className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Store className="w-4 h-4 text-violet" /><h3 className="text-sm font-display font-semibold">{group.name}</h3></div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{profilesByGroup[group.id]?.length ?? 0} membre(s)</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditCommerçant(group)}><Edit className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteGroup(group.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="p-4 pt-2 space-y-1">
                  {group.date_ouverture && <p className="text-[10px] text-muted-foreground">Ouverture: {new Date(group.date_ouverture).toLocaleDateString("fr-FR")}</p>}
                  {group.surface && <p className="text-[10px] text-muted-foreground">Surface: {group.surface} m²</p>}
                  {(profilesByGroup[group.id] ?? []).map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg glass-subtle">
                      <span className="text-xs font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.boutique_name}</span>
                      {p.is_manager && <Crown className="w-3 h-3 text-orange" />}
                    </div>
                  ))}
                  {(profilesByGroup[group.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aucun membre</p>}
                </div>
              </div>
            ))}

            {(profilesByGroup["ungrouped"] ?? []).length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 pb-2"><h3 className="text-sm font-display font-semibold text-muted-foreground">Non assignés</h3></div>
                <div className="p-4 pt-2 space-y-1">
                  {profilesByGroup["ungrouped"].map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg glass-subtle">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.boutique_name}</span>
                      </div>
                      {p.boutique_name && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => autoAssignGroup(p)}>
                          Assigner
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Commerçant identity card editing */}
        {tab === "commerçants" && editingCommerçant && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingCommerçant(null)}><ChevronLeft className="w-4 h-4" /></Button>
              <Store className="w-4 h-4 text-violet" />
              <h3 className="text-sm font-display font-semibold">Fiche identité — {editingCommerçant.name}</h3>
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Loyer (€)</Label><Input type="number" value={bLoyer} onChange={e => setBLoyer(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Surface (m²)</Label><Input type="number" value={bSurface} onChange={e => setBSurface(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Dépôt DAT</Label><Input type="date" value={bDepotDat} onChange={e => setBDepotDat(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Validation DAT</Label><Input type="date" value={bValidDat} onChange={e => setBValidDat(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Livraison coque</Label><Input type="date" value={bLivrCoque} onChange={e => setBLivrCoque(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Date ouverture</Label><Input type="date" value={bOuverture} onChange={e => setBOuverture(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Date fermeture</Label><Input type="date" value={bFermeture} onChange={e => setBFermeture(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
              </div>
            </div>

            {/* Map with draggable pin */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-violet" /><h4 className="text-sm font-display font-semibold">Position sur le plan</h4></div>
              <p className="text-[10px] text-muted-foreground">Cliquez ou glissez le pin pour positionner la commerçant</p>
              <div
                className="relative w-full rounded-xl border-2 border-dashed border-border/50 overflow-hidden cursor-crosshair select-none touch-none"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
                  const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
                  setBPosX(x); setBPosY(y);
                }}
                onTouchStart={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = ((touch.clientX - rect.left) / rect.width * 100).toFixed(1);
                  const y = ((touch.clientY - rect.top) / rect.height * 100).toFixed(1);
                  setBPosX(x); setBPosY(y);
                }}
              >
                <img src={planCoordinateur} alt="Plan du coordinateur" className="w-full" />
                {(bPosX && bPosY) && (
                  <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-sos to-orange flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
                    style={{ left: `${parseFloat(bPosX)}%`, top: `${parseFloat(bPosY)}%`, transform: "translate(-50%, -50%)" }}>
                    <MapPin className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              {(bPosX && bPosY) && <p className="text-[10px] text-muted-foreground text-center">Position: {bPosX}% × {bPosY}%</p>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingCommerçant(null)} className="flex-1 rounded-xl">Annuler</Button>
              <Button onClick={saveCommerçant} className="flex-1 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display">Enregistrer</Button>
            </div>

            {/* Boîte Noire - Historique */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2"><Archive className="w-4 h-4 text-primary" /><h4 className="text-sm font-display font-semibold">Boîte Noire ({boutiqueEvents.length})</h4></div>
              {boutiqueEvents.length === 0 && <p className="text-xs text-muted-foreground">Aucun événement enregistré</p>}
              <div className="space-y-2">
                {boutiqueEvents.map((e: any) => (
                  <div key={e.id} className="glass-subtle rounded-xl p-3 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{e.event_label}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      {e.comment && <p className="text-xs mt-1">{e.comment}</p>}
                      {e.created_by_name && <p className="text-[10px] text-muted-foreground mt-0.5">par {e.created_by_name}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={async () => { await supabase.from("boutique_events").delete().eq("id", e.id); fetchBoutiqueEvents(editingCommerçant!.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "boitenoire" && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground">Configurez les boutons de signalement disponibles dans le module Boîte Noire.</p>
            <div className="flex gap-2">
              <Input value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} placeholder="Nom du bouton (ex: Travaux)" className="bg-secondary/50 border-border/50" />
              <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                <SelectTrigger className="w-28 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Bleu</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="teal">Teal</SelectItem>
                  <SelectItem value="destructive">Rouge</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addEventType} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {eventTypes.map((t: any) => (
                <div key={t.id} className={`glass-card rounded-2xl p-3 flex items-center gap-3 ${!t.is_active ? "opacity-50" : ""}`}>
                  <Archive className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.color ?? "primary"} · {t.is_active ? "actif" : "désactivé"}</p>
                  </div>
                  <Switch checked={t.is_active} onCheckedChange={() => toggleEventType(t.id, t.is_active)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteEventType(t.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "support" && <SupportTab />}
        {tab === "pending" && <PendingAccountsTab />}
        {tab === "home" && <HomeCustomTab centreId={user?.centreId} />}
        {tab === "signalement" && <SignalementSettingsTab />}
        {tab === "annuaire" && <AnnuaireTab />}

        {tab === "quotes" && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex gap-2">
              <Input value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="Nouvelle citation motivante..." className="bg-secondary/50 border-border/50" />
              <Button onClick={addQuote} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl"><Plus className="w-4 h-4" /></Button>
            </div>
            {quotes.map(q => (
              <div key={q.id} className="glass-card rounded-2xl p-3 flex items-center justify-between">
                <p className="text-sm flex-1">{q.text}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => deleteQuote(q.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        )}

        {tab === "events" && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex gap-2">
              <Input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Titre de l'événement" className="bg-secondary/50 border-border/50 flex-1" />
              <Input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="bg-secondary/50 border-border/50 w-40" />
              <Button onClick={addEvent} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl"><Plus className="w-4 h-4" /></Button>
            </div>
            {events.map(ev => (
              <div key={ev.id} className="glass-card rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ev.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteEvent(ev.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        )}

        {tab === "banner" && (
          <div className="space-y-3 animate-fade-up">
            {/* Edit banner */}
            {editingBanner && (
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-semibold">Modifier l'encart</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingBanner(null)}><X className="w-4 h-4" /></Button>
                </div>
                <Input value={editBannerContent} onChange={e => setEditBannerContent(e.target.value)} placeholder="Message de l'encart..." className="bg-secondary/50 border-border/50" />
                <Input value={editBannerLink} onChange={e => setEditBannerLink(e.target.value)} placeholder="Lien (optionnel)" className="bg-secondary/50 border-border/50" />
                {editBannerImagePreview ? (
                  <div className="relative">
                    <img src={editBannerImagePreview} alt="Image encart" className="w-full rounded-xl max-h-32 object-cover" />
                    <button className="absolute top-1 right-1 bg-background/80 rounded-full p-1" onClick={() => { setEditBannerImagePreview(null); setEditBannerImageFile(null); removeBannerImage(editingBanner); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <ImageIcon className="w-4 h-4" /> Ajouter une image
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setEditBannerImageFile(f); setEditBannerImagePreview(URL.createObjectURL(f));
                    }} />
                  </label>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingBanner(null)} className="flex-1 rounded-xl">Annuler</Button>
                  <Button onClick={saveBanner} className="flex-1 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display">Enregistrer</Button>
                </div>
              </div>
            )}

            {/* Add new banner */}
            {!editingBanner && (
              <div className="space-y-2">
                <Input value={newBanner} onChange={e => setNewBanner(e.target.value)} placeholder="Nouveau message d'encart..." className="bg-secondary/50 border-border/50" />
                <Input value={newBannerLink} onChange={e => setNewBannerLink(e.target.value)} placeholder="Lien (optionnel) — ex: https://..." className="bg-secondary/50 border-border/50" />
                {bannerImagePreview ? (
                  <div className="relative">
                    <img src={bannerImagePreview} alt="Preview" className="w-full rounded-xl max-h-32 object-cover" />
                    <button className="absolute top-1 right-1 bg-background/80 rounded-full p-1" onClick={() => { setBannerImageFile(null); setBannerImagePreview(null); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <ImageIcon className="w-4 h-4" /> Ajouter une image (optionnel)
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setBannerImageFile(f); setBannerImagePreview(URL.createObjectURL(f));
                    }} />
                  </label>
                )}
                <Button onClick={addBanner} className="w-full bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
              </div>
            )}

            {/* Banner list */}
            {banners.map(b => (
              <div key={b.id} className="glass-card rounded-2xl p-3 space-y-2">
                {b.image_url && <img src={b.image_url} alt="Encart" className="w-full rounded-xl max-h-28 object-cover" />}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm flex-1">{b.content}</p>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => startEditBanner(b)}><Edit className="w-3 h-3" /></Button>
                  <Switch checked={b.is_active} onCheckedChange={() => toggleBanner(b)} />
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => deleteBanner(b.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                {b.link_url && <p className="text-[10px] text-primary truncate">🔗 {b.link_url}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "custom" && (
          <div className="space-y-4 animate-fade-up">
            {/* Test notifications */}
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-semibold">Notifications push</h3>
                <p className="text-[10px] text-muted-foreground">Envoie une notif test sur cet appareil</p>
              </div>
              <TestNotificationButton />
            </div>
            {/* Logo */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-display font-semibold flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Logo de l'application</h3>
              <p className="text-[10px] text-muted-foreground">Affiché en haut de la page d'accueil</p>
              {customLogoPreview ? (
                <div className="relative inline-block">
                  <img src={customLogoPreview} alt="Logo" className="h-16 object-contain rounded-xl bg-secondary/30 p-2" />
                  <button className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => { setCustomLogoPreview(null); setCustomLogoFile(null); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-20 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs">Choisir un logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setCustomLogoFile(f); setCustomLogoPreview(URL.createObjectURL(f));
                  }} />
                </label>
              )}
            </div>

            {/* Couleurs boutons */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-display font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-violet" /> Couleurs des boutons</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Principale", value: customPrimary, set: setCustomPrimary },
                  { label: "Secondaire", value: customViolet, set: setCustomViolet },
                  { label: "Chaud", value: customOrange, set: setCustomOrange },
                  { label: "Froid", value: customTeal, set: setCustomTeal },
                ].map(c => (
                  <div key={c.label} className="space-y-1 text-center">
                    <label className="text-[10px] text-muted-foreground">{c.label}</label>
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={hslToHex(c.value)} onChange={e => c.set(hexToHsl(e.target.value))} className="w-8 h-8 rounded-lg border border-border/30 cursor-pointer bg-transparent" />
                      <div className="w-full h-4 rounded-md" style={{ background: `hsl(${c.value})` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Couleur typo */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-display font-semibold">Couleur du texte</h3>
              <div className="flex items-center gap-3">
                <input type="color" value={hslToHex(customForeground)} onChange={e => setCustomForeground(hexToHsl(e.target.value))} className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer bg-transparent" />
                <div className="flex-1 h-10 rounded-xl flex items-center justify-center text-sm font-display font-semibold" style={{ color: `hsl(${customForeground})`, background: `hsl(${customBackground})` }}>
                  Aperçu du texte
                </div>
              </div>
            </div>

            {/* Couleur fond */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-display font-semibold">Couleur de fond</h3>
              <div className="flex items-center gap-3">
                <input type="color" value={hslToHex(customBackground)} onChange={e => setCustomBackground(hexToHsl(e.target.value))} className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer bg-transparent" />
                <div className="flex-1 h-10 rounded-xl" style={{ background: `hsl(${customBackground})` }} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="w-full h-12 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display"
                onClick={saveCustomization}
                disabled={savingCustom}
              >
                {savingCustom ? "Enregistrement..." : "Enregistrer la personnalisation"}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl font-display border-border/30"
                onClick={resetToDefaults}
                disabled={savingCustom}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}
        </>}
      </main>
    </div>
  );
}
