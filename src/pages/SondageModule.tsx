import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, ClipboardList, Users, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPush, getCentreBoutiqueUserIds } from "@/lib/sendPush";
import { useCentre } from "@/contexts/CentreContext";

const EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

export default function SondageModule({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "commerçant";
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [note, setNote] = useState([7]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<any[]>([]);
  const [sondages, setSondages] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQuestions, setNewQuestions] = useState<string[]>([""]);
  const { toast } = useToast();
  const { selectedCentreId } = useCentre();

  const fetchResponses = async () => {
    let q = supabase.from("sondage_responses").select("*").order("created_at", { ascending: false });
    const { data } = await q;
    if (data) setResponses(data);
  };
  const fetchSondages = async () => {
    let q = supabase.from("sondages").select("*").order("created_at", { ascending: false });
    if (selectedCentreId) q = q.eq("centre_id", selectedCentreId);
    const { data } = await q;
    if (data) setSondages(data);
  };

  useEffect(() => {
    if (role === "gestionnaire" || role === "coordinateur") { fetchResponses(); fetchSondages(); }
  }, [role, selectedCentreId]);

  const submitSondage = async () => {
    const { error } = await supabase.from("sondage_responses").insert({
      user_id: user!.id, commerçant_name: user?.commerçant ?? user?.name,
      satisfaction_emoji: satisfaction, note: note[0], comment: comment || null,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true); toast({ title: "Merci !" });
  };

  const createSondage = async () => {
    if (!newTitle) { toast({ title: "Titre requis", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("sondages").insert({
      title: newTitle, description: newDesc || null, created_by: user!.id, status: "published", published_at: new Date().toISOString(),
    } as any).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    // Add questions
    const questions = newQuestions.filter(q => q.trim());
    if (questions.length > 0 && data) {
      await supabase.from("sondage_questions").insert(
        questions.map((q, i) => ({ sondage_id: (data as any).id, question: q, question_type: "rating", sort_order: i } as any))
      );
    }
    toast({ title: "Sondage créé !" }); setShowCreate(false);
    const ids = await getCentreBoutiqueUserIds(user?.centreId);
    sendPush({ user_ids: ids, title: `📊 Nouveau sondage : ${newTitle}`, body: newDesc || "Donnez votre avis", notif_type: "info" });
    setNewTitle(""); setNewDesc(""); setNewQuestions([""]); fetchSondages();
  };

  const deleteSondage = async (id: string) => {
    await supabase.from("sondages").delete().eq("id", id);
    fetchSondages();
  };

  // Coordinateur / Foncière view
  if (role === "gestionnaire" || role === "coordinateur") {
    const avgNote = responses.length > 0 ? (responses.reduce((s, r) => s + (r.note ?? 0), 0) / responses.length).toFixed(1) : "—";
    const byCommerçant: Record<string, { total: number; noteSum: number }> = {};
    responses.forEach(r => {
      const b = r.commerçant_name ?? "Inconnu";
      if (!byCommerçant[b]) byCommerçant[b] = { total: 0, noteSum: 0 };
      byCommerçant[b].total++; byCommerçant[b].noteSum += r.note ?? 0;
    });

    return (
      <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
        <AppHeader onBack={onBack} />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-violet" /><h2 className="text-lg font-bold font-display">Sondages — Admin</h2></div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display"><Plus className="w-4 h-4 mr-1" /> Créer</Button>
          </div>

          <div className="grid grid-cols-3 gap-3 animate-fade-up">
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-2xl font-bold font-display text-violet">{avgNote}</p><p className="text-[10px] text-muted-foreground uppercase">Note moy.</p></div>
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-2xl font-bold font-display text-success">{responses.length}</p><p className="text-[10px] text-muted-foreground uppercase">Réponses</p></div>
            <div className="glass-card rounded-2xl p-3 text-center"><p className="text-2xl font-bold font-display text-info">{sondages.length}</p><p className="text-[10px] text-muted-foreground uppercase">Sondages</p></div>
          </div>

          {showCreate && (
            <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
              <h3 className="text-sm font-display font-semibold">Nouveau sondage</h3>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du sondage" className="bg-secondary/50 border-border/50" />
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} className="bg-secondary/50 border-border/50" />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Questions</p>
                {newQuestions.map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={q} onChange={e => { const nq = [...newQuestions]; nq[i] = e.target.value; setNewQuestions(nq); }} placeholder={`Question ${i + 1}`} className="bg-secondary/50 border-border/50" />
                    {newQuestions.length > 1 && <Button size="icon" variant="ghost" onClick={() => setNewQuestions(newQuestions.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setNewQuestions([...newQuestions, ""])} className="text-xs"><Plus className="w-3 h-3 mr-1" /> Ajouter question</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">Annuler</Button>
                <Button onClick={createSondage} className="flex-1 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display">Publier</Button>
              </div>
            </div>
          )}

          {/* Sondages list */}
          {sondages.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
              <div className="p-4 pb-2"><h3 className="text-base font-display font-semibold">Mes sondages</h3></div>
              <div className="p-4 pt-2 space-y-2">
                {sondages.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl glass-subtle">
                    <div><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.status}</p></div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSondage(s.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses by commerçant */}
          {Object.keys(byCommerçant).length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
              <div className="p-4 pb-2 flex items-center gap-2"><Users className="w-4 h-4 text-violet" /><h3 className="text-base font-display font-semibold">Par commerçant</h3></div>
              <div className="p-4 pt-2 space-y-2">
                {Object.entries(byCommerçant).map(([name, data], i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl glass-subtle">
                    <div><p className="text-sm font-medium font-display">{name}</p><p className="text-xs text-muted-foreground">{data.total} réponse(s)</p></div>
                    <Badge className="bg-violet/20 text-violet border border-violet/30 font-display">{(data.noteSum / data.total).toFixed(1)}/10</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent responses */}
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
            <div className="p-4 pb-2"><h3 className="text-base font-display font-semibold">Dernières réponses</h3></div>
            <div className="p-4 pt-2 space-y-2">
              {responses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune réponse</p>}
              {responses.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl glass-subtle">
                  <div><p className="text-sm font-medium">{r.commerçant_name ?? "Inconnu"}</p><p className="text-xs text-muted-foreground">{r.comment || "—"}</p></div>
                  <div className="flex items-center gap-2">
                    {r.satisfaction_emoji != null && <span className="text-lg">{EMOJIS[r.satisfaction_emoji]}</span>}
                    <Badge variant="outline" className="font-display">{r.note}/10</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Commerçant form
  if (submitted) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col"><AppHeader onBack={onBack} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 animate-scale-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass glow-primary"><CheckCircle className="w-10 h-10 text-success" /></div>
            <h2 className="text-xl font-bold font-display">Merci !</h2>
            <Button onClick={onBack} className="bg-gradient-to-r from-violet to-primary hover:opacity-90 font-display">Retour</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute bottom-1/4 -left-32 w-64 h-64 rounded-full bg-violet/10 blur-[100px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        <div className="flex items-center gap-2 animate-fade-up"><ClipboardList className="w-5 h-5 text-violet" /><h2 className="text-lg font-bold font-display">Sondage</h2></div>
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
          <div className="p-4 pb-2"><h3 className="text-base font-display font-semibold">Satisfaction Générale</h3></div>
          <div className="p-4 pt-2 space-y-5">
            <div>
              <p className="text-sm mb-3 text-muted-foreground">Comment évaluez-vous votre satisfaction ?</p>
              <div className="flex justify-between">
                {EMOJIS.map((e, i) => (
                  <button key={i} onClick={() => setSatisfaction(i)} className={`text-3xl transition-all duration-200 cursor-pointer ${satisfaction === i ? "scale-125 drop-shadow-[0_0_10px_hsl(var(--violet)/0.5)]" : "opacity-40 hover:opacity-70 hover:scale-110"}`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm mb-2 text-muted-foreground">Commentaire</p>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Votre avis..." rows={3} className="bg-secondary/50 border-border/50" />
            </div>
            <Button className="w-full h-11 bg-gradient-to-r from-violet to-primary hover:opacity-90 rounded-xl font-display" onClick={submitSondage}>Envoyer</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
