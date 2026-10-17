import { CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import type { SecurityReport } from "@/types/securityReport";
import { buildPlainSummary } from "@/lib/securitySummary";

const LEVEL_STYLE = {
  ok: { box: "border-success/30 bg-success/10 text-success", icon: <CheckCircle2 size={18} /> },
  info: { box: "border-border-subtle bg-base-800 text-slate-300", icon: <Info size={18} /> },
  attention: { box: "border-warning/30 bg-warning/10 text-warning", icon: <ShieldAlert size={18} /> },
  urgent: { box: "border-danger/30 bg-danger/10 text-danger", icon: <ShieldAlert size={18} /> },
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-danger",
  high: "text-orange-400",
  medium: "text-warning",
  low: "text-success",
  info: "text-muted",
};

export function ReportSummaryModal({ report, onClose }: { report: SecurityReport; onClose: () => void }) {
  const summary = buildPlainSummary(report);
  const style = LEVEL_STYLE[summary.level];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Resumo técnico — em português claro</h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className={`flex items-start gap-2 rounded-lg border p-3 ${style.box}`}>
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <div>
              <p className="text-sm font-semibold">{summary.headline}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{summary.overview}</p>
            </div>
          </div>

          {summary.findings.map((f) => (
            <div key={f.id} className="rounded-lg border border-border-subtle bg-base-850 p-3">
              <p className="text-sm font-medium text-slate-100">
                <span className={`mr-2 text-xs font-semibold uppercase ${SEV_COLOR[f.severity] ?? "text-muted"}`}>
                  {f.severityLabel}
                </span>
                {f.title}
              </p>
              <dl className="mt-2 space-y-1.5 text-xs leading-relaxed">
                <div>
                  <dt className="inline font-semibold text-slate-300">O que é: </dt>
                  <dd className="inline text-slate-400">{f.what}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-300">Por que importa: </dt>
                  <dd className="inline text-slate-400">{f.why}</dd>
                </div>
                {f.todo && (
                  <div>
                    <dt className="inline font-semibold text-accent">O que fazer: </dt>
                    <dd className="inline text-slate-400">{f.todo}</dd>
                  </div>
                )}
                {f.where && (
                  <div>
                    <dt className="inline font-semibold text-slate-300">Onde: </dt>
                    <dd className="inline font-mono text-slate-500">{f.where}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}

          {summary.findings.length === 0 && (
            <p className="text-sm text-muted">Este relatório não trouxe nenhum detalhe para explicar.</p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
