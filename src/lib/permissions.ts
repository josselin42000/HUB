import { UserRole } from "@/contexts/AuthContext";

export type Module = "sos" | "signalement" | "acces" | "sondage" | "chatbot" | "collecte" | "cvtheque" | "bonplan" | "information" | "commercants" | "admin" | "proprietaire";

export const ALL_MODULES: Module[] = ["sos", "signalement", "acces", "sondage", "chatbot", "collecte", "cvtheque", "bonplan", "information", "commercants", "admin", "proprietaire"];

const MODULE_ACCESS: Record<UserRole, Module[]> = {
  commerçant: ["sos", "signalement", "acces", "sondage", "chatbot", "collecte", "cvtheque", "bonplan", "information", "commercants"],
  securite: ["sos", "signalement", "acces", "information", "commercants"],
  coordinateur: ["sos", "signalement", "acces", "sondage", "chatbot", "collecte", "cvtheque", "bonplan", "information", "commercants", "admin"],
  gestionnaire: ["sos", "signalement", "acces", "sondage", "chatbot", "collecte", "cvtheque", "bonplan", "information", "commercants", "admin"],
  proprietaire: ["sos", "signalement", "acces", "sondage", "chatbot", "collecte", "cvtheque", "bonplan", "information", "commercants", "admin", "proprietaire"],
};

export type ModuleView = "commerçant" | "gestionnaire" | "securite" | "candidat";

const MODULE_TABS: Record<Module, Partial<Record<UserRole, ModuleView[]>>> = {
  sos: { commerçant: ["commerçant"], securite: ["securite"], coordinateur: ["commerçant", "securite"], gestionnaire: ["commerçant", "securite"], proprietaire: ["commerçant", "securite"] },
  signalement: { commerçant: ["commerçant"], securite: ["securite"], coordinateur: ["commerçant", "securite"], gestionnaire: ["commerçant", "securite"], proprietaire: ["commerçant", "securite"] },
  acces: { commerçant: ["commerçant"], securite: ["securite"], coordinateur: ["commerçant", "securite"], gestionnaire: ["commerçant", "securite"], proprietaire: ["commerçant", "securite"] },
  sondage: { commerçant: ["commerçant"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  chatbot: { commerçant: ["commerçant"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  collecte: { commerçant: ["commerçant"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  cvtheque: { commerçant: ["commerçant"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  bonplan: { commerçant: ["commerçant"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  information: { commerçant: ["commerçant"], securite: ["securite"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  commercants: { commerçant: ["commerçant"], securite: ["securite"], coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  admin: { coordinateur: ["gestionnaire"], gestionnaire: ["gestionnaire"], proprietaire: ["gestionnaire"] },
  proprietaire: { proprietaire: ["gestionnaire"] },
};

export function canAccessModule(role: UserRole, module: Module): boolean {
  return MODULE_ACCESS[role].includes(module);
}

export function getAccessibleModules(role: UserRole): Module[] {
  return MODULE_ACCESS[role];
}

export function getModuleTabs(role: UserRole, module: Module): ModuleView[] {
  return MODULE_TABS[module]?.[role] ?? [];
}

export function isAdminRole(role: UserRole): boolean {
  return role === "coordinateur" || role === "gestionnaire" || role === "proprietaire";
}

export function isProprietaire(role: UserRole): boolean {
  return role === "proprietaire";
}
