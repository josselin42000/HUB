import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, Fingerprint, Mail, Store, UserPlus, MapPin, CheckCircle, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const { login, signup, loading, pendingAccount } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [commerçantName, setCommerçantName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingCommerçants, setExistingCommerçants] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [centres, setCentres] = useState<{ id: string; name: string }[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    supabase.from("boutique_groups").select("name").order("name").then(({ data }) => {
      if (data) setExistingCommerçants(data.map(d => d.name));
    });
    supabase.from("centres").select("id, name").order("name").then(({ data }) => {
      if (data) setCentres(data as { id: string; name: string }[]);
    });
  }, []);

  const filteredSuggestions = commerçantName.length > 0
    ? existingCommerçants.filter(b => b.toLowerCase().includes(commerçantName.toLowerCase()))
    : existingCommerçants;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isSignup) {
      if (!commerçantName.trim()) { setError("Le nom de la boutique est requis."); setSubmitting(false); return; }
      if (!selectedCentreId) { setError("Veuillez sélectionner un centre."); setSubmitting(false); return; }
      const { error } = await signup(email, password, name, commerçantName, selectedCentreId);
      if (error) {
        setError(error);
      } else {
        setSignupSuccess(true);
      }
    } else {
      const { error } = await login(email, password);
      if (error && error !== "pending") setError(error);
    }
    setSubmitting(false);
  };

  // Écran compte en attente (après login ou signup)
  if (signupSuccess || pendingAccount) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange/20 mb-2">
              <Clock className="w-8 h-8 text-orange" />
            </div>
            <h2 className="text-xl font-bold font-display">
              {signupSuccess ? "Demande envoyée !" : "Compte en attente"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre compte est en cours de validation par notre équipe.<br />
              Vous pourrez vous connecter <strong>d'ici 24h</strong> une fois votre accès approuvé.
            </p>
            {signupSuccess && (
              <p className="text-xs text-muted-foreground">
                Demande enregistrée pour <strong>{email}</strong>
              </p>
            )}
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-primary to-violet"
              onClick={() => {
                setSignupSuccess(false);
                setIsSignup(false);
                setEmail("");
                setPassword("");
                setName("");
                setCommerçantName("");
                setSelectedCentreId("");
              }}
            >
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/20 blur-[100px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-violet/20 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal/10 blur-[120px]" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass glow-primary mb-4 relative">
            <Shield className="w-10 h-10 text-primary" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold font-display gradient-text">Coordinateur Commercial</h1>
          <p className="text-muted-foreground text-sm mt-1 tracking-wide">Système de Gestion</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">{isSignup ? "Inscription Commerçant" : "Connexion"}</h2>
          </div>

          {isSignup && (
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Marie Dupont" className="pl-10 bg-secondary/50 border-border/50" required />
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nom de la boutique</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={commerçantName}
                    onChange={e => { setCommerçantName(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Boulanger" className="pl-10 bg-secondary/50 border-border/50" required />
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 glass-card rounded-xl border border-border/30 max-h-32 overflow-y-auto">
                    {filteredSuggestions.map(b => (
                      <button key={b} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors cursor-pointer"
                        onMouseDown={() => { setCommerçantName(b); setShowSuggestions(false); }}>
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Centre commercial</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select value={selectedCentreId} onValueChange={setSelectedCentreId}>
                    <SelectTrigger className="pl-10 bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Sélectionner un centre" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {centres.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" className="pl-10 bg-secondary/50 border-border/50" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-secondary/50 border-border/50" required minLength={6} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-to-r from-primary to-violet hover:opacity-90 transition-opacity font-display font-medium tracking-wide">
            {submitting ? "Chargement..." : isSignup ? "Créer mon compte" : "Se connecter"}
          </Button>

          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(""); }} className="w-full text-xs text-center text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-1">
            <UserPlus className="w-3 h-3" />
            {isSignup ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire (Commerçant)"}
          </button>
        </form>
      </div>
    </div>
  );
}
