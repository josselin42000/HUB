import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface Data {
  boutique_group_id: string;
  boutique_name: string;
  centre_id: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  responsable_tel_fixe: string | null;
  responsable_tel_mobile: string | null;
  responsable_email: string | null;
  adjoint_nom: string | null;
  adjoint_prenom: string | null;
  adjoint_tel_fixe: string | null;
  adjoint_tel_mobile: string | null;
  adjoint_email: string | null;
  site_internet: string | null;
  numero_local: string | null;
  telephone_boutique: string | null;
  notes: string | null;
}

export default function PublicAnnuaireUpdate() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: rows, error } = await supabase.rpc("get_contacts_by_token", { _token: token });
      if (error) { setError(error.message); setLoading(false); return; }
      const row = (rows as any[])?.[0];
      if (!row) { setError("Lien invalide ou expiré."); setLoading(false); return; }
      setData(row);
      setLoading(false);
    })();
  }, [token]);

  const save = async () => {
    if (!data || !token) return;
    setSaving(true);
    const { data: ok, error } = await supabase.rpc("upsert_contacts_by_token", {
      _token: token,
      _responsable_nom: data.responsable_nom, _responsable_prenom: data.responsable_prenom,
      _responsable_tel_fixe: data.responsable_tel_fixe, _responsable_tel_mobile: data.responsable_tel_mobile,
      _responsable_email: data.responsable_email,
      _adjoint_nom: data.adjoint_nom, _adjoint_prenom: data.adjoint_prenom,
      _adjoint_tel_fixe: data.adjoint_tel_fixe, _adjoint_tel_mobile: data.adjoint_tel_mobile,
      _adjoint_email: data.adjoint_email,
      _site_internet: data.site_internet, _numero_local: data.numero_local, _telephone_boutique: data.telephone_boutique,
      _notes: data.notes,
    });
    setSaving(false);
    if (error || !ok) { toast({ title: "Erreur", description: error?.message ?? "Échec", variant: "destructive" }); return; }
    setDone(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-6 rounded-2xl text-center max-w-md">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <p className="font-display">{error}</p>
      </div>
    </div>
  );
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-8 rounded-2xl text-center max-w-md">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <h1 className="font-display text-lg font-bold">Merci !</h1>
        <p className="text-sm text-muted-foreground mt-2">Vos informations ont bien été enregistrées.</p>
      </div>
    </div>
  );
  if (!data) return null;

  const F = (label: string, key: keyof Data, type: string = "text") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={(data[key] as string) ?? ""} onChange={e => setData({ ...data, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg p-4 flex items-start justify-center">
      <div className="glass rounded-2xl p-5 max-w-2xl w-full my-6 space-y-4">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold">Mise à jour des contacts</h1>
          <p className="text-sm text-muted-foreground">{data.boutique_name}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-sm text-primary">Responsable</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {F("Prénom", "responsable_prenom")}
            {F("Nom", "responsable_nom")}
            {F("Téléphone fixe", "responsable_tel_fixe", "tel")}
            {F("Téléphone mobile", "responsable_tel_mobile", "tel")}
            <div className="sm:col-span-2">{F("Email", "responsable_email", "email")}</div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-sm text-primary">Adjoint</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {F("Prénom", "adjoint_prenom")}
            {F("Nom", "adjoint_nom")}
            {F("Téléphone fixe", "adjoint_tel_fixe", "tel")}
            {F("Téléphone mobile", "adjoint_tel_mobile", "tel")}
            <div className="sm:col-span-2">{F("Email", "adjoint_email", "email")}</div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-sm text-primary">Boutique</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {F("N° de local (ex: A12)", "numero_local")}
            {F("Téléphone boutique", "telephone_boutique", "tel")}
            <div className="sm:col-span-2">{F("Site internet", "site_internet", "url")}</div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Notes</Label>
          <Input value={data.notes ?? ""} onChange={e => setData({ ...data, notes: e.target.value })} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
