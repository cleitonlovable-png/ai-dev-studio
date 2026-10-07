import { History } from "lucide-react";
import type { Project } from "@/types/project";
import { useSessions } from "@/hooks/useSessions";
import { Card } from "@/components/common/Card";

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "em andamento";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}min`;
}

interface SessionsTabProps {
  project: Project;
}

export function SessionsTab({ project }: SessionsTabProps) {
  const { sessions, loading } = useSessions(project.id);

  return (
    <Card title={`Histórico de Sessões (${sessions.length})`}>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Carregando sessões...</p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <History size={22} className="text-muted" />
          <p className="text-sm text-muted">Nenhuma sessão registrada ainda.</p>
          <p className="text-xs text-muted/70">
            Clique em "Iniciar" em um assistente de IA para começar a registrar o histórico.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-lg border border-border-subtle bg-base-800 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {PROVIDER_LABEL[session.provider] ?? session.provider}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      session.status === "running" ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
                    }`}
                  >
                    {session.status === "running" ? "Em andamento" : "Finalizada"}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {formatDateTime(session.startedAt)} · {formatDuration(session.startedAt, session.endedAt)}
                </span>
              </div>
              {session.summary && <p className="mt-2 text-sm text-slate-300">{session.summary}</p>}
              {session.nextStep && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
                  <span className="shrink-0 font-medium text-accent">Próximo passo:</span>
                  {session.nextStep}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
