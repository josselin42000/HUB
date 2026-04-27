import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendPush } from "@/lib/sendPush";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function TestNotificationButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { supported, permission, subscribed, subscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!supported) {
        toast({ title: "Non supporté", description: "Ce navigateur ne gère pas les notifications push.", variant: "destructive" });
        return;
      }
      const ok = await subscribe({ force: true });
      if (!ok) {
        toast({ title: "Permission refusée", description: "Active les notifications dans les réglages.", variant: "destructive" });
        return;
      }
      const result = await sendPush({
        user_ids: [user.id],
        title: "🔔 Test notification",
        body: "Si tu vois ce message, le système push fonctionne correctement !",
        url: "/",
        notif_type: "info",
      });
      if (!result || !result.total) {
        toast({ title: "Aucun abonnement actif", description: "L’iPhone n’a pas encore enregistré un abonnement push valide.", variant: "destructive" });
        return;
      }
      if (!result.sent) {
        toast({ title: "Envoi refusé", description: "Apple a rejeté l’abonnement actuel, il faut recréer l’abonnement push.", variant: "destructive" });
        return;
      }
      toast({ title: "Test envoyé", description: "Vérifie la notification système dans quelques secondes." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleTest} disabled={loading} className="gap-2">
      <Bell className="w-4 h-4" />
      {loading ? "Envoi..." : "Tester les notifications"}
    </Button>
  );
}
