import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import type { SecurityFinding } from "@/types/securityReport";
import { FindingStatusDropdown } from "./FindingStatusDropdown";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-danger/15 text-danger border-danger/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-success/15 text-success border-success/30",
  info: "bg-muted/15 text-muted border-border-subtle",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
  info: "Info",
};

interface FindingItemProps {
  finding: SecurityFinding;
  /** So passado quando o contexto tem um projeto conhecido (aba
   * Segurança de um projeto) — na tela global de relatórios fica de fora. */
  onAnalyze?: (finding: SecurityFinding) => void;
}

export function FindingItem({ finding, onAnalyze }: FindingItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border-subtle bg-base-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown size={13} className="shrink-0 text-muted" /> : <ChevronRight size={13} className="shrink-0 text-muted" />}
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
            SEVERITY_STYLE[finding.severity] ?? SEVERITY_STYLE.info
          }`}
        >
          {SEVERITY_LABEL[finding.severity] ?? finding.severity}
        </span>
        <span className="truncate text-sm text-slate-200">{finding.title}</span>
        <span className="ml-auto shrink-0">
          <FindingStatusDropdown findingId={finding.id} status={finding.status} />
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border-subtle px-3 py-2.5 text-sm">
          {finding.description && <p className="text-slate-300">{finding.description}</p>}
          {finding.remediation && (
            <p className="text-xs text-muted">
              <span className="font-medium text-accent">Recomendação: </span>
              {finding.remediation}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted/80">
            {finding.endpointOrFile && <span>📍 {finding.endpointOrFile}</span>}
            {finding.category && <span>Categoria: {finding.category}</span>}
            {finding.pluginName && <span>Plugin: {finding.pluginName}</span>}
          </div>
          {onAnalyze && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(finding);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-accent px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
            >
              <Sparkles size={12} /> Analisar com IA
            </button>
          )}
        </div>
      )}
    </div>
  );
}
