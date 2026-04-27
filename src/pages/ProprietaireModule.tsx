import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Crown, ChevronLeft, Search, Plus, Trash2, Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_MODULES, Module } from "@/lib/permissions";
import TestNotificationButton from "@/components/notifications/TestNotificationButton";

interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  centre_id: string | null;
  modules: Module[];
}

interface Centre { id: string; name: string; }

const MODULE_LABELS: Record<string, string> = {
  sos: "Alerte", signalement: "Signaler", acces: "Laisser-Passer", sondage: "Sondage",
  chatbot: "Steel Com IA", collecte: "Collecte CA", cvtheque: "CVthèque",
  bonplan: "Bons Plans", information: "Infos", admin: "Admin",
};

const MANAGEABLE_MODULES = ALL_MODULES.filter(m => m !== "proprietaire");

export default function ProprietaireModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("fonciere");
  const [newCentreId, setNewCentreId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAdmins = async () => {
    // Get all users with fonciere or centre roles
    const { data: roles } = await supabase.from("user_roles").select("*");
    const adminRoles = (roles ?? []).filter((r: any) => r.role === "fonciere" || r.role === "centre");
    if (adminRoles.length === 0) { setAdmins([]); return; }

    const userIds = adminRoles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    const { data: moduleAccess } = await supabase.from("admin_module_access").select("*") as any;

    const adminList: AdminUser[] = adminRoles.map((r: any) => {
      const profile = (profiles ?? []).find((p: any) => p.user_id === r.user_id);
      const modules = (moduleAccess ?? [])
        .filter((m: any) => m.user_id === r.user_id)
        .map((m: any) => m.module as Module);
      return {
        user_id: r.user_id,
        name: profile?.name ?? "",
        email: profile?.email ?? "",
        role: r.role,
        centre_id: profile?.centre_id ?? null,
        modules,
      };
    });
    setAdmins(adminList);
  };

  const fetchCentres = async () => {
    const { data } = await supabase.from("centres").select("id, name").order("name");
    if (data) setCentres(data);
  };

  useEffect(() => { fetchAdmins(); fetchCentres(); }, []);

  const toggleModule = async (userId: string, module: Module, hasAccess: boolean) => {
    if (hasAccess) {
      await (supabase.from("admin_module_access") as any).delete().eq("user_id", userId).eq("module", module);
    } else {
      await (supabase.from("admin_module_access") as any).insert({ user_id: userId, module, granted_by: user?.id });
    }
    fetchAdmins();
  };

  const grantAllModules = async (userId: string) => {
    const existing = admins.find(a => a.user_id === userId)?.modules ?? [];
    const toAdd = MANAGEABLE_MODULES.filter(m => !existing.includes(m));
    if (toAdd.length > 0) {
      await (supabase.from("admin_module_access") as any).insert(
        toAdd.map(m => ({ user_id: userId, module: m, granted_by: user?.id }))
      );
    }
    fetchAdmins();
    toast({ title: "Tous les modules activés" });
  };

  const revokeAllModules = async (userId: string) => {
    await (supabase.from("admin_module_access") as any).delete().eq("user_id", userId);
    fetchAdmins();
    toast({ title: "Tous les modules désactivés" });
  };

  const createAdmin = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-admin-user", {
        body: { email: newEmail, password: newPassword, name: newName },
      });
      if (res.error) throw res.error;
      const userId = res.data?.user_id;

      // Set the correct role (fonciere or centre)
      if (userId) {
        await supabase.from("user_roles").update({ role: newRole } as any).eq("user_id", userId);
        if (newCentreId) {
          await supabase.from("profiles").update({ centre_id: newCentreId } as any).eq("user_id", userId);
        }
      }

      toast({ title: "Administrateur créé", description: newEmail });
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewCentreId("");
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const deleteAdmin = async (userId: string) => {
    try {
      await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
      toast({ title: "Administrateur supprimé" });
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge: Record<string, { label: string; className: string }> = {
    fonciere: { label: "Foncière", className: "bg-teal/20 text-teal border-teal/30" },
    centre: { label: "Centre", className: "bg-violet/20 text-violet border-violet/30" },
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(45,90%,50%)] to-[hsl(30,90%,45%)] flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">Gestion Propriétaire</h1>
            <p className="text-xs text-muted-foreground">Créer des administrateurs et gérer leurs accès modules</p>
          </div>
        </div>

        {/* Test notifications */}
        <div className="glass-card rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-display font-semibold">Notifications push</p>
            <p className="text-[10px] text-muted-foreground">Envoie une notif test sur cet appareil</p>
          </div>
          <TestNotificationButton />
        </div>

        {/* Create admin */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-bold font-display mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Créer un administrateur
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <Input placeholder="Nom" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <Input placeholder="Mot de passe" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div className="flex gap-3">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fonciere">Foncière (global)</SelectItem>
                  <SelectItem value="centre">Centre (local)</SelectItem>
                </SelectContent>
              </Select>
              {newRole === "centre" && (
                <Select value={newCentreId} onValueChange={setNewCentreId}>
                  <SelectTrigger><SelectValue placeholder="Centre..." /></SelectTrigger>
                  <SelectContent>
                    {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={createAdmin} disabled={creating} className="w-full">
              {creating ? "Création..." : "Créer l'administrateur"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Admin list */}
        <div className="space-y-4">
          {filtered.map(admin => {
            const badge = roleBadge[admin.role] ?? { label: admin.role, className: "bg-muted" };
            return (
              <div key={admin.user_id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold font-display text-sm">{admin.name}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={badge.className}>{badge.label}</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {admin.name} ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteAdmin(admin.user_id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Module toggles */}
                <div className="border-t border-border/30 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-display font-semibold text-muted-foreground">Modules autorisés</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => grantAllModules(admin.user_id)}>Tout activer</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => revokeAllModules(admin.user_id)}>Tout retirer</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MANAGEABLE_MODULES.map(mod => {
                      const hasAccess = admin.modules.includes(mod);
                      return (
                        <div key={mod} className="flex items-center justify-between gap-2">
                          <Label className="text-xs">{MODULE_LABELS[mod] ?? mod}</Label>
                          <Switch checked={hasAccess} onCheckedChange={() => toggleModule(admin.user_id, mod, hasAccess)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun administrateur trouvé</p>
          )}
        </div>
      </main>
    </div>
  );
}
