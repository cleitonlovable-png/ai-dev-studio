import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Project } from "@/types/project";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { Card } from "@/components/common/Card";
import { useTasks } from "@/hooks/useTasks";
import { useSessions } from "@/hooks/useSessions";
import { useAiProviders } from "@/hooks/useAiProviders";
import { TaskItem } from "./TaskItem";
import { ContinueProjectModal } from "./ContinueProjectModal";
import { HealthCard } from "./HealthCard";

interface OverviewTabProps {
  project: Project;
  onOpenTasks?: () => void;
  onOpenSessions?: () => void;
  onOpenQuality?: () => void;
  onStartAiSession: (session: ActiveAiSession) => void;
}

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function OverviewTab({ project, onOpenTasks, onOpenSessions, onOpenQuality, onStartAiSession }: OverviewTabProps) {
  const { tasks, toggleDone } = useTasks(project.id);
  const { lastFinished } = useSessions(project.id);
  const { providers } = useAiProviders();
  const [continueOpen, setContinueOpen] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== "done").slice(0, 5);
  const hasAvailableProvider = providers.some((p) => p.available);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        title="Última Sessão com IA"
        action={
          onOpenSessions && (
            <button onClick={onOpenSessions} className="text-xs text-accent hover:text-accent-hover">
              Ver histórico →
            </button>
          )
        }
      >
        {lastFinished ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">
                {PROVIDER_LABEL[lastFinished.provider] ?? lastFinished.provider}
              </span>
              <span className="text-muted">
                {lastFinished.endedAt ? timeAgo(lastFinished.endedAt) : ""}
              </span>
            </div>
            <p className="text-sm text-slate-300">{lastFinished.summary || "Sem resumo registrado."}</p>
            {lastFinished.nextStep && (
              <p className="text-xs text-muted">
                <span className="font-medium text-accent">Próximo passo: </span>
                {lastFinished.nextStep}
              </p>
            )}
            <button
              disabled={!hasAvailableProvider}
              onClick={() => setContinueOpen(true)}
              title={!hasAvailableProvider ? "Nenhuma IA disponível no PATH" : undefined}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} /> Continuar Projeto
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-sm text-muted">Ainda nenhuma sessão registrada para este projeto.</p>
            <button
              disabled={!hasAvailableProvider}
              onClick={() => setContinueOpen(true)}
              title={!hasAvailableProvider ? "Nenhuma IA disponível no PATH" : undefined}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} /> Começar com uma IA
            </button>
          </div>
        )}
      </Card>

      <Card
        title="Tarefas Recentes"
        action={
          onOpenTasks && (
            <button onClick={onOpenTasks} className="text-xs text-accent hover:text-accent-hover">
              Ver todas →
            </button>
          )
        }
      >
        {pendingTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Nenhuma tarefa pendente.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleDone} compact />
            ))}
          </div>
        )}
      </Card>

      <Card title="Descrição" className="lg:col-span-2">
        <p className="text-sm leading-relaxed text-slate-300">
          {project.description || "Nenhuma descrição cadastrada para este projeto ainda."}
        </p>
      </Card>

      <HealthCard project={project} onOpenQuality={onOpenQuality} />

      {continueOpen && (
        <ContinueProjectModal
          project={project}
          providers={providers}
          onClose={() => setContinueOpen(false)}
          onStarted={onStartAiSession}
        />
      )}
    </div>
  );
}
