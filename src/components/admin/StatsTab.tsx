export default function StatsTab() {
  return (
    <div className="glass-card rounded-2xl p-6 text-center space-y-2 animate-fade-up">
      <p className="text-sm text-muted-foreground">
        Les statistiques sont désormais disponibles directement dans chaque module&nbsp;:
      </p>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>• Signalements → module Signaler une anomalie</li>
        <li>• Alertes SOS → module Alerte</li>
        <li>• CVthèque → onglet CV</li>
      </ul>
    </div>
  );
}
