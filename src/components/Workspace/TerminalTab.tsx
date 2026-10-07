import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { ShellInfo, ShellKind } from "@/types/terminal";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { listShells } from "@/services/terminal";
import { RealTerminal } from "@/components/Terminal/RealTerminal";

export type { ActiveAiSession };

interface TerminalTabProps {
  project: Project;
  aiSession: ActiveAiSession | null;
  onCloseAiSession: () => void;
}

export function TerminalTab({ project, aiSession, onCloseAiSession }: TerminalTabProps) {
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const projectPath = project.path;
  const [selectedShell, setSelectedShell] = useState<ShellKind>("POWER_SHELL");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    listShells()
      .then((list) => {
        setShells(list);
        const firstAvailable = list.find((s) => s.available);
        if (firstAvailable) setSelectedShell(firstAvailable.kind);
      })
      .catch(() => setShells([]));
  }, []);

  if (!projectPath && !aiSession) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-muted">
          Este projeto ainda não tem uma pasta vinculada — o terminal fica disponível depois
          que você vincular uma pasta local na aba Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <span className="text-xs text-muted">
          {aiSession ? aiSession.label : `Terminal — ${project.name}`}
        </span>

        {aiSession ? (
          <button
            onClick={onCloseAiSession}
            className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-muted hover:text-slate-200"
          >
            <X size={12} /> Voltar ao terminal
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedShell}
              onChange={(e) => setSelectedShell(e.target.value as ShellKind)}
              className="rounded border border-border-subtle bg-base-850 px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {shells.map((s) => (
                <option key={s.kind} value={s.kind} disabled={!s.available}>
                  {s.label}
                  {!s.available ? " (indisponível)" : ""}
                </option>
              ))}
            </select>
            <button
              title="Reiniciar terminal"
              onClick={() => setResetKey((k) => k + 1)}
              className="text-muted hover:text-slate-200"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 bg-black">
        <RealTerminal
          source={
            aiSession
              ? { type: "attach", sessionId: aiSession.sessionId }
              : { type: "shell", projectPath: projectPath!, shell: selectedShell }
          }
          resetKey={resetKey}
          onExit={aiSession ? onCloseAiSession : undefined}
        />
      </div>
    </div>
  );
}
