import { useState } from "react";
import { Bot, Sparkles, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { SecurityFinding } from "@/types/securityReport";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { useAiProviders } from "@/hooks/useAiProviders";
import { useAiSessionLauncher } from "@/hooks/useAiSessionLauncher";
import { writeTerminal } from "@/services/terminal";

const PROVIDER_LABEL: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
  info: "Info",
};

/**
 * Monta o texto que vai para a IA. So inclui o que o finding ja tem —
 * titulo, severidade, descricao, recomendacao, arquivo/endpoint — nunca
 * conteudo adicional do projeto (sem .env, sem segredos, sem varredura
 * extra de arquivos). Se o finding veio do scanner de secrets, o trecho
 * ja chega mascarado (feito no momento da varredura), entao nao ha
 * segredo em texto puro sendo enviado aqui.
 */
function buildPrompt(finding: SecurityFinding): string {
  const lines = [
    "Encontrei um alerta de segurança e preciso da sua ajuda para corrigi-lo.",
    "",
    `Título: ${finding.title}`,
    `Severidade: ${SEVERITY_LABEL[finding.severity] ?? finding.severity}`,
  ];
  if (finding.category) lines.push(`Categoria: ${finding.category}`);
  if (finding.endpointOrFile) lines.push(`Local: ${finding.endpointOrFile}`);
  if (finding.description) lines.push(`Descrição: ${finding.description}`);
  if (finding.remediation) lines.push(`Recomendação inicial: ${finding.remediation}`);
  lines.push(
    "",
    "Pode explicar o problema, mostrar os arquivos envolvidos e propor uma correção? Não aplique nada automaticamente — quero revisar antes."
  );
  return lines.join("\n");
}

interface AnalyzeFindingModalProps {
  project: Project;
  finding: SecurityFinding;
  onClose: () => void;
  onStarted: (session: ActiveAiSession) => void;
}

export function AnalyzeFindingModal({ project, finding, onClose, onStarted }: AnalyzeFindingModalProps) {
  const { providers } = useAiProviders();
  const [sending, setSending] = useState<string | null>(null);

  const { launch, error } = useAiSessionLauncher(project, async (session) => {
    onStarted(session);
    // Da um tempo para a ferramenta abrir de verdade antes de "digitar"
    // o prompt — CLIs interativas levam um instante para iniciar.
    setTimeout(() => {
      writeTerminal(session.sessionId, buildPrompt(finding) + "\n").catch(() => {});
    }, 3500);
    onClose();
  });

  async function handleAnalyze(providerId: "codex" | "claude" | "ollama", version: string | null) {
    setSending(providerId);
    try {
      await launch(providerId, PROVIDER_LABEL[providerId], version);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <Sparkles size={16} className="text-accent" /> Analisar com IA
          </h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-300">{finding.title}</p>

        <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-border-subtle bg-base-850 p-3 text-xs text-muted">
          <p className="mb-1 font-medium text-slate-300">O que será enviado para a IA:</p>
          <pre className="whitespace-pre-wrap font-sans">{buildPrompt(finding)}</pre>
        </div>

        <div className="space-y-2">
          {providers.map((p) => (
            <button
              key={p.id}
              disabled={!p.available || sending !== null}
              onClick={() => handleAnalyze(p.id, p.version)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                p.available
                  ? "border-accent text-accent hover:bg-accent/10"
                  : "cursor-not-allowed border-border-subtle text-muted/50"
              }`}
            >
              <Bot size={14} />
              {sending === p.id ? "Abrindo..." : `Analisar com ${PROVIDER_LABEL[p.id] ?? p.label}`}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
