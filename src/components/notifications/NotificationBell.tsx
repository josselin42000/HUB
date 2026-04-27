import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, AlertTriangle, Info, Calendar, MessageSquare, CheckCheck, BellRing, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotifRow {
  id: string;
  read_at: string | null;
  notification: {
    id: string;
    title: string;
    body: string;
    link_url: string | null;
    notif_type: string;
    created_by_name: string | null;
    created_at: string;
  };
}

const typeIcon: Record<string, any> = {
  alerte: AlertTriangle,
  evenement: Calendar,
  message: MessageSquare,
  info: Info,
};
const typeColor: Record<string, string> = {
  alerte: "text-destructive",
  evenement: "text-violet",
  message: "text-primary",
  info: "text-muted-foreground",
};

function PushToggle() {
  const { supported, subscribed, loading, subscribe, unsubscribe, permission } = usePushNotifications();
  if (!supported) return null;
  const blocked = permission === "denied";
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs"
      disabled={loading || blocked}
      onClick={() => (subscribed ? unsubscribe() : subscribe())}
      title={blocked ? "Notifications bloquées par le navigateur" : subscribed ? "Désactiver le push" : "Activer le push"}
    >
      {subscribed ? <BellRing className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5" />}
    </Button>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notification_recipients")
      .select("id, read_at, notification:notifications(id, title, body, link_url, notif_type, created_by_name, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as any) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_recipients", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter(i => !i.read_at).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notification_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    load();
  };

  const markRead = async (id: string) => {
    await supabase.from("notification_recipients").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
          <div className="font-display text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-1">
            <PushToggle />
            {unread > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Tout lu
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune notification</div>
          )}
          {items.map(it => {
            const n = it.notification;
            if (!n) return null;
            const Icon = typeIcon[n.notif_type] ?? Info;
            return (
              <button
                key={it.id}
                onClick={() => { markRead(it.id); if (n.link_url) window.location.href = n.link_url; }}
                className={`w-full text-left p-3 border-b border-border/30 hover:bg-muted/30 transition flex gap-2 ${!it.read_at ? "bg-primary/5" : ""}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${typeColor[n.notif_type] ?? ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm truncate">{n.title}</div>
                    {!it.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    {n.created_by_name && <span>{n.created_by_name} · </span>}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
