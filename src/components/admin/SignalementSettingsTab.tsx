import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ZoomIn, ZoomOut, X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCentre } from "@/contexts/CentreContext";

export default function SignalementSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();
  const centreId = selectedCentreId ?? user?.centre_id ?? null;

  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const lastDist = useRef<number | null>(null);
  const lastZoom = useRef(1);

  const fetchPlan = async (cid: string | null) => {
    setPlanUrl(null);
    if (!cid) return;
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "plan_image_url")
      .eq("centre_id", cid)
      .maybeSingle();
    setPlanUrl(data?.value ?? null);
  };

  useEffect(() => { fetchPlan(centreId); }, [centreId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !centreId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `plans/${centreId}/plan.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
      const url = urlData.publicUrl;
      await supabase.from("app_settings").upsert(
        { key: "plan_image_url", value: url, centre_id: centreId, updated_at: new Date().toISOString() },
        { onConflict: "key,centre_id" }
      );
      setPlanUrl(url);
      toast({ title: "Plan mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const removePlan = async () => {
    if (!centreId) return;
    await supabase.from("app_settings").delete()
      .eq("key", "plan_image_url").eq("centre_id", centreId);
    setPlanUrl(null);
    toast({ title: "Plan supprimé" });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
      lastZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastDist.current;
      const newZoom = Math.min(4, Math.max(0.5, lastZoom.current * scale));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => { lastDist.current = null; };
  const closeZoom = () => { setZoomOpen(false); setZoom(1); };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Plan du centre
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Ce plan s'affiche dans le module Signalement
            </p>
          </div>
          <Button
            size="sm" variant="outline" className="rounded-xl gap-1 text-xs"
            onClick={() => fileRef.current?.click()} disabled={uploading}
          >
            <Upload className="w-3 h-3" />
            {uploading ? "Envoi..." : planUrl ? "Changer" : "Uploader"}
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {planUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden border border-border/30">
              <img src={planUrl} alt="Plan" className="w-full object-contain max-h-48" />
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => setZoomOpen(true)} className="bg-background/80 backdrop-blur rounded-lg p-1.5 hover:bg-background transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={removePlan} className="bg-background/80 backdrop-blur rounded-lg p-1.5 hover:bg-destructive/20 transition-colors text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Pincez pour zoomer dans la prévisualisation</p>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer"
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs">Uploader le plan du centre (PNG, JPG)</span>
          </button>
        )}
      </div>

      {zoomOpen && planUrl && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col touch-none">
          <div className="flex items-center justify-between p-4">
            <p className="text-sm font-display font-semibold">Plan du centre</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="bg-muted rounded-lg p-2">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="bg-muted rounded-lg p-2">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={closeZoom} className="bg-muted rounded-lg p-2 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={planUrl}
              alt="Plan zoomé"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                transition: lastDist.current ? "none" : "transform 0.2s",
                maxWidth: "100%",
                cursor: zoom > 1 ? "grab" : "default",
                userSelect: "none",
              }}
              draggable={false}
            />
          </div>
          <p className="text-center text-[10px] text-muted-foreground pb-4">Pincez pour zoomer · Boutons +/- pour ajuster</p>
        </div>
      )}
    </div>
  );
}
