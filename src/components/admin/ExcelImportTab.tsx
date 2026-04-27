import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type BoutiqueRow = { name: string; surface?: number; loyer?: number; charges?: number; secteur?: string };
type CARow = { boutique: string; mois: string; ca_ht: number };

const MONTH_MAP: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1, january: 1,
  fev: 2, fevr: 2, fevrier: 2, february: 2, feb: 2,
  mar: 3, mars: 3, march: 3,
  avr: 4, avril: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  jun: 6, juin: 6, june: 6,
  jul: 7, juil: 7, juill: 7, juillet: 7, july: 7,
  aou: 8, aout: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septembre: 9, september: 9,
  oct: 10, octobre: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dec: 12, decembre: 12, december: 12,
};

function normalize(s: any): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function parseMonthHeader(header: any): string | null {
  if (header instanceof Date && !isNaN(header.getTime())) {
    return `${header.getFullYear()}-${String(header.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof header === "number" && header > 10000 && header < 100000) {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(header);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}`;
  }
  const raw = String(header ?? "").trim();
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[._/]/g, "-").replace(/\s+/g, "-");
  let m = s.match(/^(\d{4})-(\d{1,2})$/); if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})-(\d{4})$/); if (m) return `${m[2]}-${String(+m[1]).padStart(2, "0")}`;
  m = s.match(/^([a-zéèêûôîçàâ]+)-?(\d{2,4})$/);
  if (m) {
    const base = m[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const monthNum = MONTH_MAP[base.slice(0, 5)] ?? MONTH_MAP[base.slice(0, 4)] ?? MONTH_MAP[base.slice(0, 3)];
    if (monthNum) {
      let y = +m[2]; if (y < 100) y += 2000;
      return `${y}-${String(monthNum).padStart(2, "0")}`;
    }
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const str = String(v).trim();
  if (!str || str === "-") return undefined;
  const n = Number(str.replace(/[\s€$m²]/gi, "").replace(",", "."));
  return isNaN(n) ? undefined : n;
}

// Aliases normalisés (sans accents/espaces)
const ALIASES = {
  name: ["enseigne", "boutique", "nom", "nomboutique", "name", "shop"],
  secteur: ["secteur", "categorie", "category", "sector"],
  surface: ["surfacegla", "surface", "gla", "m2", "superficie"],
  loyer: ["lmg", "loyer", "loyermg", "loyerminimumgaranti", "rent"],
  charges: ["chargestaxes", "charges", "chargesettaxes", "taxes"],
};

function findColumn(headers: any[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const n = normalize(headers[i]);
    if (aliases.some(a => n === a || n.includes(a))) return i;
  }
  return -1;
}

export default function ExcelImportTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    boutiques: BoutiqueRow[];
    ca: CARow[];
    openings: { boutique: string; date: string }[];
    detectedColumns: { name: string; secteur: string; surface: string; loyer: string; charges: string; months: number };
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
      if (!aoa.length) { toast({ title: "Fichier vide", variant: "destructive" }); return; }

      const headers = aoa[0];
      const idx = {
        name: findColumn(headers, ALIASES.name),
        secteur: findColumn(headers, ALIASES.secteur),
        surface: findColumn(headers, ALIASES.surface),
        loyer: findColumn(headers, ALIASES.loyer),
        charges: findColumn(headers, ALIASES.charges),
      };
      if (idx.name < 0) {
        toast({ title: "Colonne enseigne introuvable", description: "Une colonne 'Enseigne' ou 'Boutique' est requise.", variant: "destructive" });
        return;
      }

      // Détecter colonnes mois
      const monthCols: { col: number; mois: string }[] = [];
      headers.forEach((h, i) => {
        const m = parseMonthHeader(h);
        if (m) monthCols.push({ col: i, mois: m });
      });

      const boutiques: BoutiqueRow[] = [];
      const ca: CARow[] = [];
      const openings: { boutique: string; date: string }[] = [];

      for (let r = 1; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row) continue;
        const name = String(row[idx.name] ?? "").trim();
        if (!name) continue;
        boutiques.push({
          name,
          secteur: idx.secteur >= 0 ? String(row[idx.secteur] ?? "").trim() || undefined : undefined,
          surface: idx.surface >= 0 ? parseNumber(row[idx.surface]) : undefined,
          loyer: idx.loyer >= 0 ? parseNumber(row[idx.loyer]) : undefined,
          charges: idx.charges >= 0 ? parseNumber(row[idx.charges]) : undefined,
        });
        let firstMonth: string | null = null;
        for (const { col, mois } of monthCols) {
          const v = parseNumber(row[col]);
          if (v !== undefined && v > 0) {
            ca.push({ boutique: name, mois, ca_ht: v });
            if (!firstMonth || mois < firstMonth) firstMonth = mois;
          }
        }
        if (firstMonth) openings.push({ boutique: name, date: `${firstMonth}-01` });
      }

      if (!boutiques.length) { toast({ title: "Aucune boutique détectée", variant: "destructive" }); return; }

      setPreview({
        boutiques, ca, openings,
        detectedColumns: {
          name: String(headers[idx.name]),
          secteur: idx.secteur >= 0 ? String(headers[idx.secteur]) : "—",
          surface: idx.surface >= 0 ? String(headers[idx.surface]) : "—",
          loyer: idx.loyer >= 0 ? String(headers[idx.loyer]) : "—",
          charges: idx.charges >= 0 ? String(headers[idx.charges]) : "—",
          months: monthCols.length,
        },
      });
    } catch (e: any) {
      toast({ title: "Erreur lecture", description: e.message, variant: "destructive" });
    }
  };

  const runImport = async () => {
    if (!preview || !user) return;
    setImporting(true);
    const { data: profile } = await supabase.from("profiles").select("centre_id").eq("user_id", user.id).maybeSingle();
    const centre_id = profile?.centre_id ?? null;
    if (!centre_id) {
      toast({ title: "Centre introuvable", description: "Votre profil n'est rattaché à aucun centre.", variant: "destructive" });
      setImporting(false);
      return;
    }
    let bCreated = 0, bUpdated = 0, bErr = 0;
    const idByName: Record<string, string> = {};

    for (const row of preview.boutiques) {
      const { data: existing } = await supabase.from("boutique_groups").select("id").ilike("name", row.name).maybeSingle();
      const payload: any = { name: row.name, surface: row.surface, loyer: row.loyer, charges: row.charges, secteur: row.secteur, centre_id };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      if (existing) {
        const { error } = await supabase.from("boutique_groups").update(payload).eq("id", existing.id);
        if (error) bErr++; else { bUpdated++; idByName[row.name.toLowerCase()] = existing.id; }
      } else {
        const { data, error } = await supabase.from("boutique_groups").insert(payload).select("id").single();
        if (error) bErr++; else { bCreated++; if (data) idByName[row.name.toLowerCase()] = data.id; }
      }
    }

    let caInserted = 0, caErr = 0;
    for (const r of preview.ca) {
      const { error } = await supabase.from("ca_collecte").insert({
        user_id: user.id, boutique_name: r.boutique, mois: r.mois, ca_ht: r.ca_ht, centre_id,
      } as any);
      if (error) caErr++; else caInserted++;
    }

    let openingsSet = 0;
    for (const op of preview.openings) {
      const { data: bg } = await supabase.from("boutique_groups").select("id, date_ouverture").ilike("name", op.boutique).maybeSingle();
      if (bg && !bg.date_ouverture) {
        await supabase.from("boutique_groups").update({ date_ouverture: op.date }).eq("id", bg.id);
        openingsSet++;
      }
    }

    setImporting(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    toast({
      title: "Import terminé",
      description: `Boutiques : ${bCreated} créée(s), ${bUpdated} màj${bErr ? `, ${bErr} err.` : ""}. CA : ${caInserted} ligne(s)${caErr ? `, ${caErr} err.` : ""}. Ouvertures : ${openingsSet}.`,
    });
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Enseigne", "Secteur", "Surface GLA", "LMG", "Charges & Taxes", "2024-01", "2024-02", "2024-03"],
      ["Exemple Boutique", "Mode", "80 m²", 5000, 800, 12000, 11500, 13200],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Boutiques");
    XLSX.writeFile(wb, "template-import.xlsx");
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-info" />
          <h3 className="text-sm font-display font-semibold flex-1">Import unifié (Boutiques + CA)</h3>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={downloadTemplate}>
            <Download className="w-3 h-3 mr-1" /> Modèle
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Un seul fichier. Colonnes reconnues automatiquement (insensible à la casse/accents) :
          <br />• <code>Enseigne</code> (ou Boutique, Nom) — <strong>obligatoire</strong>
          <br />• <code>Secteur</code>, <code>Surface GLA</code>, <code>LMG</code> (loyer), <code>Charges & Taxes</code>
          <br />• Colonnes mois : dates Excel, <code>2024-01</code>, <code>jan-2024</code>, etc.
          <br />La 1ère colonne mois avec un CA &gt; 0 définit la <strong>date d'ouverture</strong>.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {!preview ? (
          <Button onClick={() => fileRef.current?.click()} className="w-full bg-gradient-to-r from-info to-violet rounded-xl">
            <Upload className="w-4 h-4 mr-2" /> Choisir un fichier Excel
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="glass-subtle rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] font-display font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Colonnes détectées</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div><span className="text-muted-foreground">Enseigne :</span> <span className="font-medium">{preview.detectedColumns.name}</span></div>
                <div><span className="text-muted-foreground">Secteur :</span> <span className="font-medium">{preview.detectedColumns.secteur}</span></div>
                <div><span className="text-muted-foreground">Surface :</span> <span className="font-medium">{preview.detectedColumns.surface}</span></div>
                <div><span className="text-muted-foreground">Loyer :</span> <span className="font-medium">{preview.detectedColumns.loyer}</span></div>
                <div><span className="text-muted-foreground">Charges :</span> <span className="font-medium">{preview.detectedColumns.charges}</span></div>
                <div><span className="text-muted-foreground">Mois :</span> <span className="font-medium">{preview.detectedColumns.months} colonnes</span></div>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">{preview.boutiques.length} boutique(s)</Badge>
              <Badge variant="outline" className="text-[10px]">{preview.ca.length} ligne(s) CA</Badge>
              <Badge variant="outline" className="text-[10px]">{preview.openings.length} ouverture(s)</Badge>
            </div>
            <div className="max-h-48 overflow-y-auto glass-subtle rounded-xl p-2 space-y-1">
              {preview.boutiques.slice(0, 30).map((r, i) => (
                <div key={i} className="text-[11px] flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{r.name}</span>
                  <div className="flex gap-1 shrink-0">
                    {r.secteur && <Badge variant="outline" className="text-[9px] h-4">{r.secteur}</Badge>}
                    {r.surface !== undefined && <Badge variant="outline" className="text-[9px] h-4">{r.surface}m²</Badge>}
                    {r.loyer !== undefined && <Badge variant="outline" className="text-[9px] h-4">{r.loyer}€</Badge>}
                  </div>
                </div>
              ))}
              {preview.boutiques.length > 30 && <p className="text-[10px] text-muted-foreground text-center">…et {preview.boutiques.length - 30} de plus</p>}
            </div>
            {preview.ca.length === 0 && (
              <div className="flex items-center gap-1 text-[11px] text-orange"><AlertCircle className="w-3 h-3" /> Aucune donnée CA détectée (colonnes mois manquantes ou vides).</div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreview(null)} disabled={importing}>Annuler</Button>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-success to-teal" onClick={runImport} disabled={importing}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> {importing ? "Import…" : "Confirmer l'import"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
