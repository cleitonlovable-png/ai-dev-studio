import { Construction } from "lucide-react";

interface ComingSoonTabProps {
  tabName: string;
  phase: string;
}

export function ComingSoonTab({ tabName, phase }: ComingSoonTabProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
      <Construction size={28} className="text-muted" />
      <p className="text-sm text-slate-300">A aba "{tabName}" ainda nao foi implementada.</p>
      <p className="text-xs text-muted">Prevista para a {phase}.</p>
    </div>
  );
}
