import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "./LoginPage";
import MainMenu from "./MainMenu";
import SOSModule from "./SOSModule";
import SignalementModule from "./SignalementModule";
import AccesModule from "./AccesModule";
import SondageModule from "./SondageModule";
import ChatbotModule from "./ChatbotModule";
import CollecteModule from "./CollecteModule";
import CVthequeModule from "./CVthequeModule";
import BonPlanModule from "./BonPlanModule";
import InformationModule from "./InformationModule";
import AdminModule from "./AdminModule";
import ProprietaireModule from "./ProprietaireModule";
import CommercantsModule from "./CommercantsModule";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Screen = "menu" | "sos" | "signalement" | "acces" | "sondage" | "chatbot" | "collecte" | "cvtheque" | "bonplan" | "information" | "admin" | "proprietaire" | "commercants";

const Index = () => {
  const { user, loading, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>("menu");
  const [isPending, setIsPending] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => { setScreen("menu"); }, [user?.id]);

  // Vérifier le statut du compte dès qu'un user est connecté
  useEffect(() => {
    if (!user) { setIsPending(false); return; }
    setCheckingStatus(true);
    supabase
      .from("profiles")
      .select("status")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.status === "pending") {
          setIsPending(true);
          logout(); // déconnecter en arrière-plan
        } else {
          setIsPending(false);
        }
        setCheckingStatus(false);
      });
  }, [user?.id]);

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center animate-fade-up">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-display">Chargement...</p>
        </div>
      </div>
    );
  }

  // Compte en attente
  if (isPending || user?.status === "pending") {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange/20 mb-2">
              <Clock className="w-8 h-8 text-orange" />
            </div>
            <h2 className="text-xl font-bold font-display">Compte en attente</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre compte est en cours de validation par notre équipe.<br />
              Vous pourrez vous connecter <strong>d'ici 24h</strong> une fois votre accès approuvé.
            </p>
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-primary to-violet"
              onClick={() => { setIsPending(false); logout(); }}
            >
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const goBack = () => setScreen("menu");

  switch (screen) {
    case "sos": return <SOSModule onBack={goBack} />;
    case "signalement": return <SignalementModule onBack={goBack} />;
    case "acces": return <AccesModule onBack={goBack} />;
    case "sondage": return <SondageModule onBack={goBack} />;
    case "chatbot": return <ChatbotModule onBack={goBack} />;
    case "collecte": return <CollecteModule onBack={goBack} />;
    case "cvtheque": return <CVthequeModule onBack={goBack} />;
    case "bonplan": return <BonPlanModule onBack={goBack} />;
    case "information": return <InformationModule onBack={goBack} />;
    case "admin": return <AdminModule onBack={goBack} />;
    case "proprietaire": return <ProprietaireModule onBack={goBack} />;
    case "commercants": return <CommercantsModule onBack={goBack} />;
    default: return <MainMenu onNavigate={(m) => setScreen(m as Screen)} />;
  }
};

export default Index;
