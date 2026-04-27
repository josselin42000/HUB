import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "commerçant" | "securite" | "coordinateur" | "gestionnaire" | "proprietaire";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  nom?: string;
  prenom?: string;
  centre_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  pendingAccount: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, role: UserRole, nom?: string, prenom?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAccount, setPendingAccount] = useState(false);

  async function fetchProfile(userId: string): Promise<AuthUser | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return {
      id: userId,
      email: data.email ?? "",
      role: data.role as UserRole,
      status: data.status ?? "active",
      nom: data.nom ?? undefined,
      prenom: data.prenom ?? undefined,
      centre_id: data.centre_id ?? undefined,
    };
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signup(
    email: string,
    password: string,
    role: UserRole,
    nom?: string,
    prenom?: string
  ): Promise<{ error: string | null }> {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return { error: error?.message ?? "Erreur lors de l'inscription" };
    }
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: data.user.id,
      email,
      role,
      nom: nom ?? null,
      prenom: prenom ?? null,
      status: "pending",
    });
    setLoading(false);
    if (profileError) return { error: profileError.message };
    setPendingAccount(true);
    return { error: null };
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    setUser(null);
    setPendingAccount(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, pendingAccount, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
