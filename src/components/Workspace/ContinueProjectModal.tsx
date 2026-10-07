import { useState } from "react";
import { Bot, Sparkles, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { AiProviderId, AiProviderStatus } from "@/types/ai";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { useMemories } from "@/hooks/useMemories";
import { useSessions } from "@/hooks/useSessions";
import { useTasks } from "@/hooks/useTasks";
import { useGitStatus } from "@/hooks/useGitStatus";
import { useAiSessionLauncher } from "@/hooks/useAiSessionLauncher";
import { SnapshotConfirmModal } from "./SnapshotConfirmModal";

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

const CATEGORY_LABEL: Record<string, string> = {
  decision: "Decisão",
  architecture: "Arquitetura",
  rule: "Regra",
  known_bug: "Bug conhecido",
  pending: "Pendência",
  context: "Contexto",
  important: "Importante",
};

interface ContinueProjectModalProps {
  project: Project;
  providers: AiProviderStatus[];
  onClose: () => void;
  onStarted: (session: ActiveAiSession) => void;
}

export function ContinueProjectModal({ project, providers, onClose, onStarted }: ContinueProjectModalProps) {
  const { memories } = useMemories(project.id);
  const { lastFinished } = useSessions(project.id);
  const { tasks } = useTasks(project.id);
  const { status: git } = useGitStatus(project.path);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId | null>(
    providers.find((p) => p.available)?.id ?? null
  );

  const { launch, startingId, error, pendingSnapshotConfirm, confirmWithSnapshot, confirmWithoutSnapshot, cancelPending } =
    useAiSessionLauncher(project, (session) => {
      onStarted(session);
      onClose();
    });

  const pendingTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <Sparkles size={16} className="text-accent" /> Continuar {project.name}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
          {lastFinished && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Última sessão</p>
              <div className="rounded-lg border border-border-subtle bg-base-850 p-3 text-sm">
                <p className="text-slate-300">{lastFinished.summary || "Sem resumo registrado."}</p>
                {lastFinished.nextStep && (
                  <p className="mt-1.5 text-xs text-muted">
                    <span className="font-medium text-accent">Próximo passo: </span>
                    {lastFinished.nextStep}
                  </p>
                )}
              </div>
            </div>
          )}

          {memories.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Memória do projeto ({memories.length})
              </p>
              <ul className="space-y-1">
                {memories.slice(0, 4).map((m) => (
                  <li key={m.id} className="text-xs text-slate-300">
                    <span className="text-muted">[{CATEGORY_LABEL[m.category] ?? m.category}]</span> {m.title}
                  </li>
                ))}
                {memories.length > 4 && (
                  <li className="text-xs text-muted">+ {memories.length - 4} outras (aba Memória)</li>
                )}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border-subtle bg-base-850 p-2.5">
              <p className="text-muted">Tarefas pendentes</p>
              <p className="mt-0.5 text-sm font-medium text-slate-200">{pendingTasks.length}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-base-850 p-2.5">
              <p className="text-muted">Git</p>
              <p className="mt-0.5 text-sm font-medium text-slate-200">
                {git?.isRepo ? `${git.branch ?? "?"} ${git.clean ? "(limpo)" : "(alterações)"}` : "Não é Git"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <p className="mb-2 text-xs font-medium text-muted">Continuar com qual IA?</p>
          <div className="flex gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                disabled={!p.available}
                onClick={() => setSelectedProvider(p.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs ${
                  !p.available
                    ? "cursor-not-allowed border-border-subtle text-muted/40"
                    : selectedProvider === p.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-subtle text-slate-300 hover:bg-base-800"
                }`}
              >
                <Bot size={13} /> {PROVIDER_LABEL[p.id] ?? p.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200">
              Cancelar
            </button>
            <button
              disabled={!selectedProvider || startingId !== null}
              onClick={() => {
                if (!selectedProvider) return;
                const provider = providers.find((p) => p.id === selectedProvider);
                launch(selectedProvider, PROVIDER_LABEL[selectedProvider] ?? selectedProvider, provider?.version ?? null);
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {startingId ? "Iniciando..." : "Continuar"}
            </button>
          </div>
        </div>
      </div>

      {pendingSnapshotConfirm && (
        <SnapshotConfirmModal
          label={pendingSnapshotConfirm.label}
          onCreateAndContinue={confirmWithSnapshot}
          onContinueWithout={confirmWithoutSnapshot}
          onCancel={cancelPending}
        />
      )}
    </div>
  );
}
