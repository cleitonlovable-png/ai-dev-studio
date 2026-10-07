import { useState } from "react";
import { Bug, Database, Play, RefreshCw, ShieldAlert } from "lucide-react";
import type { Project } from "@/types/project";
import type { ScannerId } from "@/types/scanner";
import type { SecurityFinding } from "@/types/securityReport";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { useSecurityScanners } from "@/hooks/useSecurityScanners";
import { Card } from "@/components/common/Card";
import { SecurityReportCard } from "@/components/Security/SecurityReportCard";
import { ZapScanModal } from "@/components/Security/ZapScanModal";
import { AnalyzeFindingModal } from "./AnalyzeFindingModal";
import { deleteSecurityReport } from "@/services/securityReports";

const SCANNER_ICON: Record<ScannerId, React.ReactNode> = {
  dependency: <Database size={16} className="text-slate-300" />,
  secret: <Bug size={16} className="text-slate-300" />,
  zap: <ShieldAlert size={16} className="text-slate-300" />,
};

interface SecurityTabProps {
  project: Project;
  onStartAiSession: (session: ActiveAiSession) => void;
}

export function SecurityTab({ project, onStartAiSession }: SecurityTabProps) {
  const { scanners, reports, loading, runningId, error, runDependency, runSecret, refresh } =
    useSecurityScanners(project.id);
  const [zapModalOpen, setZapModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState<SecurityFinding | null>(null);

  async function handleDeleteReport(id: number) {
    await deleteSecurityReport(id);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Card
        title="Scanners Disponíveis"
        action={
          <button onClick={() => refresh()} title="Atualizar" className="text-muted hover:text-slate-200">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Verificando scanners...</p>
        ) : (
          <div className="space-y-2">
            {scanners.map((scanner) => (
              <div
                key={scanner.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-base-800 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  {SCANNER_ICON[scanner.id]}
                  <div>
                    <p className="text-sm font-medium text-slate-100">{scanner.label}</p>
                    <p className="text-xs text-muted">{scanner.detail}</p>
                  </div>
                </div>
                <button
                  disabled={!scanner.available || runningId !== null}
                  onClick={() => {
                    if (scanner.id === "dependency") runDependency();
                    else if (scanner.id === "secret") runSecret();
                    else if (scanner.id === "zap") setZapModalOpen(true);
                  }}
                  title={!scanner.available ? "Não disponível para este projeto" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                    scanner.available
                      ? scanner.requiresConfirmation
                        ? "border-warning text-warning hover:bg-warning/10"
                        : "border-accent text-accent hover:bg-accent/10"
                      : "cursor-not-allowed border-border-subtle text-muted/50"
                  }`}
                >
                  <Play size={12} />
                  {runningId === scanner.id ? "Rodando..." : "Executar"}
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Histórico de scans ({reports.length})
          </p>
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            <RefreshCw size={11} /> Atualizar
          </button>
        </div>
        {reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhum scan rodado neste projeto ainda.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <SecurityReportCard
                key={report.id}
                report={report}
                onDelete={handleDeleteReport}
                onAnalyze={(finding) => setAnalyzing(finding)}
              />
            ))}
          </div>
        )}
      </div>

      {zapModalOpen && (
        <ZapScanModal
          projectId={project.id}
          onClose={() => setZapModalOpen(false)}
          onCompleted={() => {
            setZapModalOpen(false);
            refresh();
          }}
        />
      )}

      {analyzing && (
        <AnalyzeFindingModal
          project={project}
          finding={analyzing}
          onClose={() => setAnalyzing(null)}
          onStarted={onStartAiSession}
        />
      )}
    </div>
  );
}
