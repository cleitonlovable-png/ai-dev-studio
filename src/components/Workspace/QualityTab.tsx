import { Play, Wrench } from "lucide-react";
import type { Project } from "@/types/project";
import type { CheckType, ProjectCheck } from "@/types/qualityCheck";
import { useQualityChecks } from "@/hooks/useQualityChecks";
import { Card } from "@/components/common/Card";

const TYPE_LABEL: Record<CheckType, string> = {
  build: "Build",
  lint: "Lint",
  test: "Testes",
};

const STATUS_STYLE: Record<ProjectCheck["status"], string> = {
  pass: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  fail: "bg-danger/15 text-danger",
  running: "bg-accent/15 text-accent",
};

const STATUS_LABEL: Record<ProjectCheck["status"], string> = {
  pass: "Passou",
  warning: "Atenção",
  fail: "Falhou",
  running: "Rodando...",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

interface QualityTabProps {
  project: Project;
}

export function QualityTab({ project }: QualityTabProps) {
  const { detected, history, loading, runningType, error, run, latestByType } = useQualityChecks(project.id);

  return (
    <div className="space-y-4">
      <Card title="Verificações Disponíveis">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Detectando scripts...</p>
        ) : detected.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Wrench size={22} className="text-muted" />
            <p className="text-sm text-muted">Nenhum script de build/lint/teste detectado.</p>
            <p className="text-xs text-muted/70">
              Procuramos por scripts "build"/"lint"/"test" no package.json, Cargo.toml (Rust) e
              indícios de testes Python (pytest).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {detected.map((check) => {
              const latest = latestByType(check.checkType);
              return (
                <div
                  key={`${check.checkType}-${check.command}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-base-800 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100">{TYPE_LABEL[check.checkType]}</p>
                      {latest && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[latest.status]}`}>
                          {STATUS_LABEL[latest.status]}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted">{check.command}</p>
                  </div>
                  <button
                    onClick={() => run(check)}
                    disabled={runningType !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={12} />
                    {runningType === check.checkType ? "Rodando..." : "Executar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      </Card>

      <Card title={`Histórico (${history.length})`}>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma execução ainda.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {history.map((h) => (
              <div key={h.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">{TYPE_LABEL[h.type]}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[h.status]}`}>
                      {STATUS_LABEL[h.status]}
                    </span>
                    {h.exitCode !== null && (
                      <span className="text-[10px] text-muted">exit {h.exitCode}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">{formatDateTime(h.startedAt)}</span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted">{h.command}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
