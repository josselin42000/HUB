import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Centre { id: string; name: string; }

export default function CreateUserDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("securite");
  const [boutiqueName, setBoutiqueName] = useState("");
  const [centreId, setCentreId] = useState<string>("");
  const [isManager, setIsManager] = useState(false);
  const [isSupport, setIsSupport] = useState(false);

  const isProprio = user?.role === "proprietaire";
  const isGestionnaire = user?.role === "gestionnaire";
  const canPickCentre = isProprio || isGestionnaire;

  useEffect(() => {
    if (!open) return;
    supabase.from("centres").select("id, name").order("name").then(({ data }) => {
      if (data) setCentres(data as Centre[]);
    });
    if (user?.centreId && !canPickCentre) setCentreId(user.centreId);
  }, [open]);

  const submit = async () => {
    if (!email || !password || !name) {
      toast({ title: "Champs manquants", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email, password, name, role,
          boutique_name: role === "boutique" ? boutiqueName || null : null,
          centre_id: centreId || user?.centreId || null,
          is_manager: role === "boutique" ? isManager : false,
          is_support: isSupport,
        },
      });
      if (res.error) throw res.error;
      const data: any = res.data;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Compte créé" });
      setOpen(false);
      setEmail(""); setPassword(""); setName(""); setBoutiqueName("");
      setIsManager(false); setIsSupport(false);
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r from-primary to-violet rounded-xl font-display gap-1">
          <UserPlus className="w-4 h-4" /> Créer un compte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Nouveau compte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom complet</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mot de passe</Label>
            <Input type="text" value={password} onChange={e => setPassword(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boutique">Boutique</SelectItem>
                <SelectItem value="securite">Sécurité</SelectItem>
                <SelectItem value="centre">Coordinateur (Centre)</SelectItem>
                {isProprio && <SelectItem value="fonciere">Foncière (Gestionnaire)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {role === "boutique" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Nom de la boutique</Label>
                <Input value={boutiqueName} onChange={e => setBoutiqueName(e.target.value)} className="bg-secondary/50" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Manager</Label>
                <Switch checked={isManager} onCheckedChange={setIsManager} />
              </div>
            </>
          )}
          {canPickCentre && (
            <div className="space-y-1">
              <Label className="text-xs">Centre</Label>
              <Select value={centreId || "none"} onValueChange={v => setCentreId(v === "none" ? "" : v)}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/30 pt-2">
            <Label className="text-xs">Activer accès Support</Label>
            <Switch checked={isSupport} onCheckedChange={setIsSupport} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuler</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-to-r from-primary to-violet rounded-xl">
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
