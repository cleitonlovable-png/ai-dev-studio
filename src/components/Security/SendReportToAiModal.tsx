import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { SecurityReport } from "@/types/securityReport";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { useAiProviders } from "@/hooks/useAiProviders";
import { useAiSessionLauncher } from "@/hooks/useAiSessionLauncher";
import { writeTerminal } from "@/services/terminal";
import { buildFixPrompt, matchProject } from "@/lib/securitySummary";

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

interface Props {
  report: SecurityReport;
  projects: Project[];
  onClose: () => void;
  onStarted: (project: Project, session: ActiveAiSession) => void;
}

export function SendReportToAiModal({ report, projects, onClose, onStarted }: Props) {
  const { providers } = useAiProviders();
  const candidates = projects.filter((p) => p.status !== "archived" && p.path);
  const matched = matchProject(report, projects);
  const [projectId, setProjectId] = useState<number | null>(
    matched?.path ? matched.id : candidates.length === 1 ? candidates[0].id : null
  );
  const [sending, setSending] = useState<string | null>(null);
  const project = candidates.find((p) => p.id === projectId) ?? null;
  const prompt = buildFixPrompt(report);

  const { launch, error } = useAiSessionLauncher(project, (session) => {
    if (project) onStarted(project, session);
    // Espera a ferramenta abrir, depois "cola" o texto inteiro de uma vez
    // (colagem entre marcadores, para as linhas não serem enviadas uma a uma)
    // e aperta Enter.
    setTimeout(() => {
      writeTerminal(session.sessionId, `\x1b[200~${prompt}\x1b[201~`).catch(() => {});
      setTimeout(() => writeTerminal(session.sessionId, "\r").catch(() => {}), 400);
    }, 4000);
    onClose();
  });

  async function handleSend(id: "codex" | "claude" | "ollama", version: string | null) {
    setSending(id);
    try {
      await launch(id, PROVIDER_LABEL[id], version);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <Send size={16} className="text-accent" /> Enviar relatório para correção
          </h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-muted">Projeto onde a IA vai corrigir</label>
        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-3 text-xs text-slate-300">
            Nenhum projeto com pasta vinculada. Abra o projeto, vincule a pasta do código e volte aqui.
          </p>
        ) : (
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="">Escolha o projeto...</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {matched && !matched.path && (
          <p className="mt-1 text-[11px] text-warning">
            O projeto "{matched.name}" combina com este relatório, mas ainda não tem pasta vinculada.
          </p>
        )}
        {!matched && candidates.length > 1 && (
          <p className="mt-1 text-[11px] text-muted">
            Não achei um projeto com o nome "{report.projectName}". Escolha qual é o certo.
          </p>
        )}

        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border-subtle bg-base-850 p-3 text-xs text-muted">
          <p className="mb-1 font-medium text-slate-300">O que será enviado para a IA:</p>
          <pre className="whitespace-pre-wrap font-sans">{prompt}</pre>
        </div>

        <div className="mt-4 space-y-2">
          {providers.map((p) => (
            <button
              key={p.id}
              disabled={!p.available || !project || sending !== null}
              onClick={() => handleSend(p.id, p.version)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                p.available && project
                  ? "border-accent text-accent hover:bg-accent/10"
                  : "cursor-not-allowed border-border-subtle text-muted/50"
              }`}
            >
              <Bot size={14} />
              {sending === p.id ? "Abrindo..." : `Corrigir com ${PROVIDER_LABEL[p.id] ?? p.label}`}
              {!p.available && " (não instalado)"}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
