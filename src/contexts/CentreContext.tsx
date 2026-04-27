import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Centre { id: string; name: string }

interface CentreContextType {
  centres: Centre[];
  selectedCentreId: string | null; // null = tous
  setSelectedCentreId: (id: string | null) => void;
  isMultiCentre: boolean; // true si l'utilisateur peut switcher (foncière/proprio)
}

const CentreContext = createContext<CentreContextType | null>(null);
const STORAGE_KEY = "selected_centre_id";

export function CentreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentreId, setSelectedCentreIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const isMultiCentre = user?.role === "gestionnaire" || user?.role === "proprietaire";

  useEffect(() => {
    if (!isMultiCentre) {
      setCentres([]);
      return;
    }
    supabase.from("centres").select("id, name").order("name").then(({ data }) => {
      setCentres((data ?? []) as Centre[]);
    });
  }, [isMultiCentre]);

  const setSelectedCentreId = (id: string | null) => {
    setSelectedCentreIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CentreContext.Provider value={{ centres, selectedCentreId, setSelectedCentreId, isMultiCentre }}>
      {children}
    </CentreContext.Provider>
  );
}

export function useCentre() {
  const ctx = useContext(CentreContext);
  if (!ctx) throw new Error("useCentre must be used within CentreProvider");
  return ctx;
}
