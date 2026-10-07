import { CheckCircle2, XCircle, HelpCircle, AlertTriangle } from "lucide-react";
import type { Project } from "@/types/project";
import { Card } from "@/components/common/Card";
import { useQualityChecks } from "@/hooks/useQualityChecks";
import { useGitStatus } from "@/hooks/useGitStatus";
import { useBackups } from "@/hooks/useBackups";
import { useAiProviders } from "@/hooks/useAiProviders";
import { useSecurityScanners } from "@/hooks/useSecurityScanners";

type SignalStatus = "pass" | "warning" | "fail" | "not_checked";

interface Signal {
  label: string;
  status: SignalStatus;
  detail: string;
}

const STATUS_ICON: Record<SignalStatus, React.ReactNode> = {
  pass: <CheckCircle2 size={14} className="text-success" />,
  warning: <AlertTriangle size={14} className="text-warning" />,
  fail: <XCircle size={14} className="text-danger" />,
  not_checked: <HelpCircle size={14} className="text-muted" />,
};

const POINTS: Record<SignalStatus, number | null> = {
  pass: 2,
  warning: 1,
  fail: 0,
  not_checked: null, // exclui do calculo — "nao verificado" nao conta como sucesso nem falha
};

interface HealthCardProps {
  project: Project;
  onOpenQuality?: () => void;
}

export function HealthCard({ project, onOpenQuality }: HealthCardProps) {
  const { latestByType } = useQualityChecks(project.id);
  const { status: git } = useGitStatus(project.path);
  const { backups } = useBackups(project.id);
  const { providers } = useAiProviders();
  const { reports: securityReports } = useSecurityScanners(project.id);

  const buildCheck = latestByType("build");
  const testCheck = latestByType("test");

  const signals: Signal[] = [
    {
      label: "Build",
      status: buildCheck ? (buildCheck.status as SignalStatus) : "not_checked",
      detail: buildCheck ? buildCheck.command : "Nunca executado (aba Qualidade)",
    },
    {
      label: "Testes",
      status: testCheck ? (testCheck.status as SignalStatus) : "not_checked",
      detail: testCheck ? testCheck.command : "Nunca executado (aba Qualidade)",
    },
    {
      label: "Git",
      status: !git ? "not_checked" : !git.isRepo ? "not_checked" : git.clean ? "pass" : "warning",
      detail: !git?.isRepo ? "Não é repositório Git" : git.clean ? "Limpo" : "Alterações pendentes",
    },
    {
      label: "Backup",
      status: backups.length > 0 ? "pass" : "warning",
      detail: backups.length > 0 ? `${backups.length} backup(s)` : "Nenhum backup ainda",
    },
    {
      label: "IA",
      status: providers.some((p) => p.available) ? "pass" : "warning",
      detail: providers.some((p) => p.available) ? "Disponível" : "Nenhuma detectada",
    },
  ];

  const openFindings = securityReports.flatMap((r) => r.findings).filter((f) => f.status === "open");
  const criticalOrHigh = openFindings.filter((f) => f.severity === "critical" || f.severity === "high").length;
  signals.push({
    label: "Segurança",
    status: securityReports.length === 0 ? "not_checked" : criticalOrHigh > 0 ? "warning" : "pass",
    detail:
      securityReports.length === 0
        ? "Nenhum scan rodado (aba Segurança)"
        : criticalOrHigh > 0
          ? `${criticalOrHigh} alerta(s) crítico/alto`
          : "Sem alertas críticos",
  });

  const checked = signals.filter((s) => POINTS[s.status] !== null);
  const score =
    checked.length === 0
      ? null
      : Math.round((checked.reduce((sum, s) => sum + (POINTS[s.status] ?? 0), 0) / (checked.length * 2)) * 100);

  return (
    <Card
      title="Saúde do Projeto"
      action={
        onOpenQuality && (
          <button onClick={onOpenQuality} className="text-xs text-accent hover:text-accent-hover">
            Ver qualidade →
          </button>
        )
      }
    >
      <div className="space-y-2">
        {signals.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              {STATUS_ICON[s.status]} {s.label}
            </span>
            <span className="text-xs text-muted">{s.detail}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-xs text-muted">Score geral</span>
        <span className="text-lg font-semibold text-slate-100">
          {score === null ? "—" : `${score}/100`}
        </span>
      </div>
    </Card>
  );
}
