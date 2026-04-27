import { useState, useEffect, useRef, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Building2, User, Phone, Mail, CalendarDays, Clock, FileText,
  Users, Car, AlertTriangle, Flame, ArrowUp, CheckCircle, ArrowLeft,
  ArrowRight, Send, Loader2, ShieldAlert, MessageSquare, Plus,
  QrCode, ScanLine, X, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPush } from "@/lib/sendPush";
import { useCentre } from "@/contexts/CentreContext";

const STEPS = ["Société", "Intervention", "Intervenants", "Risques", "Signature"];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Field component defined OUTSIDE to avoid re-mount on each render
function Field({ icon: Icon, label, required, children }: { icon: any; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface DemandeAcces {
  id: string;
  boutique_name: string | null;
  reason: string;
  visit_date: string;
  visit_time: string | null;
  status: string;
  person_name: string;
  person_company: string | null;
  created_at: string;
  request_code: string | null;
  company_name: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  company_email: string | null;
  location_detail: string | null;
  date_start: string | null;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  intervention_detail: string | null;
  intervenant_1: string | null;
  intervenant_2: string | null;
  vehicle_plate: string | null;
  risk_height: boolean | null;
  risk_height_detail: string | null;
  risk_fire: boolean | null;
  risk_fire_detail: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  en_attente: { label: "Envoyée", className: "bg-orange/20 text-orange border border-orange/30" },
  validee: { label: "Validée", className: "bg-success/20 text-success border border-success/30" },
  info_demandee: { label: "Infos demandées", className: "bg-info/20 text-info border border-info/30" },
  refusee: { label: "Refusée", className: "bg-destructive/20 text-destructive border border-destructive/30" },
  confirmee: { label: "Confirmée", className: "bg-teal/20 text-teal border border-teal/30" },
};

export default function AccesModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();
  const [view, setView] = useState<"list" | "form">("list");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [demandes, setDemandes] = useState<DemandeAcces[]>([]);
  const [selectedDemande, setSelectedDemande] = useState<DemandeAcces | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  // Step 2
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [interventionDetail, setInterventionDetail] = useState("");

  // Step 3
  const [intervenant1, setIntervenant1] = useState("");
  const [intervenant2, setIntervenant2] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [confirmHours, setConfirmHours] = useState(false);
  const [confirmWaste, setConfirmWaste] = useState(false);
  const [confirmParking, setConfirmParking] = useState(false);

  // Step 4 - inverted: checked = NO risk
  const [noRiskHeight, setNoRiskHeight] = useState(false);
  const [riskHeightDetail, setRiskHeightDetail] = useState("");
  const [noRiskFire, setNoRiskFire] = useState(false);
  const [riskFireDetail, setRiskFireDetail] = useState("");

  // Step 5
  const [signatureName, setSignatureName] = useState("");
  const [confirmFinal, setConfirmFinal] = useState(false);

  const fetchDemandes = async () => {
    let q = supabase.from("access_requests").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setDemandes(data as DemandeAcces[]);
  };

  useEffect(() => {
    fetchDemandes();
    const channel = supabase.channel("access-rt").on("postgres_changes", { event: "*", schema: "public", table: "access_requests" }, () => fetchDemandes()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCentreId]);

  const isLateNight = (() => {
    if (!timeStart) return false;
    const h = parseInt(timeStart.split(":")[0], 10);
    const m = parseInt(timeStart.split(":")[1] || "0", 10);
    // after 00:59 means 01:00+ but we also check before 6
    return h >= 1 && h < 6;
  })();

  const isOutsideHours = (() => {
    if (!timeStart) return false;
    const h = parseInt(timeStart.split(":")[0], 10);
    return h < 6 || h >= 24;
  })();

  const canNext = (() => {
    switch (step) {
      case 0: return companyName.trim() && responsibleName.trim() && companyEmail.trim();
      case 1: return dateStart && timeStart.trim() && timeEnd.trim();
      case 2: return confirmHours && confirmWaste && confirmParking;
      case 3: {
        // Étape 4: les deux cases doivent être cochées OU les descriptions doivent être remplies
        const heightValid = noRiskHeight || riskHeightDetail.trim();
        const fireValid = noRiskFire || riskFireDetail.trim();
        return heightValid && fireValid;
      }
      case 4: return signatureName.trim() && confirmFinal;
      default: return false;
    }
  })();

  const resetForm = () => {
    setStep(0);
    setCompanyName("");
    setResponsibleName("");
    setResponsiblePhone("");
    setCompanyEmail("");
    setDateStart("");
    setDateEnd("");
    setTimeStart("");
    setTimeEnd("");
    setInterventionDetail("");
    setIntervenant1("");
    setIntervenant2("");
    setVehiclePlate("");
    setConfirmHours(false);
    setConfirmWaste(false);
    setConfirmParking(false);
    setNoRiskHeight(false);
    setRiskHeightDetail("");
    setNoRiskFire(false);
    setRiskFireDetail("");
    setSignatureName("");
    setConfirmFinal(false);
  };

  const submitRequest = async () => {
    setSubmitting(true);
    const code = generateCode();
    const { error } = await supabase.from("access_requests").insert({
      created_by: user!.id,
      boutique_name: user?.commerçant ?? user?.name,
      person_name: user?.name ?? "",
      person_company: companyName,
      reason: interventionDetail || "Intervention",
      visit_date: dateStart,
      visit_time: timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : timeStart || null,
      status: "en_attente",
      request_code: code,
      company_name: companyName,
      responsible_name: responsibleName,
      responsible_phone: responsiblePhone || null,
      company_email: companyEmail,
      date_start: dateStart,
      date_end: dateEnd || null,
      time_start: timeStart || null,
      time_end: timeEnd || null,
      location_detail: user?.commerçant ?? user?.name ?? null,
      intervention_detail: interventionDetail || null,
      intervenant_1: intervenant1 || null,
      intervenant_2: intervenant2 || null,
      vehicle_plate: vehiclePlate || null,
      risk_height: !noRiskHeight,
      risk_height_detail: !noRiskHeight ? riskHeightDetail || null : null,
      risk_fire: !noRiskFire,
      risk_fire_detail: !noRiskFire ? riskFireDetail || null : null,
      risk_electric: false,
      risk_electric_detail: null,
      confirm_hours: confirmHours,
      confirm_waste: confirmWaste,
      confirm_parking: confirmParking,
      confirm_final: confirmFinal,
      signature_name: signatureName,
      signature_date: new Date().toISOString().split("T")[0],
    });
    setSubmitting(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Demande envoyée", description: `Code : ${code}` });
    resetForm();
    setView("list");
    fetchDemandes();
  };

  const updateDemandeStatus = async (id: string, status: string) => {
    const { data: updated } = await supabase.from("access_requests").update({
      status,
      processed_by: user!.id,
      processed_at: new Date().toISOString(),
    }).eq("id", id).select().single();

    // Push to the requester
    if (updated && (status === "validee" || status === "refusee" || status === "info_demandee")) {
      const labels: Record<string, { title: string; body: string }> = {
        validee: { title: "✅ Demande d'accès validée", body: `Votre demande pour le ${(updated as any).visit_date} est validée.` },
        refusee: { title: "❌ Demande d'accès refusée", body: `Votre demande pour le ${(updated as any).visit_date} a été refusée.` },
        info_demandee: { title: "ℹ️ Compléments demandés", body: `Des informations complémentaires sont demandées pour votre demande.` },
      };
      const msg = labels[status];
      sendPush({
        user_ids: [(updated as any).created_by],
        title: msg.title,
        body: msg.body,
        notif_type: status === "refusee" ? "alerte" : "info",
      });
    }
  };

  const checkInDemande = async (id: string) => {
    await supabase.from("access_requests").update({
      checked_in_at: new Date().toISOString(),
      checked_in_by: user!.id,
      status: "confirmee",
    }).eq("id", id);
    toast({ title: "Passage confirmé", description: "L'intervention a été horodatée au PC Sécurité." });
    fetchDemandes();
    setSelectedDemande(null);
  };

  const startScanner = useCallback(async () => {
    setScanning(true);
    // Wait for DOM to render the scanner div
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Find the demande by request_code
            const found = demandes.find(d => d.request_code === decodedText);
            if (found) {
              setSelectedDemande(found);
              stopScanner();
            } else {
              toast({ title: "Code non trouvé", description: `Aucune demande avec le code ${decodedText}`, variant: "destructive" });
            }
          },
          () => {} // ignore errors during scanning
        );
      } catch (err: any) {
        toast({ title: "Erreur caméra", description: err?.message || "Impossible d'accéder à la caméra", variant: "destructive" });
        setScanning(false);
      }
    }, 100);
  }, [demandes, toast]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const inputClass = "bg-secondary/50 border-border/50 rounded-xl";

  // ─── DETAIL VIEW (for scanned / clicked demande) ───
  const DemandeDetail = ({ d }: { d: DemandeAcces }) => (
    <div className="space-y-3 animate-fade-up">
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedDemande(null)}>
        <ArrowLeft className="w-3 h-3 mr-1" /> Retour
      </Button>
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {d.request_code && <p className="text-sm font-mono font-bold text-primary">{d.request_code}</p>}
            <p className="text-lg font-bold font-display">{d.company_name ?? "—"}</p>
          </div>
          <Badge className={`text-[10px] ${STATUS_MAP[d.status]?.className ?? ""}`}>
            {STATUS_MAP[d.status]?.label ?? d.status}
          </Badge>
        </div>
        <div className="border-t border-border/30 pt-2 space-y-1.5 text-xs text-muted-foreground">
          <p>🏪 <span className="text-foreground font-medium">{d.boutique_name ?? "—"}</span></p>
          <p>👤 Responsable : <span className="text-foreground">{d.responsible_name ?? "—"}</span></p>
          {d.responsible_phone && <p>📞 {d.responsible_phone}</p>}
          {d.company_email && <p>✉️ {d.company_email}</p>}
        </div>
        <div className="border-t border-border/30 pt-2 space-y-1.5 text-xs text-muted-foreground">
          <p>📅 {d.date_start ?? d.visit_date}{d.date_end ? ` → ${d.date_end}` : ""}</p>
          <p>🕐 {d.time_start ?? "—"} → {d.time_end ?? "—"}</p>
          {d.location_detail && <p>📍 {d.location_detail}</p>}
          {d.intervention_detail && <p>📄 {d.intervention_detail}</p>}
        </div>
        <div className="border-t border-border/30 pt-2 space-y-1.5 text-xs text-muted-foreground">
          {d.intervenant_1 && <p>👥 Intervenant 1 : {d.intervenant_1}</p>}
          {d.intervenant_2 && <p>👥 Intervenant 2 : {d.intervenant_2}</p>}
          {d.vehicle_plate && <p>🚗 Plaque : {d.vehicle_plate}</p>}
        </div>
        <div className="border-t border-border/30 pt-2 space-y-1.5 text-xs text-muted-foreground">
          <p>⬆️ Travaux en hauteur : {d.risk_height ? <span className="text-orange font-bold">Oui</span> : <span className="text-success">Non</span>}</p>
          {d.risk_height && d.risk_height_detail && <p className="ml-4">{d.risk_height_detail}</p>}
          <p>🔥 Permis feu : {d.risk_fire ? <span className="text-orange font-bold">Oui</span> : <span className="text-success">Non</span>}</p>
          {d.risk_fire && d.risk_fire_detail && <p className="ml-4">{d.risk_fire_detail}</p>}
        </div>
        {d.checked_in_at && (
          <div className="border-t border-border/30 pt-2 text-xs">
            <p className="text-success font-medium">✅ Passage confirmé le {new Date(d.checked_in_at).toLocaleString("fr-FR")}</p>
          </div>
        )}
      </div>

      {d.status === "en_attente" && (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-9 text-xs bg-success hover:bg-success/90 rounded-xl" onClick={() => { updateDemandeStatus(d.id, "validee"); setSelectedDemande({ ...d, status: "validee" }); }}>
            <CheckCircle className="w-3 h-3 mr-1" />Valider
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-9 text-xs rounded-xl border-info/30 text-info hover:bg-info/10" onClick={() => { updateDemandeStatus(d.id, "info_demandee"); setSelectedDemande(null); }}>
            <MessageSquare className="w-3 h-3 mr-1" />Infos
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-9 text-xs rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => { updateDemandeStatus(d.id, "refusee"); setSelectedDemande(null); }}>
            Refuser
          </Button>
        </div>
      )}

      {d.status === "validee" && !d.checked_in_at && (
        <Button className="w-full h-10 rounded-xl font-display bg-gradient-to-r from-teal to-success hover:opacity-90" onClick={() => checkInDemande(d.id)}>
          <CheckCircle className="w-4 h-4 mr-2" /> Confirmer le passage (horodatage)
        </Button>
      )}
    </div>
  );

  // ─── FONCIÈRE / SÉCURITÉ VIEW ───
  if (role === "securite" || role === "gestionnaire" || role === "coordinateur") {
    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute bottom-1/3 -left-32 w-64 h-64 rounded-full bg-info/10 blur-[100px]" />
        <AppHeader onBack={() => { if (selectedDemande) { setSelectedDemande(null); } else if (scanning) { stopScanner(); } else { onBack(); } }} />
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          {selectedDemande ? (
            <DemandeDetail d={selectedDemande} />
          ) : scanning ? (
            <div className="space-y-3 animate-fade-up">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-display flex items-center gap-2"><ScanLine className="w-5 h-5 text-info" /> Scanner un QR Code</h2>
                <Button size="sm" variant="ghost" onClick={stopScanner}><X className="w-4 h-4" /></Button>
              </div>
              <div id="qr-reader" ref={scannerDivRef} className="rounded-2xl overflow-hidden" />
              <p className="text-xs text-muted-foreground text-center">Placez le QR code du laisser-passer devant la caméra</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 animate-fade-up">
                <ShieldAlert className="w-5 h-5 text-info" />
                <h2 className="text-lg font-bold font-display">Demandes de Laisser-Passer</h2>
              </div>
              <Button className="w-full rounded-xl font-display bg-gradient-to-r from-info to-primary hover:opacity-90 h-11" onClick={startScanner}>
                <ScanLine className="w-5 h-5 mr-2" /> Scanner un QR Code
              </Button>
              <div className="space-y-3">
                {demandes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune demande</p>}
                {demandes.map((d, i) => (
                  <div key={d.id} className="glass-card rounded-2xl p-4 animate-fade-up space-y-2 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setSelectedDemande(d)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium font-display">{d.boutique_name ?? "Commerçant"}</p>
                        {d.request_code && <p className="text-[10px] font-mono text-primary">{d.request_code}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${STATUS_MAP[d.status]?.className ?? ""}`}>
                          {STATUS_MAP[d.status]?.label ?? d.status}
                        </Badge>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    {d.company_name && <p className="text-xs text-muted-foreground">🏢 {d.company_name}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {d.date_start ?? d.visit_date}
                      {(d.time_start || d.visit_time) ? ` • ${d.time_start ?? d.visit_time}` : ""}
                    </p>
                    {d.checked_in_at && <p className="text-[10px] text-success">✅ Passage confirmé</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ─── COMMERÇANT: LIST VIEW (with past requests + new button) ───
  if (view === "list") {
    const myDemandes = demandes.filter(d => d.person_name === user?.name || d.boutique_name === (user?.commerçant ?? user?.name));
    return (
      <div className="min-h-screen mesh-bg flex flex-col">
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          <div className="flex items-center justify-between animate-fade-up">
            <h2 className="text-lg font-bold font-display">Mes Laisser-Passer</h2>
            <Button size="sm" className="rounded-xl font-display bg-gradient-to-r from-info to-primary hover:opacity-90" onClick={() => { resetForm(); setView("form"); }}>
              <Plus className="w-4 h-4 mr-1" /> Nouvelle demande
            </Button>
          </div>

          {myDemandes.length === 0 && (
            <div className="text-center py-12 space-y-3 animate-fade-up">
              <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune demande pour le moment</p>
            </div>
          )}

          {/* QR Code modal */}
          {showQr && (
            <div className="glass-card rounded-2xl p-6 space-y-3 animate-fade-up text-center">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold font-display flex items-center gap-1.5"><QrCode className="w-4 h-4 text-primary" /> QR Code Laisser-Passer</p>
                <Button size="sm" variant="ghost" onClick={() => setShowQr(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <QRCodeSVG value={showQr} size={200} />
              </div>
              <p className="text-xs font-mono text-primary font-bold">{showQr}</p>
              <p className="text-[10px] text-muted-foreground">Présentez ce QR code au PC Sécurité</p>
            </div>
          )}

          <div className="space-y-3">
            {myDemandes.map((d, i) => (
              <div key={d.id} className="glass-card rounded-2xl p-4 animate-fade-up space-y-2" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between">
                  <div>
                    {d.request_code && <p className="text-xs font-mono font-bold text-primary">{d.request_code}</p>}
                    {d.company_name && <p className="text-sm font-medium font-display">{d.company_name}</p>}
                  </div>
                  <Badge className={`text-[10px] ${STATUS_MAP[d.status]?.className ?? ""}`}>
                    {STATUS_MAP[d.status]?.label ?? d.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {d.date_start ?? d.visit_date}
                  {(d.time_start || d.visit_time) ? ` • ${d.time_start ?? d.visit_time}` : ""}
                </p>
                {d.intervention_detail && <p className="text-xs text-muted-foreground">{d.intervention_detail}</p>}
                {d.checked_in_at && <p className="text-[10px] text-success">✅ Passage confirmé le {new Date(d.checked_in_at).toLocaleString("fr-FR")}</p>}
                {d.status === "validee" && d.request_code && !d.checked_in_at && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10 mt-1" onClick={() => setShowQr(d.request_code!)}>
                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> Afficher le QR Code
                  </Button>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── COMMERÇANT: FORM VIEW ───
  const ProgressBar = () => (
    <div className="flex items-center justify-center gap-0 py-3 animate-fade-up">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all duration-300 ${
              i < step ? "bg-success text-success-foreground" :
              i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-[8px] mt-1 font-display ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 mx-0.5 mt-[-10px] transition-colors duration-300 ${i < step ? "bg-success" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <AppHeader onBack={() => setView("list")} />
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-3 pb-8">
        <h2 className="text-lg font-bold font-display text-center animate-fade-up">Demande de Laisser-Passer</h2>
        <ProgressBar />

        {/* STEP 1: Société */}
        {step === 0 && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground text-center">Renseignez les coordonnées de l'entreprise intervenante</p>
            <div className="glass-card rounded-2xl p-3 space-y-1.5 text-xs">
              <p className="text-muted-foreground">👤 Demandeur : <span className="text-foreground font-medium">{user?.name}</span></p>
              <p className="text-muted-foreground">🏪 Commerçant : <span className="text-foreground font-medium">{user?.commerçant ?? "—"}</span></p>
            </div>
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <Field icon={Building2} label="Nom de l'entreprise intervenante" required>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: ACME Services" className={inputClass} />
              </Field>
              <Field icon={User} label="Responsable de l'intervention" required>
                <Input value={responsibleName} onChange={e => setResponsibleName(e.target.value)} placeholder="Nom et prénom" className={inputClass} />
              </Field>
              <Field icon={Phone} label="Téléphone du responsable">
                <Input value={responsiblePhone} onChange={e => setResponsiblePhone(e.target.value)} placeholder="06 XX XX XX XX" className={inputClass} />
              </Field>
              <Field icon={Mail} label="Courriel de l'entreprise" required>
                <Input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="contact@entreprise.fr" className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2: Intervention - lieu supprimé, heures obligatoires */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground text-center">Précisez les dates et horaires de votre intervention</p>
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field icon={CalendarDays} label="Date de début" required>
                  <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={inputClass} />
                </Field>
                <Field icon={CalendarDays} label="Date de fin">
                  <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Clock} label="Heure de début" required>
                  <Input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className={inputClass} />
                </Field>
                <Field icon={Clock} label="Heure de fin" required>
                  <Input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field icon={FileText} label="Contenu détaillé de l'intervention">
                <Textarea value={interventionDetail} onChange={e => setInterventionDetail(e.target.value)} placeholder="Décrivez en détail la nature des travaux à effectuer..." className={`${inputClass} min-h-[80px]`} />
              </Field>
            </div>

            {isLateNight && (
              <div className="rounded-2xl border border-orange/30 bg-orange/10 p-4 space-y-2 animate-fade-up">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange" />
                  <p className="text-xs font-bold text-orange font-display">Intervention en horaires de nuit</p>
                </div>
                <p className="text-xs text-muted-foreground">Les interventions entre 01h00 et 06h00 nécessitent la présence d'un agent de sécurité. Veuillez contacter le PC Sécurité pour organiser cette prestation.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange/30 text-orange hover:bg-orange/10 text-xs rounded-lg"
                  onClick={() => window.open("mailto:securite@steel-saint-etienne.fr?subject=Demande de devis agent de sécurité&body=Bonjour,%0A%0AJe souhaite demander un devis pour la présence d'un agent de sécurité.%0A%0ADate: " + dateStart + "%0AHeure: " + timeStart)}
                >
                  <Mail className="w-3 h-3 mr-1" /> Demander un devis agent de sécurité
                </Button>
              </div>
            )}

            {isOutsideHours && !isLateNight && (
              <div className="rounded-2xl border border-orange/30 bg-orange/10 p-4 space-y-2 animate-fade-up">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange" />
                  <p className="text-xs font-bold text-orange font-display">Intervention hors horaires standard</p>
                </div>
                <p className="text-xs text-muted-foreground">Les interventions avant 6h00 nécessitent la présence d'un agent de sécurité. Une demande de devis est requise.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange/30 text-orange hover:bg-orange/10 text-xs rounded-lg"
                  onClick={() => window.open("mailto:securite@steel-saint-etienne.fr?subject=Demande de devis agent de sécurité&body=Bonjour,%0A%0AJe souhaite demander un devis pour la présence d'un agent de sécurité.%0A%0ADate: " + dateStart + "%0AHeure: " + timeStart)}
                >
                  <Mail className="w-3 h-3 mr-1" /> Demander un devis agent de sécurité
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Intervenants & Véhicule */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground text-center">Identifiez les personnes et véhicules concernés</p>
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <Field icon={Users} label="Nom / Prénom Intervenant 1">
                <Input value={intervenant1} onChange={e => setIntervenant1(e.target.value)} placeholder="Jean DUPONT" className={inputClass} />
              </Field>
              <Field icon={Users} label="Nom / Prénom Intervenant 2">
                <Input value={intervenant2} onChange={e => setIntervenant2(e.target.value)} placeholder="Marie MARTIN (optionnel)" className={inputClass} />
              </Field>
              <Field icon={Car} label="Immatriculation du véhicule">
                <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="AB-123-CD" className={inputClass} />
              </Field>
            </div>

            {/* Horaires & Logistique */}
            <div className="rounded-2xl border border-orange/30 bg-orange/10 p-4 space-y-2">
              <p className="text-xs font-bold text-orange font-display">⚠️ Horaires & Logistique — Règlement impératif</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Manutention lourde et livraisons :</p>
                <p>• <strong>Matin :</strong> de 06h00 à 09h20 (évacuation du parvis impérative à 9h20)</p>
                <p>• <strong>Soir :</strong> après 20h00 et jusqu'à 00h30 en semaine</p>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox id="confirmHours" checked={confirmHours} onCheckedChange={(v) => setConfirmHours(v === true)} />
                <label htmlFor="confirmHours" className="text-xs cursor-pointer">Je confirme le respect de ces horaires <span className="text-destructive">*</span></label>
              </div>
              {!confirmHours && <p className="text-[10px] text-destructive">Cette confirmation est obligatoire pour continuer</p>}
            </div>

            {/* Gestion des déchets */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
              <p className="text-xs font-bold text-destructive font-display">🗑️ Gestion des déchets — Obligation</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>Obligation de retrait :</strong> Le prestataire doit récupérer et évacuer la totalité de ses déchets à la fin de l'intervention.</p>
                <p>• Il est formellement interdit d'utiliser les bennes ou poubelles du coordinateur commercial, sous peine de facturation de frais de nettoyage.</p>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox id="confirmWaste" checked={confirmWaste} onCheckedChange={(v) => setConfirmWaste(v === true)} />
                <label htmlFor="confirmWaste" className="text-xs cursor-pointer">Je m'engage à respecter ces obligations de gestion des déchets <span className="text-destructive">*</span></label>
              </div>
              {!confirmWaste && <p className="text-[10px] text-destructive">Cet engagement est obligatoire pour continuer</p>}
            </div>

            {/* Stationnement */}
            <div className="rounded-2xl border border-info/30 bg-info/10 p-4 space-y-2">
              <p className="text-xs font-bold text-info font-display">🅿️ Règles de stationnement</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Il est formellement interdit d'utiliser les parkings clients pour le stationnement des engins de levage et/ou manutention.</p>
                <p>• Après 9h20, le stationnement des véhicules des intervenants est interdit sur les places de parking clients.</p>
                <p>• Se référer au plan de stationnement et de dépose fourni en annexe.</p>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox id="confirmParking" checked={confirmParking} onCheckedChange={(v) => setConfirmParking(v === true)} />
                <label htmlFor="confirmParking" className="text-xs cursor-pointer">Je m'engage à respecter ces règles de stationnement <span className="text-destructive">*</span></label>
              </div>
              {!confirmParking && <p className="text-[10px] text-destructive">Cet engagement est obligatoire pour continuer</p>}
            </div>
          </div>
        )}

        {/* STEP 4: Risques - inversé, pas de rappel, pas d'électrique */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground text-center">Identifiez les risques liés à votre intervention</p>
            <div className="glass-card rounded-2xl p-4 space-y-4">
              {/* Travaux en hauteur - description directe */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-info" />
                  <p className="text-xs font-bold font-display">Travaux en hauteur (Nacelle, échelle)</p>
                </div>
                <p className="text-xs text-muted-foreground">Tout travail nécessitant une nacelle, un échafaudage, une échelle ou tout équipement de travail en hauteur.</p>
                {!noRiskHeight && (
                  <Textarea value={riskHeightDetail} onChange={e => setRiskHeightDetail(e.target.value)} placeholder="Précisions (type d'équipement, hauteur...)" className={`${inputClass} min-h-[60px]`} />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="noRiskHeight" checked={noRiskHeight} onCheckedChange={(v) => setNoRiskHeight(v === true)} />
                  <label htmlFor="noRiskHeight" className="text-xs cursor-pointer font-medium">Pas de travaux en hauteur</label>
                </div>
              </div>

              <div className="border-t border-border/30" />

              {/* Permis Feu - description directe */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange" />
                  <p className="text-xs font-bold font-display">Permis Feu (Soudure, meulage)</p>
                </div>
                <p className="text-xs text-muted-foreground">Tout travail impliquant soudure, meulage, découpe, ou toute opération générant des points chauds ou des étincelles.</p>
                {!noRiskFire && (
                  <Textarea value={riskFireDetail} onChange={e => setRiskFireDetail(e.target.value)} placeholder="Précisions (type de travaux...)" className={`${inputClass} min-h-[60px]`} />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="noRiskFire" checked={noRiskFire} onCheckedChange={(v) => setNoRiskFire(v === true)} />
                  <label htmlFor="noRiskFire" className="text-xs cursor-pointer font-medium">Pas de besoin de permis feu</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Signature */}
        {step === 4 && (
          <div className="space-y-3 animate-fade-up">
            <p className="text-xs text-muted-foreground text-center">Finalisez votre demande de laisser-passer</p>

            <div className="rounded-2xl border border-success/30 bg-success/10 p-4 space-y-2">
              <p className="text-xs font-bold text-success font-display flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Récapitulatif de vos engagements
              </p>
              <p className="text-xs text-muted-foreground">
                En soumettant cette demande, je certifie avoir pris connaissance des horaires imposés et des obligations du règlement intérieur du coordinateur.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-3">
              <Field icon={User} label="Je soussigné(e), M./Mme" required>
                <Input value={signatureName || responsibleName} onChange={e => setSignatureName(e.target.value)} className={inputClass} />
              </Field>
              <Field icon={CalendarDays} label="Date de signature">
                <Input type="date" value={new Date().toISOString().split("T")[0]} disabled className={`${inputClass} opacity-70`} />
              </Field>
            </div>

            <div className="rounded-2xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox id="confirmFinal" checked={confirmFinal} onCheckedChange={(v) => setConfirmFinal(v === true)} />
                <label htmlFor="confirmFinal" className="text-xs cursor-pointer leading-relaxed">
                  J'ai lu et j'accepte les conditions d'intervention au Coordinateur Commercial STEEL, notamment les horaires de manutention, l'obligation de gestion des déchets et les règles de stationnement. <span className="text-destructive">*</span>
                </label>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground">⏳ Délai de prévenance : <strong>48h minimum</strong> (jours ouvrés)</p>
              <p className="text-[10px] text-muted-foreground">📞 PC Sécurité STEEL : <strong>04 28 04 43 35</strong> / <strong>07 86 10 47 90</strong></p>
            </div>
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1 rounded-xl font-display" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Précédent
            </Button>
          )}
          {step < 4 ? (
            <Button
              className="flex-1 rounded-xl font-display bg-gradient-to-r from-info to-primary hover:opacity-90"
              disabled={!canNext}
              onClick={() => {
                if (step === 0 && !signatureName) setSignatureName(responsibleName);
                setStep(step + 1);
              }}
            >
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 rounded-xl font-display bg-gradient-to-r from-success to-teal hover:opacity-90"
              disabled={!canNext || submitting}
              onClick={submitRequest}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Envoi en cours...</>
              ) : (
                <><Send className="w-4 h-4 mr-1" /> Soumettre ma demande</>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
