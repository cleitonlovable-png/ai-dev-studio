import {
  Bot,
  Camera,
  Clock,
  FolderOpen,
  GitBranch,
  Hammer,
  History,
  RotateCcw,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import type { Project } from "@/types/project";
import type { ProjectEvent, ProjectEventType } from "@/types/timelineEvent";
import { useTimeline } from "@/hooks/useTimeline";
import { Card } from "@/components/common/Card";

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

const EVENT_ICON: Record<ProjectEventType, React.ReactNode> = {
  PROJECT_OPENED: <FolderOpen size={14} className="text-accent" />,
  BACKUP_CREATED: <Camera size={14} className="text-success" />,
  BACKUP_RESTORED: <RotateCcw size={14} className="text-warning" />,
  AI_SESSION_STARTED: <Bot size={14} className="text-accent" />,
  AI_SESSION_FINISHED: <Bot size={14} className="text-muted" />,
  FILE_CHANGED: <History size={14} className="text-muted" />,
  GIT_STATUS_CHANGED: <GitBranch size={14} className="text-muted" />,
  BUILD_FINISHED: <Hammer size={14} className="text-slate-300" />,
  TEST_FINISHED: <TestTube2 size={14} className="text-slate-300" />,
  SECURITY_SCAN_FINISHED: <ShieldAlert size={14} className="text-warning" />,
  FINDING_CREATED: <ShieldAlert size={14} className="text-danger" />,
};

function describe(event: ProjectEvent): string {
  const payload = event.payload ? safeParse(event.payload) : null;

  switch (event.eventType) {
    case "PROJECT_OPENED":
      return "Projeto aberto";
    case "BACKUP_CREATED":
      return `Backup criado${payload?.reason ? ` (${payload.reason})` : ""}`;
    case "BACKUP_RESTORED":
      return "Backup restaurado";
    case "AI_SESSION_STARTED":
      return `Sessão iniciada${payload?.provider ? ` — ${PROVIDER_LABEL[String(payload.provider)] ?? payload.provider}` : ""}`;
    case "AI_SESSION_FINISHED":
      return "Sessão de IA finalizada";
    case "FILE_CHANGED":
      return `Arquivo alterado${payload?.path ? `: ${payload.path}` : ""}`;
    case "GIT_STATUS_CHANGED":
      return "Status do Git mudou";
    case "BUILD_FINISHED":
      return `Build ${payload?.status === "pass" ? "passou" : "falhou"}`;
    case "TEST_FINISHED":
      return `Testes ${payload?.status === "pass" ? "passaram" : "falharam"}`;
    case "SECURITY_SCAN_FINISHED":
      return `Scan de segurança concluído${
        typeof payload?.findings === "number" ? ` — ${payload.findings} finding(s)` : ""
      }`;
    case "FINDING_CREATED":
      return "Novo alerta de segurança";
    default:
      return event.eventType;
  }
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

interface TimelineTabProps {
  project: Project;
}

export function TimelineTab({ project }: TimelineTabProps) {
  const { events, loading } = useTimeline(project.id);

  return (
    <Card title="Timeline do Projeto">
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Carregando timeline...</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Clock size={22} className="text-muted" />
          <p className="text-sm text-muted">Nenhum evento registrado ainda.</p>
          <p className="max-w-xs text-xs text-muted/70">
            Toda vez que você abre o projeto, cria um backup, inicia uma IA, roda um build/teste
            ou termina um scan de segurança, aparece aqui.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-border-subtle pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-base-900">
                {EVENT_ICON[event.eventType] ?? <Clock size={14} className="text-muted" />}
              </span>
              <p className="text-sm text-slate-200">{describe(event)}</p>
              <p className="text-xs text-muted">{formatDateTime(event.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
