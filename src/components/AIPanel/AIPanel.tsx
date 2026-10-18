import { useState } from "react";
import {
  Bot,
  Code2,
  Cpu,
  FileCode,
  Folder,
  GitCommit,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import type { Project } from "@/types/project";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { openInFileExplorer, openInVsCode } from "@/services/shell";
import { createBackupNow } from "@/services/backups";
import { useAiProviders } from "@/hooks/useAiProviders";
import { useAiSessionLauncher } from "@/hooks/useAiSessionLauncher";
import { SnapshotConfirmModal } from "@/components/Workspace/SnapshotConfirmModal";

interface AIPanelProps {
  project: Project | null;
  onOpenTerminal?: () => void;
  onStartAiSession: (session: ActiveAiSession) => void;
}

export function AIPanel({ project, onOpenTerminal, onStartAiSession }: AIPanelProps) {
  const { providers, loading, refresh } = useAiProviders();
  const {
    launch,
    startingId,
    error: startError,
    pendingSnapshotConfirm,
    confirmWithSnapshot,
    confirmWithoutSnapshot,
    cancelPending,
  } = useAiSessionLauncher(project, onStartAiSession);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border-subtle bg-base-900">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold text-slate-100">Assistentes de IA</h2>
        <button
          onClick={() => refresh()}
          title="Verificar novamente"
          className="text-muted hover:text-slate-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto px-3 py-2">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-start gap-3 rounded-card border border-border-subtle bg-base-850 p-3"
          >
            <div className="rounded-lg bg-base-700 p-2">
              <Bot size={16} className="text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{provider.label}</p>
              <p className="text-xs text-muted">
                {provider.version ?? (provider.available ? "Detectado" : "Não encontrado no PATH")}
              </p>
              {provider.models && provider.models.length > 0 && (
                <p className="mt-0.5 truncate text-[11px] text-muted" title={provider.models.join(", ")}>
                  {provider.models.length} modelo(s): {provider.models.slice(0, 2).join(", ")}
                  {provider.models.length > 2 ? "…" : ""}
                </p>
              )}
              <p className={`mt-1 text-[11px] font-medium ${provider.available ? "text-success" : "text-muted"}`}>
                {provider.available ? "Conectado" : "Não verificado"}
              </p>
            </div>
            <button
              disabled={!provider.available || !project?.path || startingId !== null}
              title={
                !project
                  ? "Selecione um projeto"
                  : !project.path
                    ? "Vincule uma pasta ao projeto primeiro (aba Configurações)"
                    : !provider.available
                      ? `${provider.label} não encontrado no PATH`
                      : undefined
              }
              onClick={() => launch(provider.id, provider.label, provider.version)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                provider.available && project?.path
                  ? "border-accent text-accent hover:bg-accent/10"
                  : "cursor-not-allowed border-border-subtle text-muted/50"
              }`}
            >
              {startingId === provider.id ? "Iniciando..." : "Iniciar"}
            </button>
          </div>
        ))}

        {startError && (
          <p className="rounded bg-danger/10 px-2 py-1.5 text-[11px] leading-relaxed text-danger">{startError}</p>
        )}

        <button className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border-subtle py-3 text-xs text-muted hover:border-accent/50 hover:text-accent">
          <Plus size={14} />
          Conectar outros providers
        </button>

        <QuickActions project={project} onOpenTerminal={onOpenTerminal} />
      </div>

      <div className="mt-auto space-y-2 border-t border-border-subtle p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Sparkles size={12} /> Dica do dia
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {providers.some((p) => p.available)
            ? "Ao encerrar uma sessão de IA, registre um resumo — isso alimenta a Memória e o 'Continuar Projeto'."
            : "Nenhuma IA foi encontrada no PATH ainda. Instale o Codex, Claude Code ou Ollama e clique no ícone de atualizar."}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border-subtle px-4 py-3 text-[11px] text-muted">
        <Cpu size={12} />
        CSC Studio
      </div>

      {pendingSnapshotConfirm && (
        <SnapshotConfirmModal
          label={pendingSnapshotConfirm.label}
          onCreateAndContinue={confirmWithSnapshot}
          onContinueWithout={confirmWithoutSnapshot}
          onCancel={cancelPending}
        />
      )}
    </aside>
  );
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick?: () => Promise<void>;
  disabledReason?: string;
}

function QuickActions({ project, onOpenTerminal }: { project: Project | null; onOpenTerminal?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [runningLabel, setRunningLabel] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setError(null);
    setRunningLabel(label);
    try {
      await action();
    } catch (err) {
      setError(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningLabel(null);
    }
  }

  const actions: QuickAction[] = [
    {
      label: "Abrir no VS Code",
      icon: <Code2 size={14} />,
      onClick: project?.path ? () => openInVsCode(project.path!) : undefined,
      disabledReason: !project ? "Selecione um projeto" : !project.path ? "Vincule uma pasta primeiro" : undefined,
    },
    {
      label: "Abrir no Explorer",
      icon: <Folder size={14} />,
      onClick: project?.path ? () => openInFileExplorer(project.path!) : undefined,
      disabledReason: !project ? "Selecione um projeto" : !project.path ? "Vincule uma pasta primeiro" : undefined,
    },
    {
      label: "Abrir Terminal",
      icon: <TerminalSquare size={14} />,
      onClick: onOpenTerminal && project?.path ? () => Promise.resolve(onOpenTerminal()) : undefined,
      disabledReason: !project ? "Selecione um projeto" : !project.path ? "Vincule uma pasta primeiro" : undefined,
    },
    {
      label: "Fazer commit",
      icon: <GitCommit size={14} />,
      disabledReason: "Operações de escrita no Git chegam com a camada de segurança (Fase 8)",
    },
    {
      label: "Executar script",
      icon: <Play size={14} />,
      disabledReason: "Quality Center — Fase 7",
    },
    {
      label: "Criar backup",
      icon: <Save size={14} />,
      onClick: project ? async () => { await createBackupNow(project.id, "manual"); } : undefined,
      disabledReason: !project ? "Selecione um projeto" : undefined,
    },
    {
      label: "Gerar documentação",
      icon: <FileCode size={14} />,
      disabledReason: "Depende de uma sessão de IA em andamento",
    },
  ];

  return (
    <div className="rounded-card border border-border-subtle bg-base-850 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-200">Ações Rápidas</p>
      <div className="space-y-0.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick ? () => run(action.label, action.onClick!) : undefined}
            disabled={!action.onClick || runningLabel !== null}
            title={action.disabledReason}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs ${
              action.onClick
                ? "text-slate-300 hover:bg-base-700 hover:text-slate-100"
                : "cursor-not-allowed text-muted/50"
            }`}
          >
            {action.icon}
            {runningLabel === action.label ? "Abrindo..." : action.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 rounded bg-danger/10 px-2 py-1.5 text-[11px] leading-relaxed text-danger">{error}</p>
      )}
    </div>
  );
}
