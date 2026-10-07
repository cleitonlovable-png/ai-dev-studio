import { useState } from "react";
import { X } from "lucide-react";

interface SessionFinishModalProps {
  providerLabel: string;
  onSave: (summary: string, nextStep: string) => Promise<void>;
  onDiscard: () => Promise<void>;
}

export function SessionFinishModal({ providerLabel, onSave, onDiscard }: SessionFinishModalProps) {
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(summary.trim(), nextStep.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Sessão com {providerLabel} encerrada</h2>
          <button
            onClick={onDiscard}
            title="Descartar sem registrar"
            className="text-muted hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Registrar o que foi feito ajuda a continuar de onde parou depois, com qualquer IA.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">O que foi feito nessa sessão?</label>
            <textarea
              autoFocus
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Ex: Implementamos a página de perfil e corrigimos a autenticação."
              className="w-full resize-none rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Próximo passo sugerido (opcional)</label>
            <input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Ex: Implementar recuperação de senha"
              className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200"
            >
              Descartar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Salvar sessão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
