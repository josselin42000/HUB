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
  const centreId = selectedCentreId ?? user?.centreId ?? null;

  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pinch-to-zoom state
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

  // ... (reste du fichier identique, aucune modification)
