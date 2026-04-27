import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  icon?: typeof ChevronDown;
  defaultOpen?: boolean;
  badge?: ReactNode;
  accent?: string; // tailwind text color class, e.g. "text-primary"
  children: ReactNode;
}

/**
 * Section dépliable réutilisable.
 * Fermée par défaut pour économiser l'espace visuel.
 */
export default function CollapsibleSection({ title, icon: Icon, defaultOpen = false, badge, accent = "text-primary", children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-fade-up">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        {open ? <ChevronDown className={`w-4 h-4 ${accent}`} /> : <ChevronRight className={`w-4 h-4 ${accent}`} />}
        {Icon && <Icon className={`w-4 h-4 ${accent}`} />}
        <span className="text-sm font-display font-semibold flex-1">{title}</span>
        {badge}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/20">{children}</div>}
    </div>
  );
}
