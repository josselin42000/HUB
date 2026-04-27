import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ChevronLeft, User as UserIcon, Store, KeyRound, Palette, Building2, Check, ChevronDown } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import AppearanceSettings from "@/components/AppearanceSettings";
import { isAdminRole } from "@/lib/permissions";
import { useCentre } from "@/contexts/CentreContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatShortDate = () => {
  const d = new Date();
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

const roleBadge: Record<string, { label: string; className: string }> = {
  commerçant: { label: "Commerçant", className: "bg-primary/20 text-primary border-primary/30" },
  coordinateur: { label: "Coordinateur", className: "bg-violet/20 text-violet border-violet/30" },
  gestionnaire: { label: "Foncière", className: "bg-teal/20 text-teal border-teal/30" },
  securite: { label: "Sécurité", className: "bg-orange/20 text-orange border-orange/30" },
  proprietaire: { label: "Propriétaire", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

export default function AppHeader({ onBack }: { onBack?: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { centres, selectedCentreId, setSelectedCentreId, isMultiCentre } = useCentre();
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [boutique, setBoutique] = useState(user?.commerçant ?? "");
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  if (!user) return null;
  const badge = roleBadge[user.role] ?? roleBadge.commerçant;
  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, boutique_name: boutique || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profil mis à jour" });
    setProfileOpen(false);
    // Refresh page to reload user context
    setTimeout(() => window.location.reload(), 400);
  };

  const savePassword = async () => {
    if (newPwd.length < 6) {
      toast({ title: "Mot de passe trop court", description: "6 caractères minimum", variant: "destructive" });
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mot de passe modifié" });
    setNewPwd("");
    setPwdOpen(false);
  };

  const abbreviateCentre = (name: string) => {
    const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (n.includes("heure tranquille")) return "LHT";
    if (n.includes("beaugrenelle")) return "BGL";
    if (n.includes("orne")) return "RDO";
    if (n.includes("villette") || n.includes("vilette")) return "BBV";
    return name;
  };
  const currentCentreName = selectedCentreId ? (centres.find(c => c.id === selectedCentreId)?.name ?? "—") : "Tous";

  return (
    <>
      <header
        className="glass sticky top-0 z-50 px-3 py-1.5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.375rem)",
          display: "grid",
          gridTemplateColumns: "1fr auto auto 1fr",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Cellule 1 : Apsys + badge — aligné à gauche dans sa cellule */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden justify-self-start">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="text-foreground hover:bg-accent/50 rounded-xl shrink-0 h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-sm font-medium font-display leading-tight truncate">{user.name}</span>
            <div className="flex items-center gap-1">
              <Badge className={`${badge.className} text-[9px] border px-1.5 py-0 shrink-0`}>{badge.label}</Badge>
              {user.commerçant && <span className="text-[9px] text-muted-foreground truncate">{user.commerçant}</span>}
            </div>
          </div>
        </div>

        {/* Cellule 2 : Bouton centre — centré */}
        <div className="justify-self-center">
          {isMultiCentre && centres.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 bg-primary/15 text-primary border border-primary/30 rounded-full px-2 py-0.5 text-[11px] font-display font-semibold hover:bg-primary/25 transition-colors">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="max-w-[72px] truncate">{abbreviateCentre(currentCentreName)}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Centre affiché
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedCentreId(null)}>
                  {selectedCentreId === null && <Check className="h-3.5 w-3.5 mr-2" />}
                  <span className={selectedCentreId === null ? "" : "ml-[22px]"}>Tous les centres</span>
                </DropdownMenuItem>
                {centres.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => setSelectedCentreId(c.id)}>
                    {selectedCentreId === c.id && <Check className="h-3.5 w-3.5 mr-2" />}
                    <span className={selectedCentreId === c.id ? "" : "ml-[22px]"}>{c.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Cellule 3 : Date — centré */}
        <span className="text-xs text-foreground/80 font-display tracking-wide font-medium whitespace-nowrap justify-self-center">
          {formatShortDate()}
        </span>

        {/* Cellule 4 : Cloche + Avatar — alignés à droite */}
        <div className="flex items-center gap-2 justify-self-end">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
                <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-violet text-primary-foreground text-xs font-display">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm">{user.name}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setName(user.name); setBoutique(user.commerçant ?? ""); setProfileOpen(true); }}>
                <UserIcon className="h-4 w-4 mr-2" /> Mon profil
              </DropdownMenuItem>
              {user.commerçant && (
                <DropdownMenuItem onClick={() => { setName(user.name); setBoutique(user.commerçant ?? ""); setProfileOpen(true); }}>
                  <Store className="h-4 w-4 mr-2" /> Ma boutique
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setPwdOpen(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> Mot de passe
              </DropdownMenuItem>
              {isAdminRole(user.role) && (
                <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
                  <Palette className="h-4 w-4 mr-2" /> Apparence
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription>Modifiez vos informations personnelles</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="prof-name">Nom</Label>
              <Input id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="prof-email">Email</Label>
              <Input id="prof-email" value={user.email} disabled />
            </div>
            {(user.commerçant !== undefined || user.role === "commerçant") && (
              <div>
                <Label htmlFor="prof-boutique">Boutique</Label>
                <Input id="prof-boutique" value={boutique} onChange={(e) => setBoutique(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Annuler</Button>
            <Button onClick={saveProfile} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer mon mot de passe</DialogTitle>
            <DialogDescription>Minimum 6 caractères</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
            <Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>Annuler</Button>
            <Button onClick={savePassword} disabled={pwdSaving}>{pwdSaving ? "…" : "Modifier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apparence de l'application</DialogTitle>
            <DialogDescription>Logo, couleurs, notifications</DialogDescription>
          </DialogHeader>
          <AppearanceSettings />
        </DialogContent>
      </Dialog>
    </>
  );
}
