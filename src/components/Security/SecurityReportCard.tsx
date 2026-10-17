import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Globe, Send, Trash2 } from "lucide-react";
import type { SecurityFinding, SecurityReport } from "@/types/securityReport";
import { FindingItem } from "./FindingItem";

const SCAN_TYPE_LABEL: Record<string, string> = {
  QUICK_SCAN: "Varredura rápida",
  FULL_SCAN: "Varredura completa",
  API_SCAN: "API",
  INFRA_SCAN: "Infraestrutura",
  PENTEST_SCAN: "Pentest (ZAP)",
  CODE_SCAN: "Secrets no código",
  CHECKOUT_SCAN: "Checkout",
  DEPENDENCY_SCAN: "Dependências",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

interface SeverityBadgeProps {
  label: string;
  count: number;
  className: string;
}

function SeverityBadge({ label, count, className }: SeverityBadgeProps) {
  return (
    <div className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${className}`}>
      <p className="text-lg font-semibold leading-none">{count}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

interface SecurityReportCardProps {
  report: SecurityReport;
  onDelete: (id: number) => void;
  onAnalyze?: (finding: SecurityFinding) => void;
  onSummary?: (report: SecurityReport) => void;
  onSendToAi?: (report: SecurityReport) => void;
}

export function SecurityReportCard({ report, onDelete, onAnalyze, onSummary, onSendToAi }: SecurityReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totalFindings = report.findings.length;

  return (
    <div className="rounded-card border border-border-subtle bg-base-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-100">{report.projectName}</h3>
            {report.domain && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                <Globe size={11} /> {report.domain}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {SCAN_TYPE_LABEL[report.scanType] ?? report.scanType} · {formatDateTime(report.receivedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onSummary && (
            <button
              onClick={() => onSummary(report)}
              title="Explicar este relatório em linguagem simples"
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1 text-xs text-slate-200 hover:bg-base-800"
            >
              <FileText size={12} /> Resumo técnico
            </button>
          )}
          {onSendToAi && (
            <button
              onClick={() => onSendToAi(report)}
              title="Abrir uma IA no projeto para corrigir os problemas"
              className="flex items-center gap-1.5 rounded-lg border border-accent px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
            >
              <Send size={12} /> Enviar para correção
            </button>
          )}
          <button onClick={() => onDelete(report.id)} title="Excluir relatório" className="text-muted hover:text-danger">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        <SeverityBadge label="Crítico" count={report.severityCritical} className="border-danger/30 bg-danger/10 text-danger" />
        <SeverityBadge label="Alto" count={report.severityHigh} className="border-orange-500/30 bg-orange-500/10 text-orange-400" />
        <SeverityBadge label="Médio" count={report.severityMedium} className="border-warning/30 bg-warning/10 text-warning" />
        <SeverityBadge label="Baixo" count={report.severityLow} className="border-success/30 bg-success/10 text-success" />
        <SeverityBadge label="Info" count={report.severityInfo} className="border-border-subtle bg-base-800 text-muted" />
      </div>

      {totalFindings > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Ocultar" : "Ver"} {totalFindings} finding(s)
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {report.findings.map((finding) => (
                <FindingItem key={finding.id} finding={finding} onAnalyze={onAnalyze} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
